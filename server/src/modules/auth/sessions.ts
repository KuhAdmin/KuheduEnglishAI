import { createHash, randomBytes } from 'node:crypto'
import type { SessionUser } from '@kuhedu/contracts'
import { and, eq, gt, isNull, lt, ne } from 'drizzle-orm'
import type { DbOrTx } from '../../db/client.ts'
import { sessions, users } from '../../db/schema/index.ts'

/** How long a browser stays signed in after it was last used. */
export const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000
/** A session in use is pushed forward at most this often, not on every request. */
const RENEW_AFTER_MS = 5 * 60 * 1000

// The cookie holds the token and the table only its hash: a copy of the table signs nobody in.
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

type UserRow = typeof users.$inferSelect

export const toSessionUser = (user: UserRow): SessionUser => ({
  id: user.id,
  email: user.email,
  emailVerified: user.emailVerifiedAt !== null,
  role: user.role,
  displayName: user.displayName,
})

/** Sign a browser in. The token goes into its cookie and is not kept anywhere else. */
export async function createSession(db: DbOrTx, userId: string, userAgent: string | undefined) {
  const token = randomBytes(32).toString('base64url')
  const now = new Date()
  // Old sessions of theirs that ran out are of no use to anyone.
  await db.delete(sessions).where(and(eq(sessions.userId, userId), lt(sessions.expiresAt, now)))
  await db.insert(sessions).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(now.getTime() + SESSION_LIFETIME_MS),
    userAgent: userAgent?.slice(0, 300),
  })
  return token
}

/**
 * Who a cookie's token belongs to, if it still signs anyone in: not revoked, not run out, and
 * the account not disabled. `renewed` says the session was pushed forward, so the cookie should be.
 */
export async function findSession(db: DbOrTx, token: string) {
  const now = new Date()
  const [found] = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.tokenHash, hashToken(token)),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, now),
        eq(users.status, 'active'),
      ),
    )
  if (!found) return null

  const renewed = now.getTime() - found.session.lastSeenAt.getTime() > RENEW_AFTER_MS
  if (renewed) {
    await db
      .update(sessions)
      .set({ lastSeenAt: now, expiresAt: new Date(now.getTime() + SESSION_LIFETIME_MS) })
      .where(eq(sessions.id, found.session.id))
  }
  return { sessionId: found.session.id, user: toSessionUser(found.user), renewed }
}

export async function revokeSession(db: DbOrTx, sessionId: string) {
  await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, sessionId))
}

/** Sign an account out everywhere, or everywhere but the browser that asked. */
export async function revokeUserSessions(db: DbOrTx, userId: string, exceptSessionId?: string) {
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(sessions.userId, userId),
        isNull(sessions.revokedAt),
        exceptSessionId ? ne(sessions.id, exceptSessionId) : undefined,
      ),
    )
}
