import { readFileSync } from 'node:fs'
import {
  isCourseWeek,
  isRecord,
  parseWeekContent,
  WEEK_CONTENT_KINDS,
  type WeekContentKind,
} from '@kuhedu/contracts'
import { connectDatabase } from '../db/client.ts'
import { readEnv } from '../env.ts'
import { removePiece, savePiece } from '../modules/content/lessons.ts'

/**
 * Put a week's lesson content into the database from a file:
 * `npm run content:import -w @kuhedu/server -- content/week-01.json [more files]`.
 *
 * A file is `{ "week": 2, "content": { "dialogue": { … }, "vocabulary": { … }, … } }`, each piece
 * as the app's editors would save it (`WEEK_CONTENT_KINDS` names them). A kind left out of the
 * file is left as it is in the database; one given as `null` is removed from it.
 *
 * Every piece is read with the rules the screens are built on before anything is written. One
 * with nothing usable in it stops the whole file, and one that lost something on the way in
 * (a text too long, a turn without its reply) is named, because what is dropped is not shown.
 */
const files = process.argv.slice(2)
if (files.length === 0) {
  console.error('Usage: npm run content:import -w @kuhedu/server -- <week.json> [more files]')
  process.exit(1)
}

type Piece = { week: number; kind: WeekContentKind; value: unknown }

const pieces: Piece[] = []
const problems: string[] = []
const notes: string[] = []

/** As it is compared: whatever order its keys were written in, which says nothing. */
const plain = (value: unknown): string =>
  JSON.stringify(value, (_key, held: unknown) =>
    isRecord(held)
      ? Object.fromEntries(Object.entries(held).sort(([a], [b]) => (a < b ? -1 : 1)))
      : held,
  )

for (const file of files) {
  let given: unknown
  try {
    given = JSON.parse(readFileSync(file, 'utf8'))
  } catch (error) {
    problems.push(`${file}: cannot be read as JSON (${(error as Error).message})`)
    continue
  }
  if (!isRecord(given) || !isCourseWeek(given.week) || !isRecord(given.content)) {
    problems.push(`${file}: must be { "week": 1 to 50, "content": { … } }`)
    continue
  }
  const { week, content } = given

  for (const kind of Object.keys(content)) {
    if (!(WEEK_CONTENT_KINDS as readonly string[]).includes(kind)) {
      problems.push(`${file}: "${kind}" is no kind of content (${WEEK_CONTENT_KINDS.join(', ')})`)
    }
  }
  for (const kind of WEEK_CONTENT_KINDS) {
    if (!Object.hasOwn(content, kind)) continue
    const written = content[kind]
    if (written === null) {
      pieces.push({ week, kind, value: null })
      continue
    }
    const value = parseWeekContent(kind, written)
    if (value === null) {
      problems.push(`${file}: nothing in "${kind}" can be kept`)
      continue
    }
    if (plain(value) !== plain(written)) {
      notes.push(
        `${file}: "${kind}" is not kept exactly as written (something was tidied or dropped)`,
      )
    }
    pieces.push({ week, kind, value })
  }
}

if (problems.length > 0) {
  console.error(problems.join('\n'))
  console.error('Nothing was written.')
  process.exit(1)
}

const database = connectDatabase(readEnv())
try {
  for (const { week, kind, value } of pieces) {
    if (value === null) {
      await removePiece(database.db, { week, kind, by: null })
      console.log(`Week ${week} ${kind}: removed`)
    } else {
      const version = await savePiece(database.db, { week, kind, value, by: null })
      console.log(`Week ${week} ${kind}: kept (version ${version})`)
    }
  }
  if (notes.length > 0) console.log(`\nLook at these:\n${notes.join('\n')}`)
} finally {
  await database.close()
}
