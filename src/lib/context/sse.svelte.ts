import { getContext, setContext } from 'svelte'
import type { UserJoinedEvent, UserEvent } from '../../boomberg'

export type OnUserJoinedEventListener = (ev: UserJoinedEvent) => void

export class SSE {
  es: EventSource

  _onUserJoined: OnUserJoinedEventListener[] = []

  constructor() {
    this.es = new EventSource('/api/events')
    this.es.onopen = (e: Event) => {
      console.log('connected!', e)
    }
    this.es.onerror = (e: Event) => {
      console.log('error!', e)
    }
    this.es.addEventListener('data', (e: MessageEvent) => {
      if (typeof e.data !== 'string') {
        console.log('data was not a string', e.data)
        return
      }
      const data = JSON.parse(e.data) as UserEvent
      switch (data.type) {
        case 'userJoined':
          for (const fn of this._onUserJoined) {
            fn(data)
          }
      }
    })
  }

  onUserJoined(l: OnUserJoinedEventListener): () => void {
    this._onUserJoined.push(l)
    return () => {
      const idx = this._onUserJoined?.findIndex((fn) => fn === l)
      if (idx !== -1) {
        this._onUserJoined.splice(idx, 1)
      }
    }
  }
}

export const connectSSE = () => {
  const sse = new SSE()
  setContext('sse', sse)
}

export const getSSE = (): SSE => {
  return getContext('sse') as SSE
}
