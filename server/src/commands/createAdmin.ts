import { randomBytes } from 'node:crypto'
import { signUpRequestSchema } from '@kuhedu/contracts'
import { eq } from 'drizzle-orm'
import { connectDatabase } from '../db/client.ts'
import { users } from '../db/schema/index.ts'
import { readEnv } from '../env.ts'
import { hashPassword } from '../modules/auth/passwords.ts'
import { revokeUserSessions } from '../modules/auth/sessions.ts'

/**
 * Make an admin, the only way there is: `npm run admin:create -w @kuhedu/server -- <email>`.
 * Nobody becomes one by signing up.
 *
 * The password is `ADMIN_PASSWORD` if that is set, otherwise one is made up and printed here,
 * once. An address that already has an account becomes an admin and keeps its password unless
 * `ADMIN_PASSWORD` gives a new one. Whoever runs this vouches for the address, so it counts as
 * verified.
 */
const given = process.env.ADMIN_PASSWORD
const generated = given ? undefined : randomBytes(15).toString('base64url')

const input = signUpRequestSchema.safeParse({
  email: process.argv[2],
  password: given ?? generated,
})
if (!input.success) {
  console.error(
    'Usage: npm run admin:create -w @kuhedu/server -- <email>\n' +
      'The address must be a valid one, and ADMIN_PASSWORD (if set) at least 8 characters.',
  )
  process.exit(1)
}
const { email, password } = input.data

const database = connectDatabase(readEnv())
try {
  const [existing] = await database.db.select().from(users).where(eq(users.email, email))
  const keepPassword = existing?.passwordHash != null && !given

  const account = {
    role: 'admin' as const,
    status: 'active' as const,
    emailVerifiedAt: existing?.emailVerifiedAt ?? new Date(),
    ...(!keepPassword && { passwordHash: await hashPassword(password) }),
  }
  if (existing) {
    await database.db.update(users).set(account).where(eq(users.id, existing.id))
    // A changed password signs out whoever was using the old one.
    if (!keepPassword) await revokeUserSessions(database.db, existing.id)
  } else {
    await database.db.insert(users).values({ email, ...account })
  }

  console.log(`${email} is ${existing ? 'now' : 'a new'} admin.`)
  if (keepPassword) console.log('Their password is unchanged.')
  else if (generated) console.log(`Password (shown only now): ${generated}`)
  else console.log('Their password is the one given in ADMIN_PASSWORD.')
} finally {
  await database.close()
}
