/**
 * What the account screen passes along (as router state) when it sends a brand-new account to
 * the code step: onboarding is still ahead of it, so that is where the step leads on to.
 */
export const NEW_ACCOUNT_STATE = { newAccount: true } as const

export const isNewAccount = (state: unknown): boolean =>
  typeof state === 'object' && state !== null && 'newAccount' in state && state.newAccount === true
