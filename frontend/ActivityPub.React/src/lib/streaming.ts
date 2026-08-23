import { QueryClient } from "@tanstack/react-query"

export type StreamingMessage = {
  type: string
  body: unknown
}

export type HomeTimelineHandler = {
  onNote?: (note: unknown) => void
  onError?: (e: Event) => void
}

function getStreamingUrl(): string {
  if (typeof window === "undefined") return ""
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
  // streamingBase is "/streaming" – keep consistent with src/lib/api.ts
  return `${protocol}//${window.location.host}/streaming`
}

export interface StreamingConnection {
  close: () => void
  socket: WebSocket | null
}

/**
 * Create a raw Misskey streaming connection to /streaming and subscribe to homeTimeline.
 * Follows Misskey streaming protocol: send {type:"connect", body:{channel:"homeTimeline", id}} after open,
 * listen for {type:"channel", body:{id, type:"note", body: note}}.
 * Caller is responsible for invalidating queries or handling note.
 */
export function createHomeTimelineStream(
  handlers: HomeTimelineHandler,
  opts: { queryClient?: QueryClient; channelId?: string } = {}
): StreamingConnection {
  const channelId = opts.channelId ?? `home-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  let socket: WebSocket | null = null
  let closed = false
  let retryTimer: number | null = null
  let retryCount = 0

  const connect = () => {
    if (closed) return
    const url = getStreamingUrl()
    if (!url) return

    try {
      socket = new WebSocket(url)
    } catch {
      scheduleReconnect()
      return
    }

    socket.addEventListener("open", () => {
      retryCount = 0
      // Misskey protocol: connect to homeTimeline
      const payload = JSON.stringify({
        type: "connect",
        body: {
          channel: "homeTimeline",
          id: channelId,
        },
      })
      try {
        socket?.send(payload)
      } catch {
        // ignore
      }
    })

    socket.addEventListener("message", (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string) as { type: string; body: Record<string, unknown> }
        if (msg.type === "channel") {
          const body = msg.body as { id?: string; type?: string; body?: unknown }
          // ensure message belongs to our channel subscription
          if (body.id !== channelId) return
          if (body.type === "note") {
            handlers.onNote?.(body.body)
            // if caller passed queryClient, invalidate timeline queries directly
            if (opts.queryClient) {
              opts.queryClient.invalidateQueries({ queryKey: ["timeline"] })
            }
          }
        }
      } catch {
        // ignore malformed
      }
    })

    socket.addEventListener("error", (e) => {
      handlers.onError?.(e)
    })

    socket.addEventListener("close", () => {
      socket = null
      if (!closed) scheduleReconnect()
    })
  }

  const scheduleReconnect = () => {
    if (closed) return
    if (retryTimer !== null) return
    const delay = Math.min(1000 * 2 ** retryCount, 30000)
    retryCount += 1
    retryTimer = window.setTimeout(() => {
      retryTimer = null
      connect()
    }, delay)
  }

  connect()

  return {
    get socket() {
      return socket
    },
    close: () => {
      closed = true
      if (retryTimer !== null) {
        clearTimeout(retryTimer)
        retryTimer = null
      }
      if (socket) {
        try {
          socket.send(JSON.stringify({ type: "disconnect", body: { id: channelId } }))
        } catch {
          // ignore
        }
        try {
          socket.close()
        } catch {
          // ignore
        }
        socket = null
      }
    },
  }
}

// convenience that directly invalidates via QueryClient
export function createStreamingClient(queryClient: QueryClient): StreamingConnection {
  return createHomeTimelineStream(
    {
      onNote: () => {
        queryClient.invalidateQueries({ queryKey: ["timeline"] })
        // also specifically invalidate home timeline
        queryClient.invalidateQueries({ queryKey: ["timeline", "home"] })
      },
    },
    { queryClient }
  )
}

export { getStreamingUrl }
