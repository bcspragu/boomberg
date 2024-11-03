import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { getRandomTicker, type Ticker } from '$lib/tickers'
import { db } from '$lib/server/db'
import { and, eq, gt, ne, sql } from 'drizzle-orm'
import { game, gameParticipant } from '$lib/server/db/schema'

export const POST: RequestHandler = async ({ request, locals }) => {
  const { force } = await request.json()

  let ticker: Ticker | null = null

  if (!force) {
    const fields = {
      id: game.id,
      ticker: game.ticker,
      creatorId: game.creatorId,
      status: game.status,
    }
    const existingGames = await db
      .select(fields)
      .from(game)
      .innerJoin(gameParticipant, eq(game.id, gameParticipant.gameId))
      .where(
        and(
          eq(gameParticipant.userId, locals.user.id),
          ne(game.status, 'completed'),
          gt(game.createdAt, sql`unixepoch('now', '-1 day')`),
        ),
      )
      .limit(10)
    if (existingGames.length > 0) {
      return json({
        existingGames,
      })
    }
  }

  for (let i = 0; i < 10; i++) {
    const t = getRandomTicker()

    // Make sure there are no other games with the same ticker plausibly still open.
    const existingGame = await db.query.game.findFirst({
      columns: { id: true, creatorId: true, status: true },
      where: and(
        eq(game.ticker, t.ticker),
        ne(game.status, 'completed'),
        gt(game.createdAt, sql`unixepoch('now', '-1 day')`),
      ),
    })

    if (!existingGame) {
      ticker = t
      break
    }

    // Otherwise, do another lap
  }

  if (!ticker) {
    return json({
      error: "couldn't find an available ticker symbol, server might be overloaded!",
    })
  }

  // Create the game, add the user to it
  await db.transaction(async (tx) => {
    const res = await tx
      .insert(game)
      .values({
        creatorId: locals.user.id,
        ticker: ticker.ticker,
        status: 'pending',
      })
      .returning({ id: game.id })
    if (res.length !== 1) {
      throw new Error(`got ${res.length} game IDs back`)
    }
    await tx.insert(gameParticipant).values({
      gameId: res[0].id,
      userId: locals.user.id,
    })
  })

  return json({
    code: ticker.ticker,
    desc: ticker.company,
  })
}
