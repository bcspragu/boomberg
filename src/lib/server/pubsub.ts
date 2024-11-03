import { EventEmitter } from 'events'
import { db } from '$lib/server/db'
import { eq } from 'drizzle-orm'
import { gameParticipant, session } from '$lib/server/db/schema'
import type { UserEvent } from '../../boomberg'

type namespaced<TKey, TPrefix extends string> = TKey extends string ? `${TPrefix}:${TKey}` : never

type UserChannel = namespaced<string, 'user'>

interface UserJoinedEvent {
  type: 'userJoined'
}

type EmitEvent = UserJoinedEvent

class PubSub extends EventEmitter {
  on(event: UserChannel, listener: (msg: UserEvent) => void): this {
    return super.on(event, listener)
  }

  off(event: UserChannel, listener: (msg: UserEvent) => void): this {
    return super.off(event, listener)
  }

  emit(event: UserChannel, msg: UserEvent): boolean {
    return super.emit(event, msg)
  }

  private async userJoinedEvent(gameId: number): Promise<UserEvent> {
    const users = await db
      .select({ id: gameParticipant.userId, name: session.name })
      .from(gameParticipant)
      .innerJoin(session, eq(gameParticipant.userId, session.id))
      .where(eq(gameParticipant.gameId, gameId))
    return {
      type: 'userJoined',
      users: users.map((u) => ({ id: u.id, name: u.name ?? `trader${u.id}` })),
    }
  }

  private async toUserEvent(gameId: number, msg: EmitEvent): Promise<UserEvent> {
    // We opt to look this information up here, because that's better than
    // looking it up N times on the other end in /api/events.
    switch (msg.type) {
      case 'userJoined':
        return await this.userJoinedEvent(gameId)
    }
  }

  async emitToGame(gameId: number, emitMsg: EmitEvent) {
    // Lookup users in the game
    const users = await db
      .select({ id: gameParticipant.userId })
      .from(gameParticipant)
      .where(eq(gameParticipant.gameId, gameId))

    const userMsg = await this.toUserEvent(gameId, emitMsg)

    for (const user of users) {
      this.emit(userChannel(user.id), userMsg)
    }
  }

  async emitToUser(gameId: number, userId: number, emitMsg: EmitEvent) {
    const userMsg = await this.toUserEvent(gameId, emitMsg)
    this.emit(userChannel(userId), userMsg)
  }
}

export const userChannel = (id: number): UserChannel => `user:${id}`

export const pubsub = new PubSub()
