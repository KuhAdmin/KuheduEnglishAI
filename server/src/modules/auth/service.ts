import type {
  ResetPasswordRequest,
  SessionUser,
  SignInRequest,
  SignUpRequest,
} from '@kuhedu/contracts'
import { and, eq } from 'drizzle-orm'
import type { Db } from '../../db/client.ts'
import { oauthIdentities, users } from '../../db/schema/index.ts'
import type { Mailer } from '../../lib/mailer.ts'
import { HttpError } from '../../plugins/errors.ts'
import { checkCode, codeMail, forgetCodes, issueCode } from './codes.ts'
import type { GoogleIdentity } from './google.ts'
import { hashPassword, pretendToVerify, verifyPassword } from './passwords.ts'
import { createSession, revokeUserSessions, toSessionUser } from './sessions.ts'

export type AuthDeps = {
  db: Db
  mailer: Mailer
  /** Keys the hashes of emailed codes. */
  secret: string
  /** For what went wrong without the caller needing to know (a mail that did not go out). */
  logError: (error: unknown) => void
}

/** What signing in, by any way, comes to: who it is, and the token for their cookie. */
type SignedIn = { user: SessionUser; token: string }

// One answer for every way signing in can fail, so an address is never confirmed by it.
const rejected = () => new HttpError(401, 'unauthenticated', 'Incorrect email or password')
const wrongCode = () =>
  new HttpError(400, 'validation_failed', 'The code is not right', { code: 'auth.codeWrong' })
const tooManyGuesses = () => new HttpError(429, 'rate_limited', 'Too many guesses at this code')

export async function signUp(
  { db, mailer, secret, logError }: AuthDeps,
  { email, password }: SignUpRequest,
  userAgent: string | undefined,
): Promise<SignedIn> {
  const passwordHash = await hashPassword(password)
  const [user] = await db
    .insert(users)
    .values({ email, passwordHash, lastLoginAt: new Date() })
    .onConflictDoNothing({ target: users.email })
    .returning()
  if (!user) {
    throw new HttpError(409, 'conflict', 'This address already has an account', {
      email: 'auth.emailTaken',
    })
  }

  const token = await createSession(db, user.id, userAgent)
  // The account exists whether or not the mail goes out: a new code can be asked for.
  try {
    const code = await issueCode(db, secret, email, 'verify_email')
    if (code) await mailer.send(codeMail(email, 'verify_email', code))
  } catch (error) {
    logError(error)
  }
  return { user: toSessionUser(user), token }
}

export async function signIn(
  { db }: AuthDeps,
  { email, password }: SignInRequest,
  userAgent: string | undefined,
): Promise<SignedIn> {
  const [user] = await db.select().from(users).where(eq(users.email, email))
  const matches = user?.passwordHash
    ? await verifyPassword(password, user.passwordHash)
    : await pretendToVerify(password)
  if (!user || !matches || user.status !== 'active') throw rejected()

  const [updated] = await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, user.id))
    .returning()
  return {
    user: toSessionUser(updated ?? user),
    token: await createSession(db, user.id, userAgent),
  }
}

export async function verifyEmail({ db, secret }: AuthDeps, user: SessionUser, code: string) {
  if (user.emailVerified) return
  const check = await checkCode(db, secret, user.email, 'verify_email', code)
  if (check === 'tooManyAttempts') throw tooManyGuesses()
  if (check === 'wrong') throw wrongCode()
  await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, user.id))
}

export async function resendVerification({ db, mailer, secret }: AuthDeps, user: SessionUser) {
  if (user.emailVerified) return
  const code = await issueCode(db, secret, user.email, 'verify_email')
  if (!code) throw new HttpError(429, 'rate_limited', 'A code was sent a moment ago')
  await mailer.send(codeMail(user.email, 'verify_email', code))
}

/** Never says whether the address has an account: the caller is answered the same either way. */
export async function forgotPassword({ db, mailer, secret, logError }: AuthDeps, email: string) {
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email))
  if (!user) return
  const code = await issueCode(db, secret, email, 'reset_password')
  if (!code) return
  // Not waited for, so the answer takes as long whether or not there is anything to send.
  void mailer.send(codeMail(email, 'reset_password', code)).catch(logError)
}

export async function resetPassword(
  { db, secret }: AuthDeps,
  { email, code, password }: ResetPasswordRequest,
) {
  const check = await checkCode(db, secret, email, 'reset_password', code)
  if (check === 'tooManyAttempts') throw tooManyGuesses()
  if (check === 'wrong') throw wrongCode()

  const passwordHash = await hashPassword(password)
  await db.transaction(async (tx) => {
    const [user] = await tx.select().from(users).where(eq(users.email, email))
    if (!user) return
    await tx
      .update(users)
      // The code reached the address, which is all that verifying it would have shown.
      .set({ passwordHash, emailVerifiedAt: user.emailVerifiedAt ?? new Date() })
      .where(eq(users.id, user.id))
    // Whoever knew the old password is signed out with it.
    await revokeUserSessions(tx, user.id)
    await forgetCodes(tx, email, 'reset_password')
  })
}

export async function signInWithGoogle(
  { db }: AuthDeps,
  identity: GoogleIdentity,
  userAgent: string | undefined,
): Promise<SignedIn> {
  const user = await db.transaction(async (tx) => {
    const [known] = await tx
      .select({ user: users })
      .from(oauthIdentities)
      .innerJoin(users, eq(users.id, oauthIdentities.userId))
      .where(
        and(eq(oauthIdentities.provider, 'google'), eq(oauthIdentities.subject, identity.subject)),
      )
    if (known) return known.user

    // From here on the address decides whose account this is, so Google must have checked it.
    if (!identity.emailVerified) {
      throw new HttpError(403, 'forbidden', 'Google has not verified this address')
    }

    const [existing] = await tx.select().from(users).where(eq(users.email, identity.email))
    let account = existing
    if (existing && existing.emailVerifiedAt === null) {
      // Nobody ever showed the address was theirs: whoever made this account may not be its
      // owner. Their password and their browsers go; the owner, proven by Google, stays.
      await revokeUserSessions(tx, existing.id)
      ;[account] = await tx
        .update(users)
        .set({ passwordHash: null, emailVerifiedAt: new Date() })
        .where(eq(users.id, existing.id))
        .returning()
    }
    if (!account) {
      ;[account] = await tx
        .insert(users)
        .values({ email: identity.email, emailVerifiedAt: new Date(), displayName: identity.name })
        .returning()
    }
    if (!account) throw new Error('The account could not be made')

    await tx.insert(oauthIdentities).values({
      provider: 'google',
      subject: identity.subject,
      userId: account.id,
      email: identity.email,
    })
    return account
  })

  if (user.status !== 'active') throw new HttpError(403, 'forbidden', 'This account is disabled')

  const [updated] = await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, user.id))
    .returning()
  return {
    user: toSessionUser(updated ?? user),
    token: await createSession(db, user.id, userAgent),
  }
}
