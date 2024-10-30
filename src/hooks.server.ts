import type { Handle } from '@sveltejs/kit'
import { db } from '$lib/server/db'
import { session } from '$lib/server/db/schema'
import { generateID } from '$lib/idgen'
import { sql } from 'drizzle-orm'

export const handle: Handle = async ({ event, resolve }) => {
  const sessionId = event.cookies.get('session')

  const createSession = async () => {
    const sessionId = generateID()
    const res = await db
      .insert(session)
      .values({
        sessionId: sessionId,
      })
      .returning({ id: session.id, createdAt: session.createdAt })
    if (res.length !== 1) {
      throw new Error(`got ${res.length} IDs back`)
    }

    event.cookies.set('session', sessionId, {
      path: '/',
      httpOnly: true,
      secure: true,
      maxAge: 60 * 60 * 24 * 365,
    })
    event.locals.user = {
      id: res[0].id,
      name: null,
      createdAt: res[0].createdAt,
    }

    return await resolve(event)
  }
  if (!sessionId) {
    return await createSession()
  }

  const dbSession = await db.query.session.findFirst({
    columns: { id: true, name: true, createdAt: true },
    where: sql`${session.sessionId} = ${sessionId}`,
  })
  if (!dbSession) {
    return await createSession()
  }

  event.locals.user = {
    id: dbSession.id,
    name: dbSession.name,
    createdAt: dbSession.createdAt,
  }
  return await resolve(event)
}
