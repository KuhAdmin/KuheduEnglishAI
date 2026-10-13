import { bigint, index, jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import { users } from './accounts.ts'
import { instant } from './columns.ts'

/**
 * What happened in the app and when: never audio, and never what a learner said or typed.
 * An event from before anyone is signed in (the landing page, the account screen) has no
 * account. Rows are only ever added.
 */
export const events = pgTable(
  'events',
  {
    id: bigint('id', { mode: 'bigint' }).primaryKey().generatedAlwaysAsIdentity(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    /** What the event belongs to, in the app's own words: a placement test's `PL-…` id. */
    sessionRef: text('session_ref'),
    /** e.g. `placement_started`. The app names them; a new name needs no migration. */
    name: text('name').notNull(),
    itemId: text('item_id'),
    stage: text('stage'),
    /** When it happened, by the phone's clock; `receivedAt` is the server's. */
    occurredAt: instant('occurred_at').notNull(),
    receivedAt: instant('received_at').notNull().defaultNow(),
    props: jsonb('props').$type<Record<string, unknown>>().notNull().default({}),
  },
  (table) => [
    index('events_name_occurred_at_idx').on(table.name, table.occurredAt),
    index('events_user_id_idx').on(table.userId),
    index('events_session_ref_idx').on(table.sessionRef),
  ],
)
