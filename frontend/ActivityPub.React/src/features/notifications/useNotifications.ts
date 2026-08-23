import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { misskeyPost } from "@/lib/api"

export type NotificationType = "follow" | "mention" | "reply" | "renote" | "reaction" | "pollEnded" | "app" | string

export type MisskeyNotification = {
  id: string
  createdAt: string
  type: NotificationType
  isRead: boolean
  userId: string
  user: {
    id: string
    name?: string | null
    username: string
    host?: string | null
    avatarUrl?: string | null
    avatarColor?: string | null
    [key: string]: unknown
  }
  note?: {
    id: string
    text?: string | null
    cw?: string | null
    createdAt?: string
    user?: { username?: string; name?: string }
    [key: string]: unknown
  } | null
  reaction?: string | null
  [key: string]: unknown
}

/**
 * Fetch notifications via POST /api/i/notifications { limit, unreadOnly, markAsRead }
 * Polls every 15s and invalidates via streaming if needed.
 */
export function useNotifications(opts: { limit?: number; unreadOnly?: boolean } = {}) {
  const limit = opts.limit ?? 20
  const unreadOnly = opts.unreadOnly ?? false
  return useQuery<MisskeyNotification[]>({
    queryKey: ["notifications", { limit, unreadOnly }],
    queryFn: async () => {
      const res = (await misskeyPost("/i/notifications", {
        limit,
        unreadOnly,
        markAsRead: false,
      })) as MisskeyNotification[]
      return Array.isArray(res) ? res : []
    },
    refetchInterval: 15_000,
    refetchIntervalInBackground: true,
    staleTime: 10_000,
    retry: false,
  })
}

/**
 * Mark all notifications as read via POST /api/notifications/mark-all-as-read {}
 * Falls back to /api/i/read-all-notifications if needed (not used here).
 */
export function useReadNotifications() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      // primary endpoint per spec: POST /api/notifications/mark-all-as-read
      try {
        return await misskeyPost("/notifications/mark-all-as-read", {})
      } catch (e) {
        // fallback to /i/read-all-unread-notes? no, try alternative
        // try without prefix? misskeyPost already adds /api, so retry with i/notifications read?
        throw e
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] })
      // optimistically mark all as read in cache
      const queries = qc.getQueriesData<MisskeyNotification[]>({ queryKey: ["notifications"] })
      for (const [key, data] of queries) {
        if (Array.isArray(data)) {
          const next = data.map((n) => ({ ...n, isRead: true }))
          qc.setQueryData(key as readonly unknown[], next)
        }
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] })
    },
  })
}

/**
 * Alternative hook for polling via streaming: invalidates on WebSocket push.
 * For now we rely on polling; streaming can call qc.invalidateQueries externally.
 */
export function useNotificationsWithStreaming() {
  const query = useNotifications()
  const qc = useQueryClient()
  // streaming invalidation could be wired here via createHomeTimelineStream or notifications stream
  // Keeping simple: polling already handles; consumers can manually invalidate via qc
  return { ...query, invalidate: () => qc.invalidateQueries({ queryKey: ["notifications"] }) }
}

export default useNotifications
