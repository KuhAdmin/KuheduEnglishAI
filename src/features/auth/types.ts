/** Which half of the account screen is showing. */
export type AuthMode = 'signIn' | 'signUp'

/**
 * What the last attempt came to, when it did not do what was asked and no one field is at fault.
 * - `rejected`: the address and password do not match an account.
 * - `tooMany`: too many tries; the server asks for a pause.
 * - `failed`: the server could not be reached, or could not do it.
 * - `unavailable`: a way of signing in that is not set up here (Google, without its id).
 */
export type AuthFeedback = 'rejected' | 'tooMany' | 'failed' | 'unavailable'
