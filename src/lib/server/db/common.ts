import { db } from '$lib/server/db'
import { and, eq, gt, ne, sql } from 'drizzle-orm'
import { game, gameParticipant } from '$lib/server/db/schema'

export const existingActiveGamesForUser = async (userId: number) => {
  const fields = {
    id: game.id,
    ticker: game.ticker,
    creatorId: game.creatorId,
    status: game.status,
  }
  return await db
    .select(fields)
    .from(game)
    .innerJoin(gameParticipant, eq(game.id, gameParticipant.gameId))
    .where(
      and(
        eq(gameParticipant.userId, userId),
        ne(game.status, 'completed'),
        gt(game.createdAt, sql`unixepoch('now', '-1 day')`),
      ),
    )
    .limit(10)
}
