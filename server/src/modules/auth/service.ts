import type {
  ResetPasswordRequest,
  SessionUser,
  SignInRequest,
  SignUpRequest,
} from '@kuhedu/contracts'
import { and, eq, isNull } from 'drizzle-orm'
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

/**
 * Send an address the code that verifies it. Nothing goes out when one went a moment ago (it
 * still works). A mail that fails is logged, not thrown: the caller's own work is done, and a
 * new code can be asked for from the code step.
 */
async function sendVerificationCode({ db, mailer, secret, logError }: AuthDeps, email: string) {
  try {
    const code = await issueCode(db, secret, email, 'verify_email')
    if (code) await mailer.send(codeMail(email, 'verify_email', code))
  } catch (error) {
    logError(error)
  }
}

/**
 * An address somebody signed up with and never verified is nobody's account yet: whoever did it
 * may have mistyped, or may not own it. So signing up with it again is not refused: the new
 * sign-up takes the place of the old one, whose password and browsers go. Only the code, which
 * goes to the address itself, makes it an account.
 */
async function claimUnverified(db: Db, email: string, passwordHash: string) {
  return db.transaction(async (tx) => {
    const [claimed] = await tx
      .update(users)
      .set({ passwordHash, lastLoginAt: new Date() })
      .where(
        and(
          eq(users.email, email),
          isNull(users.emailVerifiedAt),
          eq(users.role, 'learner'),
          eq(users.status, 'active'),
        ),
      )
      .returning()
    if (claimed) await revokeUserSessions(tx, claimed.id)
    return claimed
  })
}

/**
 * The first half of making an account: the address and password are kept, the browser is
 * signed in so that it can answer for the code, and the code is sent. **It is an account only
 * once the code has been matched** (`verifyEmail`): until then the app leads nowhere but the
 * code step, and `requireVerified` keeps it out of everything that is a learner's own.
 */
export async function signUp(
  deps: AuthDeps,
  { email, password }: SignUpRequest,
  userAgent: string | undefined,
): Promise<SignedIn> {
  const { db } = deps
  const passwordHash = await hashPassword(password)
  const [made] = await db
    .insert(users)
    .values({ email, passwordHash, lastLoginAt: new Date() })
    .onConflictDoNothing({ target: users.email })
    .returning()
  const user = made ?? (await claimUnverified(db, email, passwordHash))
  if (!user) {
    throw new HttpError(409, 'conflict', 'This address already has an account', {
      email: 'auth.emailTaken',
    })
  }

  const token = await createSession(db, user.id, userAgent)
  await sendVerificationCode(deps, email)
  return { user: toSessionUser(user), token }
}

export async function signIn(
  deps: AuthDeps,
  { email, password }: SignInRequest,
  userAgent: string | undefined,
): Promise<SignedIn> {
  const { db } = deps
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
  // Someone who signed up and left before the code: they are let back in only as far as the
  // code step, which needs a code that still works.
  if (user.emailVerifiedAt === null) await sendVerificationCode(deps, email)
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
        .values({
          email: identity.email,
          emailVerifiedAt: new Date(),
          displayName: identity.name,
          pictureUrl: identity.picture,
        })
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
    // Their picture as Google has it now: it is theirs to change there, and the address of an
    // old one stops working. Signing in without one leaves what was kept.
    .set({ lastLoginAt: new Date(), ...(identity.picture && { pictureUrl: identity.picture }) })
    .where(eq(users.id, user.id))
    .returning()
  return {
    user: toSessionUser(updated ?? user),
    token: await createSession(db, user.id, userAgent),
  }
}
