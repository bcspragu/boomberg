import type { RequestHandler } from './$types'
import { pubsub, userChannel } from '$lib/server/pubsub'
import type { UserEvent } from '../../../boomberg'

class EventSender {
  encoder = new TextEncoder()
  controller: ReadableStreamDefaultController<string>

  constructor(controller: ReadableStreamDefaultController<string>) {
    this.controller = controller
  }

  send(stream: ReadableStreamDefaultController<Uint8Array>, event: 'data', data: UserEvent): void
  send(stream: ReadableStreamDefaultController<Uint8Array>, event: 'ping', data: 'ping'): void

  send(
    stream: ReadableStreamDefaultController<Uint8Array>,
    event: string,
    data: UserEvent | 'ping',
  ) {
    stream.enqueue(this.encoder.encode(`event: ${event}\n`))
    if (data === 'ping') {
      stream.enqueue(this.encoder.encode(`data: ping\n\n`))
    } else {
      // stream.enqueue(this.encoder.encode(`data: ${encodeURIComponent(JSON.stringify(data))}\n\n`))
      stream.enqueue(this.encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
    }
  }
}

export const GET: RequestHandler = async ({ locals }) => {
  let pingInterval: ReturnType<typeof setInterval> | null = null
  let onMessage: ((msg: UserEvent) => void) | null = null
  const channel = userChannel(locals.user.id)
  const stream = new ReadableStream({
    async start(controller) {
      const evts = new EventSender(controller)
      const ping = () => evts.send(controller, 'ping', 'ping')
      onMessage = (msg: UserEvent) => evts.send(controller, 'data', msg)
      pubsub.on(channel, onMessage)
      // Send a ping every 20 seconds
      pingInterval = setInterval(ping, 20000)

      // Send a hello ping
      ping()
    },
    cancel() {
      if (onMessage) {
        pubsub.off(channel, onMessage)
      }
      if (pingInterval) {
        clearInterval(pingInterval)
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
