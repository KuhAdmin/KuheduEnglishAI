import { createHash } from 'node:crypto'
import {
  parseWeekContent,
  WEEK_CONTENT_KINDS,
  type StoredLessons,
  type WeekContentKind,
} from '@kuhedu/contracts'
import { and, asc, eq } from 'drizzle-orm'
import type { Db, DbOrTx } from '../../db/client.ts'
import { auditLog, contentHistory, weekContent } from '../../db/schema/index.ts'
import { HttpError } from '../../plugins/errors.ts'

/**
 * A week's lesson content in the database: one row per kind and week. What is kept has been
 * read with the rules the app's screens are built on (`parseWeekContent`), so a row is always
 * something a screen can show. A save keeps what the row held before it (`content_history`) and
 * says who made it (`audit_log`).
 */

/**
 * Content as one text, whatever order its keys are in. The database gives an object's keys
 * back in an order of its own, so two pieces that are the same do not read the same letter for
 * letter.
 */
const asText = (value: unknown): string =>
  JSON.stringify(value, (_key, held: unknown) =>
    typeof held === 'object' && held !== null && !Array.isArray(held)
      ? Object.fromEntries(Object.entries(held).sort(([a], [b]) => (a < b ? -1 : 1)))
      : held,
  )

/** How a piece is named in the history and the audit log: `dialogue/12`. */
const nameOf = (kind: WeekContentKind, week: number) => `${kind}/${week}`

/** One week, every kind: `null` where nothing is kept. With something that changes when it does. */
export async function readWeek(db: DbOrTx, week: number) {
  const rows = await db
    .select({
      kind: weekContent.kind,
      value: weekContent.value,
      version: weekContent.version,
      updatedAt: weekContent.updatedAt,
    })
    .from(weekContent)
    .where(eq(weekContent.week, week))
    .orderBy(asc(weekContent.kind))

  const content = Object.fromEntries(
    WEEK_CONTENT_KINDS.map((kind) => [kind, null as unknown]),
  ) as Record<WeekContentKind, unknown>
  for (const row of rows) content[row.kind] = row.value

  // The same for as long as nothing of the week is saved or removed: a browser that has the
  // answer asks with it, and is told that it still stands.
  const stamp = createHash('sha256')
    .update(JSON.stringify(rows.map((row) => [row.kind, row.version, row.updatedAt.getTime()])))
    .digest('base64url')
    .slice(0, 22)
  return { content, etag: `"week-${week}-${stamp}"` }
}

/** Everything kept, for the editors to open with. */
export async function readAll(db: DbOrTx): Promise<StoredLessons> {
  const pieces = await db
    .select({
      week: weekContent.week,
      kind: weekContent.kind,
      value: weekContent.value,
      version: weekContent.version,
    })
    .from(weekContent)
    .orderBy(asc(weekContent.week), asc(weekContent.kind))
  return { pieces }
}

type Piece = {
  week: number
  kind: WeekContentKind
  /** Who is saving. `null` for a command run on the server itself. */
  by: string | null
  /**
   * The version this was written from; `0` when there was none. A piece saved by someone else
   * since is not written over. Left out by a command, which says what the content is to be.
   */
  basedOn?: number
}

const stale = () =>
  new HttpError(409, 'conflict', 'This was changed by someone else since it was opened')

/**
 * Keep a piece of a week's content. Answers with its new version, or with the one it has when
 * what was sent is what is already kept.
 */
export async function savePiece(db: Db, piece: Piece & { value: unknown }): Promise<number> {
  const { week, kind, by, basedOn } = piece
  // What is stored is exactly what screens will read. A value with nothing usable in it (a
  // conversation without a line) is not content: removing the piece is the way to have none.
  const value = parseWeekContent(kind, piece.value)
  if (value === null) {
    throw new HttpError(400, 'validation_failed', `Nothing in this ${kind} can be kept`)
  }

  return db.transaction(async (tx) => {
    const [kept] = await tx
      .select({ value: weekContent.value, version: weekContent.version })
      .from(weekContent)
      .where(and(eq(weekContent.kind, kind), eq(weekContent.week, week)))
      .for('update')
    if (basedOn !== undefined && basedOn !== (kept?.version ?? 0)) throw stale()
    if (kept && asText(kept.value) === asText(value)) return kept.version

    const version = (kept?.version ?? 0) + 1
    if (kept) {
      await tx.insert(contentHistory).values({
        source: 'week_content',
        ref: nameOf(kind, week),
        value: kept.value,
        version: kept.version,
        replacedBy: by,
      })
      await tx
        .update(weekContent)
        .set({ value, version, updatedBy: by, updatedAt: new Date() })
        .where(and(eq(weekContent.kind, kind), eq(weekContent.week, week)))
    } else {
      await tx.insert(weekContent).values({ kind, week, value, version, updatedBy: by })
    }
    await tx.insert(auditLog).values({
      actorUserId: by,
      action: 'week_content.save',
      target: nameOf(kind, week),
      detail: { version },
    })
    return version
  })
}

/** Stop keeping a piece: the app then shows what it has built in for the week, or nothing. */
export async function removePiece(db: Db, { week, kind, by, basedOn }: Piece): Promise<void> {
  await db.transaction(async (tx) => {
    const [kept] = await tx
      .select({ value: weekContent.value, version: weekContent.version })
      .from(weekContent)
      .where(and(eq(weekContent.kind, kind), eq(weekContent.week, week)))
      .for('update')
    // Gone already: what was asked for is so.
    if (!kept) return
    if (basedOn !== undefined && basedOn !== kept.version) throw stale()

    await tx.insert(contentHistory).values({
      source: 'week_content',
      ref: nameOf(kind, week),
      value: kept.value,
      version: kept.version,
      replacedBy: by,
    })
    await tx.delete(weekContent).where(and(eq(weekContent.kind, kind), eq(weekContent.week, week)))
    await tx.insert(auditLog).values({
      actorUserId: by,
      action: 'week_content.remove',
      target: nameOf(kind, week),
      detail: { version: kept.version },
    })
  })
}
