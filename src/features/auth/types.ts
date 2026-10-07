/** Which half of the account screen is showing. */
export type AuthMode = 'signIn' | 'signUp'

/** What the last attempt came to, when it did not let the visitor in. */
export type AuthFeedback = 'rejected' | 'unavailable'
