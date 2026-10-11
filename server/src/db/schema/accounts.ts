import { USER_ROLES } from '@kuhedu/contracts'
import { sql } from 'drizzle-orm'
import { check, index, integer, jsonb, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core'
import { citext, createdAt, id, instant, oneOf, updatedAt } from './columns.ts'

export const USER_STATUSES = ['active', 'disabled'] as const
export const OAUTH_PROVIDERS = ['google'] as const
export const EMAIL_CODE_PURPOSES = ['verify_email', 'reset_password'] as const

/** Someone with an account. A guest has none: their data stays on their phone until they sign up. */
export const users = pgTable(
  'users',
  {
    id: id(),
    email: citext('email').notNull().unique(),
    emailVerifiedAt: instant('email_verified_at'),
    /** argon2id. Empty for an account that only ever signed in with Google. */
    passwordHash: text('password_hash'),
    role: text('role', { enum: USER_ROLES }).notNull().default('learner'),
    displayName: text('display_name'),
    status: text('status', { enum: USER_STATUSES }).notNull().default('active'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    lastLoginAt: instant('last_login_at'),
  },
  (table) => [
    check('users_role_check', oneOf(table.role, USER_ROLES)),
    check('users_status_check', oneOf(table.status, USER_STATUSES)),
  ],
)

/** An account at a sign-in provider that stands for one of ours. */
export const oauthIdentities = pgTable(
  'oauth_identities',
  {
    provider: text('provider', { enum: OAUTH_PROVIDERS }).notNull(),
    /** The provider's own id for the person, which never changes; their address can. */
    subject: text('subject').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** The address the provider gave when the two were linked. */
    email: citext('email').notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.subject] }),
    index('oauth_identities_user_id_idx').on(table.userId),
    check('oauth_identities_provider_check', oneOf(table.provider, OAUTH_PROVIDERS)),
  ],
)

/** One signed-in browser. The cookie holds the token; this holds only its SHA-256. */
export const sessions = pgTable(
  'sessions',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    createdAt: createdAt(),
    lastSeenAt: instant('last_seen_at').notNull().defaultNow(),
    expiresAt: instant('expires_at').notNull(),
    revokedAt: instant('revoked_at'),
    userAgent: text('user_agent'),
  },
  (table) => [
    index('sessions_user_id_idx').on(table.userId),
    index('sessions_expires_at_idx').on(table.expiresAt),
  ],
)

/**
 * A one-time code sent by email. Kept by address, not by account, so that asking for one looks
 * the same whether or not the address has an account. Nothing ties a row to an account, then:
 * deleting an account must remove the codes for its address itself.
 */
export const emailCodes = pgTable(
  'email_codes',
  {
    id: id(),
    email: citext('email').notNull(),
    purpose: text('purpose', { enum: EMAIL_CODE_PURPOSES }).notNull(),
    codeHash: text('code_hash').notNull(),
    /** Wrong guesses so far; the code stops working after a few. */
    attempts: integer('attempts').notNull().default(0),
    createdAt: createdAt(),
    expiresAt: instant('expires_at').notNull(),
    consumedAt: instant('consumed_at'),
  },
  (table) => [
    index('email_codes_email_purpose_idx').on(table.email, table.purpose),
    check('email_codes_purpose_check', oneOf(table.purpose, EMAIL_CODE_PURPOSES)),
    check('email_codes_attempts_check', sql`${table.attempts} >= 0`),
  ],
)

/** Every change an admin makes. It outlives the admin's account, without their name. */
export const auditLog = pgTable(
  'audit_log',
  {
    id: id(),
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    /** What was done, e.g. `week_content.save`. */
    action: text('action').notNull(),
    /** What it was done to, e.g. `dialogue/12`. */
    target: text('target').notNull(),
    detail: jsonb('detail').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (table) => [
    index('audit_log_created_at_idx').on(table.createdAt),
    index('audit_log_actor_user_id_idx').on(table.actorUserId),
  ],
)
