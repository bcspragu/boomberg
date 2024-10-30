import { sql } from 'drizzle-orm'
import { sqliteTable, integer, text, check } from 'drizzle-orm/sqlite-core'

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
    creatorId: text('creator_id')
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
  }),
)
