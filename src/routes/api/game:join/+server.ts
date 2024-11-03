import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { pubsub } from '$lib/server/pubsub'
import { db } from '$lib/server/db'
import { and, eq, gt, ne, sql } from 'drizzle-orm'
import { game, gameParticipant } from '$lib/server/db/schema'
import { existingActiveGamesForUser } from '$lib/server/db/common'

export const POST: RequestHandler = async ({ request, locals }) => {
  const { gameTicker, force } = await request.json()

  if (!force) {
    const existingGames = await existingActiveGamesForUser(locals.user.id)
    if (existingGames.length > 0) {
      return json({
        existingGames,
      })
    }
  }

  let ticker = gameTicker as string
  if (ticker.startsWith('$')) {
    ticker = ticker.slice(1)
  }

  const potentialGames = await db.query.game.findMany({
    columns: { id: true, creatorId: true, status: true },
    where: and(
      eq(game.ticker, ticker),
      ne(game.status, 'completed'),
      gt(game.createdAt, sql`unixepoch('now', '-1 day')`),
    ),
  })
  if (potentialGames.length === 0) {
    return json({
      error: `no game found for ticker $${ticker}`,
    })
  }

  type Games = typeof potentialGames
  type Game = Games[number]
  let theGame: Game | null = null
  if (potentialGames.length > 1) {
    // Check how many are pending
    const pendingGames = potentialGames.filter((g) => g.status === 'pending')
    if (pendingGames.length === 0) {
      return json({
        error: `there are ${potentialGames.length} games going on with ticker $${ticker}, but they've all started already`,
      })
    } else if (pendingGames.length > 1) {
      return json({
        error: `ticker $${ticker} is ambiguous, found ${pendingGames.length} pending games`,
      })
    }
    theGame = pendingGames[0]
  } else {
    theGame = potentialGames[0]
  }

  await db.insert(gameParticipant).values({
    gameId: theGame.id,
    userId: locals.user.id,
  })

  // No need to send a user ID, we look up the whole list
  await pubsub.emitToGame(theGame.id, { type: 'userJoined' })

  return json({})
}
