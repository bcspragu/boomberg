import type { User } from '../../boomberg'
import { generateID } from '$lib/server/idgen'
import { db } from '$lib/server/db'
import { session } from '$lib/server/db/schema'
import { sql } from 'drizzle-orm'
import type { CookieSerializeOptions } from 'cookie'

interface SessionResponse {
  user: User
  sessionId: string
  cookie?: CookieSerializeOptions
}

export const getSession = async (sessionId: string): Promise<User | null> => {
  const dbSession = await db.query.session.findFirst({
    columns: { id: true, name: true, createdAt: true },
    where: sql`${session.sessionId} = ${sessionId}`,
  })
  if (!dbSession) {
    return null
  }
  return {
    id: dbSession.id,
    name: dbSession.name,
    createdAt: dbSession.createdAt,
  }
}

export const getOrCreateSession = async (sessionId?: string): Promise<SessionResponse> => {
  const createSession = async (): Promise<SessionResponse> => {
    const sessionId = generateID()
    const res = await db
      .insert(session)
      .values({
        sessionId: sessionId,
      })
      .returning({ id: session.id, createdAt: session.createdAt })
    if (res.length !== 1) {
      throw new Error(`got ${res.length} session IDs back`)
    }

    return {
      user: {
        id: res[0].id,
        name: null,
        createdAt: res[0].createdAt,
      },
      cookie: {
        path: '/',
        httpOnly: true,
        secure: true,
        maxAge: 60 * 60 * 24 * 365,
      },
      sessionId,
    }
  }
  if (!sessionId) {
    return await createSession()
  }

  const user = await getSession(sessionId)
  if (!user) {
    return await createSession()
  }

  // No cookie needed, they already have one.
  return { user, sessionId }
}
