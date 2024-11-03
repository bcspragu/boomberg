import { json } from '@sveltejs/kit'
import { pubsub } from '$lib/server/pubsub'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ request, locals }) => {
  const { gameId } = await request.json()

  // TODO: Confirm they're actually in the game first

  await pubsub.emitToUser(gameId, locals.user.id, { type: 'userJoined' })

  return json({})
}
