import {
  LESSON_REVIEW_PARTS,
  type LearnerPlacement,
  type LearnerProfile,
  type LearnerProfilePatch,
  type LessonMark,
  type LessonProgress,
  type PlacementResult,
  type PlacementSave,
  type PlacementSession,
} from '@kuhedu/contracts'
import { and, asc, desc, eq } from 'drizzle-orm'
import type { Db, DbOrTx } from '../../db/client.ts'
import {
  learnerPhotos,
  learnerProfiles,
  lessonMarks,
  placementResponses,
  placementResults,
  placementSessions,
} from '../../db/schema/index.ts'
import { HttpError } from '../../plugins/errors.ts'

/**
 * What is kept of a learner with their account. Every function here takes whose it is from the
 * caller, which takes it from the session: nothing a request says can name another learner.
 */

export async function readProfile(db: DbOrTx, userId: string): Promise<LearnerProfile> {
  const [profile] = await db
    .select({
      language: learnerProfiles.language,
      ageGroup: learnerProfiles.ageGroup,
      tutorAvatar: learnerProfiles.tutorAvatar,
      theme: learnerProfiles.theme,
      voices: learnerProfiles.voices,
    })
    .from(learnerProfiles)
    .where(eq(learnerProfiles.userId, userId))
  // When it was saved, never the picture itself: that is asked for apart.
  const [photo] = await db
    .select({ updatedAt: learnerPhotos.updatedAt })
    .from(learnerPhotos)
    .where(eq(learnerPhotos.userId, userId))

  return {
    language: profile?.language ?? null,
    ageGroup: profile?.ageGroup ?? null,
    tutorAvatar: profile?.tutorAvatar ?? null,
    theme: profile?.theme ?? null,
    voices: profile?.voices ?? {},
    photoUpdatedAt: photo?.updatedAt.toISOString() ?? null,
  }
}

/** Keep the answers given; one left out stays as it was. The row is made by the first of them. */
export async function saveProfile(db: DbOrTx, userId: string, patch: LearnerProfilePatch) {
  // Only what was sent: a key that is there but `undefined` must not empty a column.
  const changes = Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  ) as LearnerProfilePatch
  await db
    .insert(learnerProfiles)
    .values({ userId, ...changes })
    .onConflictDoUpdate({
      target: learnerProfiles.userId,
      set: { ...changes, updatedAt: new Date() },
    })
  return readProfile(db, userId)
}

/** How a picture of each kind begins. A `data:` URL that says one thing and holds another is refused. */
const BEGINS: Record<string, (bytes: Buffer) => boolean> = {
  png: (bytes) => bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')),
  jpeg: (bytes) => bytes.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex')),
  webp: (bytes) =>
    bytes.toString('latin1', 0, 4) === 'RIFF' && bytes.toString('latin1', 8, 12) === 'WEBP',
}

/** Whether a `data:` URL the schema let through is the picture it says it is. */
export function isPicture(photo: string): boolean {
  const said = /^data:image\/(png|jpeg|webp);base64,/.exec(photo)
  const kind = said?.[1]
  if (!said || !kind) return false
  // Its first bytes are enough: 24 letters of base64 are 18 of them.
  const start = Buffer.from(photo.slice(said[0].length, said[0].length + 24), 'base64')
  return BEGINS[kind]?.(start) ?? false
}

export async function savePhoto(db: DbOrTx, userId: string, photo: string) {
  if (!isPicture(photo)) {
    throw new HttpError(400, 'validation_failed', 'The photo is not a picture')
  }
  const updatedAt = new Date()
  await db
    .insert(learnerPhotos)
    .values({ userId, photo, updatedAt })
    .onConflictDoUpdate({ target: learnerPhotos.userId, set: { photo, updatedAt } })
  return { photoUpdatedAt: updatedAt.toISOString() }
}

export async function readPhoto(db: DbOrTx, userId: string) {
  const [kept] = await db
    .select({ photo: learnerPhotos.photo })
    .from(learnerPhotos)
    .where(eq(learnerPhotos.userId, userId))
  if (!kept) throw new HttpError(404, 'not_found', 'There is no photo')
  return kept
}

export async function removePhoto(db: DbOrTx, userId: string) {
  await db.delete(learnerPhotos).where(eq(learnerPhotos.userId, userId))
}

/** Add what was done. A mark that is already there is left as it is, with its first time. */
export async function addMarks(db: DbOrTx, userId: string, marks: LessonMark[]) {
  await db
    .insert(lessonMarks)
    .values(marks.map(({ week, kind, ref }) => ({ userId, week, kind, ref })))
    .onConflictDoNothing()
}

/** Lesson progress in the shape the app's store keeps it, from the marks. */
export async function readProgress(db: DbOrTx, userId: string): Promise<LessonProgress> {
  const marks = await db
    .select({ week: lessonMarks.week, kind: lessonMarks.kind, ref: lessonMarks.ref })
    .from(lessonMarks)
    .where(eq(lessonMarks.userId, userId))
    .orderBy(asc(lessonMarks.week), asc(lessonMarks.ref))

  const progress: LessonProgress = {
    heardWeeks: [],
    doneDays: {},
    reviewParts: {},
    scenariosDone: {},
  }
  const parts: Record<string, Set<string>> = {}
  for (const { week, kind, ref } of marks) {
    if (kind === 'heard') progress.heardWeeks.push(week)
    else if (kind === 'day') (progress.doneDays[week] ??= []).push(Number(ref))
    else if (kind === 'scenario') (progress.scenariosDone[week] ??= []).push(Number(ref))
    else (parts[week] ??= new Set()).add(ref)
  }
  // In the order the review lists them, as the app keeps them.
  for (const [week, done] of Object.entries(parts)) {
    progress.reviewParts[week] = LESSON_REVIEW_PARTS.filter((part) => done.has(part))
  }
  return progress
}

const refused = (message: string) => new HttpError(400, 'validation_failed', message)

/**
 * Keep a test as it stands, and its result once it is finished. The same test saved again takes
 * the earlier save's place; a finished one is left as it finished.
 */
export async function savePlacement(
  db: Db,
  userId: string,
  clientId: string,
  { session, result }: PlacementSave,
) {
  if (session.id !== clientId) throw refused('The session is not the one in the address')
  const finished = session.status === 'COMPLETED'
  if (finished && !session.completedAt) throw refused('A finished test says when it finished')
  if (result && (!finished || result.sessionId !== clientId)) {
    throw refused('A result belongs to the finished test it is sent with')
  }

  await db.transaction(async (tx) => {
    const [kept] = await tx
      .select({ id: placementSessions.id, status: placementSessions.status })
      .from(placementSessions)
      .where(and(eq(placementSessions.userId, userId), eq(placementSessions.clientId, clientId)))
      .for('update')
    if (kept?.status === 'COMPLETED') {
      // Sent again by a phone that did not hear the first answer: nothing to do.
      if (finished) return
      throw new HttpError(409, 'conflict', 'That test is finished and cannot be reopened')
    }

    const values = {
      version: session.version,
      status: session.status,
      stage: session.stage,
      stageStarted: session.stageStarted,
      currentItemId: session.currentItemId,
      languageSupport: session.languageSupport,
      deviceType: session.deviceType,
      notAssessed: session.notAssessed,
      startedAt: new Date(session.startedAt),
      updatedAt: new Date(session.updatedAt),
      completedAt: session.completedAt ? new Date(session.completedAt) : null,
    }
    let sessionId = kept?.id
    if (sessionId) {
      await tx.update(placementSessions).set(values).where(eq(placementSessions.id, sessionId))
      await tx.delete(placementResponses).where(eq(placementResponses.sessionId, sessionId))
    } else {
      const [made] = await tx
        .insert(placementSessions)
        .values({ userId, clientId, ...values })
        .returning({ id: placementSessions.id })
      sessionId = made?.id
    }
    if (!sessionId) throw new Error('The session was not kept')

    if (session.responses.length > 0) {
      const of = sessionId
      await tx.insert(placementResponses).values(
        session.responses.map(({ answeredAt, ...response }, seq) => ({
          ...response,
          sessionId: of,
          seq,
          answeredAt: new Date(answeredAt),
        })),
      )
    }
    if (result) {
      await tx.insert(placementResults).values({
        sessionId,
        userId,
        version: result.version,
        completedAt: new Date(result.completedAt),
        profile: result.profile,
        startLevel: result.recommendation.startLevel,
        supportLevel: result.recommendation.supportLevel,
        prioritySkills: result.recommendation.prioritySkills,
        provisional: result.recommendation.provisional,
      })
    }
  })
}

/** The test the learner last touched, and the outcome of the one they last finished. */
export async function readPlacement(db: DbOrTx, userId: string): Promise<LearnerPlacement> {
  const [latest] = await db
    .select()
    .from(placementSessions)
    .where(eq(placementSessions.userId, userId))
    .orderBy(desc(placementSessions.updatedAt))
    .limit(1)

  let session: PlacementSession | null = null
  if (latest) {
    const responses = await db
      .select()
      .from(placementResponses)
      .where(eq(placementResponses.sessionId, latest.id))
      .orderBy(asc(placementResponses.seq))
    session = {
      id: latest.clientId,
      version: latest.version,
      status: latest.status,
      startedAt: latest.startedAt.toISOString(),
      updatedAt: latest.updatedAt.toISOString(),
      completedAt: latest.completedAt?.toISOString() ?? null,
      languageSupport: latest.languageSupport,
      deviceType: latest.deviceType,
      stage: latest.stage,
      stageStarted: latest.stageStarted,
      currentItemId: latest.currentItemId,
      // As they were sent: the route's answer is checked against the schema on its way out.
      notAssessed: latest.notAssessed as PlacementSession['notAssessed'],
      // The row's own columns (its session, its place) are not part of what the app keeps.
      responses: responses.map(({ sessionId: _session, seq: _seq, answeredAt, ...response }) => ({
        ...response,
        answeredAt: answeredAt.toISOString(),
      })),
    }
  }

  const [outcome] = await db
    .select({ result: placementResults, clientId: placementSessions.clientId })
    .from(placementResults)
    .innerJoin(placementSessions, eq(placementSessions.id, placementResults.sessionId))
    .where(eq(placementResults.userId, userId))
    .orderBy(desc(placementResults.completedAt))
    .limit(1)
  const result: PlacementResult | null = outcome
    ? {
        sessionId: outcome.clientId,
        version: outcome.result.version,
        completedAt: outcome.result.completedAt.toISOString(),
        profile: outcome.result.profile as PlacementResult['profile'],
        recommendation: {
          startLevel: outcome.result.startLevel,
          supportLevel: outcome.result.supportLevel,
          prioritySkills: outcome.result.prioritySkills,
          provisional: outcome.result.provisional,
        },
      }
    : null

  return { session, result }
}
