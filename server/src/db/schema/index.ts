/**
 * The tables, one file per area, re-exported here for the query builder and for
 * `drizzle-kit generate`. After changing one: `npm run db:generate -w @kuhedu/server`.
 *
 * The lists of allowed words still written beside the tables (`USER_STATUSES`, the content's
 * kinds) repeat the app's own for now. When a resource is wired its list moves to
 * `@kuhedu/contracts`, and the app and these files both read it from there, as `USER_ROLES`,
 * the learner's lists and the placement test's already are.
 *
 * Not here yet: the AI tables (speech attempts, conversations and their turns). They come with
 * the AI work, once its provider is chosen.
 */
export * from './accounts.ts'
export * from './content.ts'
export * from './events.ts'
export * from './learner.ts'
export * from './placement.ts'
