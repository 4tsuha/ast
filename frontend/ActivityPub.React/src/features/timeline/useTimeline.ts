import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect } from "react"
import { misskeyPost } from "@/lib/api"
import { createHomeTimelineStream } from "@/lib/streaming"

type TimelineType = "home" | "local" | "global"

export type NoteVisibility = "public" | "home" | "followers" | "specified"

export type CreateNoteParams = {
  text: string
  visibility?: NoteVisibility
  cw?: string | null
  localOnly?: boolean
  visibleUserIds?: string[]
}

export type TimelineNote = {
  id: string
  text?: string | null
  cw?: string | null
  createdAt: string
  user: {
    id?: string
    name?: string | null
    username: string
    avatarUrl?: string | null
    host?: string | null
  }
  myReaction?: string | null
  reactions?: Record<string, number>
  reactionEmojis?: Record<string, string>
  renoteCount?: number
  repliesCount?: number
  likes?: number
  retweets?: number
  renoteId?: string | null
  replyId?: string | null
  visibility?: NoteVisibility
  localOnly?: boolean
  // allow extra fields from Misskey projection
  [key: string]: unknown
}

export function useTimeline(type: TimelineType) {
  return useInfiniteQuery<TimelineNote[]>({
    queryKey: ["timeline", type],
    queryFn: async ({ pageParam }: { pageParam: unknown }) => {
      const untilId = pageParam as string | undefined
      const path =
        type === "home"
          ? "/notes/timeline"
          : type === "local"
            ? "/notes/local-timeline"
            : "/notes/global-timeline"
      const body: Record<string, unknown> = { limit: 20 }
      if (untilId) body.untilId = untilId
      try {
        const res = (await misskeyPost(path, body)) as unknown[]
        // ensure myReaction field normalized (null if missing) for optimistic updates
        return (res as TimelineNote[]).map((n) => ({
          ...n,
          myReaction: (n as TimelineNote).myReaction ?? null,
          reactions: (n as TimelineNote).reactions ?? {},
          renoteCount: (n as TimelineNote).renoteCount ?? 0,
        }))
      } catch {
        // fallback mock for dev without backend — includes myReaction for consistent shape
        return [
          {
            id: "mock1",
            text: "Hello from alien timeline 👽 #ActivityPub",
            cw: null,
            user: { name: "naya1115", username: "naya1115", avatarUrl: "" },
            createdAt: new Date().toISOString(),
            myReaction: null,
            reactions: {},
            renoteCount: 0,
            repliesCount: 0,
          },
          {
            id: "mock2",
            text: "Twitter 2014 modernized discrete alien form ✨ @haganejp #離形",
            cw: null,
            user: { name: "haganejp", username: "haganejp", avatarUrl: "" },
            createdAt: new Date().toISOString(),
            myReaction: null,
            reactions: {},
            renoteCount: 0,
            repliesCount: 0,
          },
        ] as TimelineNote[]
      }
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: TimelineNote[]) =>
      lastPage?.length ? (lastPage[lastPage.length - 1] as TimelineNote).id : undefined,
  })
}

export function useCreateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (params: string | CreateNoteParams) => {
      if (typeof params === "string") {
        // backward compat: plain text
        return misskeyPost("/notes/create", { text: params })
      }
      const body: Record<string, unknown> = {
        text: params.text,
        visibility: params.visibility ?? "public",
        cw: params.cw ?? null,
        localOnly: params.localOnly ?? false,
      }
      // only include visibleUserIds when visibility is specified and provided
      if (params.visibility === "specified" && params.visibleUserIds) {
        body.visibleUserIds = params.visibleUserIds
      }
      // remove empty cw string -> null for Misskey compat
      if (body.cw === "" || body.cw === undefined) body.cw = null
      return misskeyPost("/notes/create", body)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["timeline"] }),
  })
}

/**
 * Subscribes to homeTimeline streaming channel and invalidates timeline queries on new notes.
 * Uses WebSocket at /streaming, follows Misskey streaming protocol.
 * Handles cleanup, reconnection is delegated to streaming lib.
 * vercel best practices: stable callback, proper deps, no unnecessary rerenders.
 */
export function useStreaming(enabled = true) {
  const qc = useQueryClient()

  const handleNote = useCallback(
    (_note?: unknown) => {
      // invalidate all timeline variants; keep homeTimeline most recent
      qc.invalidateQueries({ queryKey: ["timeline"] })
    },
    [qc]
  )

  useEffect(() => {
    if (!enabled) return
    if (typeof window === "undefined") return

    const connection = createHomeTimelineStream(
      {
        onNote: handleNote,
      },
      { queryClient: qc }
    )

    return () => {
      connection.close()
    }
  }, [enabled, handleNote, qc])
}
