import { createHash } from 'node:crypto'
import {
  APP_CONFIG_NAMES,
  isKeptText,
  LANGUAGE_TAG,
  parseAppConfig,
  TEXT_KEY,
  TEXT_SCOPES,
  type AppConfigName,
  type AppConfigResponse,
  type StoredAppConfig,
  type TextChange,
  type TextScope,
} from '@kuhedu/contracts'
import { and, asc, eq, sql } from 'drizzle-orm'
import type { Db, DbOrTx } from '../../db/client.ts'
import { appConfig, auditLog, contentHistory, textOverrides } from '../../db/schema/index.ts'
import { HttpError } from '../../plugins/errors.ts'

/**
 * What an admin manages besides the lessons. Three settings objects are kept whole in
 * `app_config`, each read with the rules its screens are built on (`parseAppConfig`) before it
 * is stored; the reworded texts of two more (screen texts, the course's wording) are kept one
 * text at a time in `text_overrides`. A save keeps what it replaced (`content_history`) and says
 * who made it (`audit_log`).
 */

/** Content as one text, whatever order its keys are in (the database keeps its own order). */
const asText = (value: unknown): string =>
  JSON.stringify(value, (_key, held: unknown) =>
    typeof held === 'object' && held !== null && !Array.isArray(held)
      ? Object.fromEntries(Object.entries(held).sort(([a], [b]) => (a < b ? -1 : 1)))
      : held,
  )

type Texts = Record<TextScope, Record<string, Record<string, string>>>

async function readTexts(db: DbOrTx): Promise<Texts> {
  const rows = await db
    .select({
      scope: textOverrides.scope,
      language: textOverrides.language,
      key: textOverrides.key,
      text: textOverrides.text,
    })
    .from(textOverrides)
    .orderBy(asc(textOverrides.scope), asc(textOverrides.language), asc(textOverrides.key))

  const texts = Object.fromEntries(TEXT_SCOPES.map((scope) => [scope, {}])) as Texts
  for (const { scope, language, key, text } of rows) {
    ;(texts[scope][language] ??= {})[key] = text
  }
  return texts
}

async function readSettings(db: DbOrTx) {
  return db
    .select({ name: appConfig.name, value: appConfig.value, version: appConfig.version })
    .from(appConfig)
    .orderBy(asc(appConfig.name))
}

/** Everything, for anyone: with something that changes when anything of it does. */
export async function readPublic(db: DbOrTx): Promise<{ body: AppConfigResponse; etag: string }> {
  const [rows, texts] = await Promise.all([readSettings(db), readTexts(db)])
  const settings = Object.fromEntries(
    APP_CONFIG_NAMES.map((name) => [name, null as unknown]),
  ) as Record<AppConfigName, unknown>
  for (const row of rows) settings[row.name] = row.value

  const body = { settings, texts }
  // What is sent, as a stamp: a browser that has it asks with it, and is told it still stands.
  const stamp = createHash('sha256').update(asText(body)).digest('base64url').slice(0, 22)
  return { body, etag: `"app-config-${stamp}"` }
}

/** Everything kept, with each object's version, for the editors to open with. */
export async function readStored(db: DbOrTx): Promise<StoredAppConfig> {
  const [settings, texts] = await Promise.all([readSettings(db), readTexts(db)])
  return { settings, texts }
}

const stale = () =>
  new HttpError(409, 'conflict', 'This was changed by someone else since it was opened')

type Setting = {
  name: AppConfigName
  /** Who is saving. `null` for a command run on the server itself. */
  by: string | null
  /** The version this was written from; `0` when there was none. Left out by a command. */
  basedOn?: number
}

/**
 * Keep a settings object. Answers with its new version, or with the one it has when what was
 * sent is what is already kept.
 */
export async function saveSetting(db: Db, setting: Setting & { value: unknown }): Promise<number> {
  const { name, by, basedOn } = setting
  // Stored exactly as the screens will read it: every field there, each bad one at its default.
  const value = parseAppConfig(name, setting.value)

  return db.transaction(async (tx) => {
    const [kept] = await tx
      .select({ value: appConfig.value, version: appConfig.version })
      .from(appConfig)
      .where(eq(appConfig.name, name))
      .for('update')
    if (basedOn !== undefined && basedOn !== (kept?.version ?? 0)) throw stale()
    if (kept && asText(kept.value) === asText(value)) return kept.version

    const version = (kept?.version ?? 0) + 1
    if (kept) {
      await tx.insert(contentHistory).values({
        source: 'app_config',
        ref: name,
        value: kept.value,
        version: kept.version,
        replacedBy: by,
      })
      await tx
        .update(appConfig)
        .set({ value, version, updatedBy: by, updatedAt: new Date() })
        .where(eq(appConfig.name, name))
    } else {
      await tx.insert(appConfig).values({ name, value, version, updatedBy: by })
    }
    await tx.insert(auditLog).values({
      actorUserId: by,
      action: 'app_config.save',
      target: name,
      detail: { version },
    })
    return version
  })
}

/** Stop keeping a settings object: the app then shows what it has built in. */
export async function removeSetting(db: Db, { name, by, basedOn }: Setting): Promise<void> {
  await db.transaction(async (tx) => {
    const [kept] = await tx
      .select({ value: appConfig.value, version: appConfig.version })
      .from(appConfig)
      .where(eq(appConfig.name, name))
      .for('update')
    // Gone already: what was asked for is so.
    if (!kept) return
    if (basedOn !== undefined && basedOn !== kept.version) throw stale()

    await tx.insert(contentHistory).values({
      source: 'app_config',
      ref: name,
      value: kept.value,
      version: kept.version,
      replacedBy: by,
    })
    await tx.delete(appConfig).where(eq(appConfig.name, name))
    await tx.insert(auditLog).values({
      actorUserId: by,
      action: 'app_config.remove',
      target: name,
      detail: { version: kept.version },
    })
  })
}

const invalid = (message: string) => new HttpError(400, 'validation_failed', message)

/** How a text is named in the history: `screen/bn/home.title`. */
const textRef = (scope: TextScope, language: string, key: string) => `${scope}/${language}/${key}`

/** Rows are written and removed this many at a time, to stay well inside a query's limits. */
const CHUNK = 500

const chunks = <Item>(items: Item[]) =>
  Array.from({ length: Math.ceil(items.length / CHUNK) }, (_, index) =>
    items.slice(index * CHUNK, (index + 1) * CHUNK),
  )

/**
 * Change texts of one scope, all or none. Each change says what the text was when the editor
 * opened: a text another admin changed since is not written over (409), unless it is already
 * what this save wants, which is how a save sent twice changes nothing. Answers with how many
 * texts were written and removed.
 */
export async function changeTexts(
  db: Db,
  { scope, changes, by }: { scope: TextScope; changes: TextChange[]; by: string | null },
): Promise<{ saved: number; removed: number }> {
  const seen = new Set<string>()
  for (const { language, key, to } of changes) {
    const id = `${language}\u0000${key}`
    if (seen.has(id)) throw invalid(`${language}/${key} is changed twice`)
    seen.add(id)
    if (!LANGUAGE_TAG.test(language) || !TEXT_KEY.test(key)) {
      throw invalid(`${language}/${key} is not a text`)
    }
    // A text that is to be kept is kept as the screens read it: trimmed, never empty.
    if (to !== null && !isKeptText(language, key, to)) {
      throw invalid(`${language}/${key} cannot be kept as written`)
    }
  }

  return db.transaction(async (tx) => {
    // The whole scope, locked: a few thousand short rows at most, and one read beats one each.
    const rows = await tx
      .select({
        language: textOverrides.language,
        key: textOverrides.key,
        text: textOverrides.text,
      })
      .from(textOverrides)
      .where(eq(textOverrides.scope, scope))
      .for('update')
    const kept = new Map(rows.map((row) => [`${row.language}\u0000${row.key}`, row.text]))

    const writes: { language: string; key: string; text: string }[] = []
    const removals: { language: string; key: string; text: string }[] = []
    for (const { language, key, from, to } of changes) {
      const now = kept.get(`${language}\u0000${key}`) ?? null
      if (now === to) continue
      if (now !== from) throw stale()
      if (to === null) removals.push({ language, key, text: now ?? '' })
      else writes.push({ language, key, text: to })
    }
    if (writes.length === 0 && removals.length === 0) return { saved: 0, removed: 0 }

    const replaced = [
      ...writes.filter(({ language, key }) => kept.has(`${language}\u0000${key}`)),
      ...removals,
    ]
    for (const part of chunks(replaced)) {
      await tx.insert(contentHistory).values(
        part.map(({ language, key }) => ({
          source: 'text_override' as const,
          ref: textRef(scope, language, key),
          value: kept.get(`${language}\u0000${key}`),
          replacedBy: by,
        })),
      )
    }

    for (const part of chunks(writes)) {
      await tx
        .insert(textOverrides)
        .values(part.map((write) => ({ scope, ...write, updatedBy: by })))
        .onConflictDoUpdate({
          target: [textOverrides.scope, textOverrides.language, textOverrides.key],
          set: {
            text: sql`excluded.text`,
            updatedBy: sql`excluded.updated_by`,
            updatedAt: new Date(),
          },
        })
    }
    for (const part of chunks(removals)) {
      await tx.delete(textOverrides).where(
        and(
          eq(textOverrides.scope, scope),
          sql`(${textOverrides.language}, ${textOverrides.key}) in (${sql.join(
            part.map(({ language, key }) => sql`(${language}, ${key})`),
            sql`, `,
          )})`,
        ),
      )
    }

    const done = { saved: writes.length, removed: removals.length }
    await tx.insert(auditLog).values({
      actorUserId: by,
      action: 'text_overrides.save',
      target: scope,
      detail: done,
    })
    return done
  })
}
