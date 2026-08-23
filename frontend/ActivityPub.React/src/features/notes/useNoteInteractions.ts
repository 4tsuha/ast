import { useCallback } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { misskeyPost } from "@/lib/api"

type LikeVariables = { noteId: string; isLiked: boolean }
type RenoteVariables = { noteId: string; isRenoted: boolean }

type TimelineInfiniteData = {
  pages: unknown[][]
  pageParams: unknown[]
}

type NoteLike = {
  id: string
  myReaction?: string | null
  reactions?: Record<string, number>
  reactionEmojis?: Record<string, string>
  likes?: number
  renoteCount?: number
  repliesCount?: number
  renoteId?: string | null
  [key: string]: unknown
}

function isInfiniteData(data: unknown): data is TimelineInfiniteData {
  return (
    typeof data === "object" &&
    data !== null &&
    "pages" in data &&
    Array.isArray((data as TimelineInfiniteData).pages)
  )
}

function updateNoteLike(note: NoteLike, isLiked: boolean): NoteLike {
  const newLiked = !isLiked
  const reactions: Record<string, number> = { ...(note.reactions ?? {}) }
  // default reaction key is "❤️" ; also handle variants
  const key = "❤️"
  const current = reactions[key] ?? 0
  if (newLiked) {
    reactions[key] = current + 1
  } else {
    const next = Math.max(0, current - 1)
    if (next === 0) delete reactions[key]
    else reactions[key] = next
  }
  // also support legacy unicode variation
  const likes = typeof note.likes === "number" ? (newLiked ? note.likes + 1 : Math.max(0, note.likes - 1)) : undefined
  return {
    ...note,
    myReaction: newLiked ? "❤️" : null,
    reactions,
    ...(likes !== undefined ? { likes } : {}),
  }
}

function updateNoteRenote(note: NoteLike, isRenoted: boolean): NoteLike {
  const newRenoted = !isRenoted
  const count = typeof note.renoteCount === "number" ? note.renoteCount : typeof note.retweets === "number" ? (note.retweets as number) : 0
  const nextCount = newRenoted ? count + 1 : Math.max(0, count - 1)
  return {
    ...note,
    renoteCount: nextCount,
    retweets: nextCount,
    // stash flag for UI if needed
    isRenoted: newRenoted,
  } as NoteLike
}

/**
 * Optimistically updates all ["timeline"] queries (infinite) for a given noteId.
 * Handles both infinite (pages) and plain array cache shapes.
 */
function applyTimelineOptimistic(
  qc: ReturnType<typeof useQueryClient>,
  noteId: string,
  updater: (note: NoteLike) => NoteLike,
): Map<unknown, unknown> {
  const previous = new Map<unknown, unknown>()
  const queries = qc.getQueriesData({ queryKey: ["timeline"] })
  for (const [queryKey, data] of queries) {
    previous.set(queryKey, data)
    if (!data) continue
    if (isInfiniteData(data)) {
      const next: TimelineInfiniteData = {
        ...data,
        pages: data.pages.map((page) =>
          (page as NoteLike[]).map((note) => (note.id === noteId ? updater(note) : note)),
        ),
      }
      qc.setQueryData(queryKey, next)
    } else if (Array.isArray(data)) {
      const next = (data as NoteLike[]).map((note) => (note.id === noteId ? updater(note) : note))
      qc.setQueryData(queryKey, next)
    } else if (typeof data === "object" && data !== null && "id" in data) {
      const note = data as NoteLike
      if (note.id === noteId) {
        qc.setQueryData(queryKey, updater(note))
      }
    }
  }
  return previous
}

function restoreQueries(
  qc: ReturnType<typeof useQueryClient>,
  previous: Map<unknown, unknown>,
) {
  for (const [key, data] of previous) {
    qc.setQueryData(key as readonly unknown[], data)
  }
}

/**
 * Hook for like/unlike with optimistic updates.
 * POST /api/notes/reactions/create { noteId, reaction: "❤️" } + POST /api/notes/reactions/delete { noteId }
 * Uses misskeyPost which handles CSRF and X-ActivityPub-Frontend.
 * vercel best practices: useCallback for stable handlers, proper invalidate onSettled.
 */
export function useLike() {
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({ noteId, isLiked }: LikeVariables) => {
      if (isLiked) {
        return misskeyPost("/notes/reactions/delete", { noteId })
      }
      return misskeyPost("/notes/reactions/create", { noteId, reaction: "❤️" })
    },
    onMutate: async ({ noteId, isLiked }) => {
      await qc.cancelQueries({ queryKey: ["timeline"] })
      const previous = applyTimelineOptimistic(qc, noteId, (note) => updateNoteLike(note, isLiked))
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        restoreQueries(qc, context.previous as Map<unknown, unknown>)
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["timeline"] })
    },
  })

  const toggleLike = useCallback(
    (vars: LikeVariables) => mutation.mutate(vars),
    [mutation],
  )

  const toggleLikeAsync = useCallback(
    (vars: LikeVariables) => mutation.mutateAsync(vars),
    [mutation],
  )

  return {
    ...mutation,
    toggleLike,
    toggleLikeAsync,
    mutateLike: mutation.mutate,
    mutateAsyncLike: mutation.mutateAsync,
  }
}

/**
 * Hook for renote/unrenote with optimistic updates.
 * POST /api/notes/create { renoteId: noteId } + POST /api/notes/delete { noteId }
 * For undo, backend's DeleteNote handles Announce vs Post; we send original noteId for delete.
 * vercel best-practices: stable callbacks, cancel + optimistic + rollback + invalidate.
 */
export function useRenote() {
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({ noteId, isRenoted }: RenoteVariables) => {
      if (isRenoted) {
        // undo renote: delete the renote (backend will resolve Announce)
        return misskeyPost("/notes/delete", { noteId })
      }
      return misskeyPost("/notes/create", { renoteId: noteId })
    },
    onMutate: async ({ noteId, isRenoted }) => {
      await qc.cancelQueries({ queryKey: ["timeline"] })
      const previous = applyTimelineOptimistic(qc, noteId, (note) => updateNoteRenote(note, isRenoted))
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        restoreQueries(qc, context.previous as Map<unknown, unknown>)
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["timeline"] })
    },
  })

  const toggleRenote = useCallback(
    (vars: RenoteVariables) => mutation.mutate(vars),
    [mutation],
  )

  const toggleRenoteAsync = useCallback(
    (vars: RenoteVariables) => mutation.mutateAsync(vars),
    [mutation],
  )

  return {
    ...mutation,
    toggleRenote,
    toggleRenoteAsync,
    mutateRenote: mutation.mutate,
    mutateAsyncRenote: mutation.mutateAsync,
  }
}

// Convenience combined hook (optional)
export function useNoteInteractions() {
  const like = useLike()
  const renote = useRenote()
  return { like, renote }
}

export default useLike
