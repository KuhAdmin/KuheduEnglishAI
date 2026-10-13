import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'
import { EMAIL_CODE_LENGTH } from '@kuhedu/contracts'
import { and, desc, eq, gt, isNull, lt, sql } from 'drizzle-orm'
import type { DbOrTx } from '../../db/client.ts'
import { emailCodes, type EMAIL_CODE_PURPOSES } from '../../db/schema/index.ts'

type Purpose = (typeof EMAIL_CODE_PURPOSES)[number]

/** How long an emailed code works. */
export const CODE_LIFETIME_MS = 10 * 60 * 1000
/** Wrong guesses a code survives. Six digits and five tries: one chance in 200,000. */
export const MAX_CODE_ATTEMPTS = 5
/** A new code for the same address and purpose can be asked for this long after the last. */
export const CODE_COOLDOWN_MS = 60 * 1000

// Keyed with the server's secret, so the table alone does not let anyone try the codes out.
const hashCode = (secret: string, email: string, purpose: Purpose, code: string) =>
  createHmac('sha256', secret).update(`${purpose}:${email}:${code}`).digest()

/**
 * Make a new code for an address, replacing any earlier one for the same purpose. Gives the
 * code to send, or `null` when one was made too recently to make another.
 */
export async function issueCode(db: DbOrTx, secret: string, email: string, purpose: Purpose) {
  const now = new Date()
  const forThis = and(eq(emailCodes.email, email), eq(emailCodes.purpose, purpose))

  const [recent] = await db
    .select({ id: emailCodes.id })
    .from(emailCodes)
    .where(and(forThis, gt(emailCodes.createdAt, new Date(now.getTime() - CODE_COOLDOWN_MS))))
    .limit(1)
  if (recent) return null

  const code = String(randomInt(10 ** EMAIL_CODE_LENGTH)).padStart(EMAIL_CODE_LENGTH, '0')
  await db.delete(emailCodes).where(forThis)
  await db.insert(emailCodes).values({
    email,
    purpose,
    codeHash: hashCode(secret, email, purpose, code).toString('hex'),
    expiresAt: new Date(now.getTime() + CODE_LIFETIME_MS),
  })
  return code
}

export type CodeCheck = 'ok' | 'wrong' | 'tooManyAttempts'

/**
 * Try a code. A right one is used up; a wrong one costs one of the code's few attempts, and
 * `wrong` is also the answer when there is no code to try (none sent, expired, already used).
 */
export async function checkCode(
  db: DbOrTx,
  secret: string,
  email: string,
  purpose: Purpose,
  code: string,
): Promise<CodeCheck> {
  const now = new Date()
  const [live] = await db
    .select()
    .from(emailCodes)
    .where(
      and(
        eq(emailCodes.email, email),
        eq(emailCodes.purpose, purpose),
        isNull(emailCodes.consumedAt),
        gt(emailCodes.expiresAt, now),
      ),
    )
    .orderBy(desc(emailCodes.createdAt))
    .limit(1)
  if (!live) return 'wrong'

  // Counted before it is compared, and in one statement, so guesses sent together cannot each
  // be the "fifth".
  const [counted] = await db
    .update(emailCodes)
    .set({ attempts: sql`${emailCodes.attempts} + 1` })
    .where(and(eq(emailCodes.id, live.id), lt(emailCodes.attempts, MAX_CODE_ATTEMPTS)))
    .returning({ id: emailCodes.id })
  if (!counted) return 'tooManyAttempts'

  const expected = Buffer.from(live.codeHash, 'hex')
  const given = hashCode(secret, email, purpose, code)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return 'wrong'

  await db.update(emailCodes).set({ consumedAt: now }).where(eq(emailCodes.id, live.id))
  return 'ok'
}

/** Forget the codes kept for an address (they are tied to no account: see the table). */
export async function forgetCodes(db: DbOrTx, email: string, purpose?: Purpose) {
  await db
    .delete(emailCodes)
    .where(and(eq(emailCodes.email, email), purpose ? eq(emailCodes.purpose, purpose) : undefined))
}

/** The mail a code goes out in. TODO(content): in the learner's language; English for now. */
export function codeMail(to: string, purpose: Purpose, code: string) {
  const minutes = CODE_LIFETIME_MS / 60_000
  const what =
    purpose === 'verify_email'
      ? 'Use this code to confirm your email address and finish creating your Kuhedu Lingo account'
      : 'Use this code to choose a new password'
  return {
    to,
    subject: `${code} is your Kuhedu Lingo code`,
    text: `${what}:\n\n${code}\n\nIt works for ${minutes} minutes. If you did not ask for it, you can ignore this email.`,
  }
}
