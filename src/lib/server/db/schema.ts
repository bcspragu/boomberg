import { sql } from 'drizzle-orm'
import { sqliteTable, integer, text, check, index, primaryKey } from 'drizzle-orm/sqlite-core'

export const session = sqliteTable('session', {
  id: integer('id').primaryKey(),
  sessionId: text('session_id').unique().notNull(),
  name: text('name'),
  createdAt: integer('created_at', { mode: 'number' })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
})

export const game = sqliteTable(
  'game',
  {
    id: integer('id').primaryKey(),
    ticker: text('ticker').notNull(),
    creatorId: integer('creator_id')
      .notNull()
      .references(() => session.id),
    createdAt: integer('created_at', { mode: 'number' })
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
    status: text('status').notNull().default('pending'),
  },
  (t) => ({
    checkConstraint: check(
      'status_check',
      sql`${t.status} IN ('pending', 'in_progress', 'completed')`,
    ),
    tickerIndex: index('ticker_idx').on(t.ticker),
    createdAtIndex: index('created_at_idx').on(t.createdAt),
  }),
)

export const gameParticipant = sqliteTable('game_participant', {
  gameId: integer('game_id').notNull(),
  userId: integer('user_id').notNull(),
  joinedAt: integer('joined_at', { mode: 'number' })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
}, (t) => {
  return {
    pk: primaryKey({ columns: [t.gameId, t.userId] }),
  };
})
