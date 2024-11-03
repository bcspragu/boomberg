import type { Handle } from '@sveltejs/kit'
import { getOrCreateSession } from '$lib/server/session'

export const handle: Handle = async ({ event, resolve }) => {
  const { user, sessionId, cookie } = await getOrCreateSession(event.cookies.get('session'))

  if (cookie) {
    event.cookies.set('session', sessionId, {
      path: '/',
      httpOnly: true,
      secure: true,
      maxAge: 60 * 60 * 24 * 365,
    })
  }

  event.locals.user = user

  return await resolve(event)
}
