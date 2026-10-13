import { redirect } from 'react-router'
import { accountStanding } from '@/shared/lib/account'
import { paths } from '@/shared/lib/paths'

/**
 * Route loader for everything that is a learner's: there are no guests, so these screens are
 * for someone signed in to an account whose address is verified (an admin is one too, and may
 * walk them). Anyone else is led to the account screen, or to the code their account still
 * waits for. Like `requireAdmin`, this only decides which screen is shown: what the server keeps
 * of a learner, the server refuses.
 */
export async function requireAccount() {
  const standing = await accountStanding()
  if (standing.account === 'none') throw redirect(paths.signIn)
  if (standing.account === 'unverified') throw redirect(paths.verifyEmail)
  return null
}
