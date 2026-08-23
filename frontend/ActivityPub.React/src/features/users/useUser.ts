import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { misskeyPost } from "@/lib/api"

export type MisskeyUser = {
  id: string
  name?: string | null
  username: string
  host?: string | null
  avatarUrl?: string | null
  bannerUrl?: string | null
  description?: string | null
  followersCount?: number
  followingCount?: number
  notesCount?: number
  isFollowing?: boolean
  isFollowed?: boolean
  isLocked?: boolean
  createdAt?: string
  [key: string]: unknown
}

export type Relationship = {
  id: string
  isFollowing: boolean
  hasPendingFollowRequestFromYou?: boolean
  hasPendingFollowRequestToYou?: boolean
  isFollowed?: boolean
  isBlocking?: boolean
  isBlocked?: boolean
  isMuted?: boolean
  [key: string]: unknown
}

/**
 * Fetch a user via POST /api/users/show { userId }.
 * Supports userId being external Misskey id.
 * Enabled only when userId is present.
 */
export function useUser(userId: string | undefined) {
  return useQuery<MisskeyUser>({
    queryKey: ["user", userId],
    queryFn: async () => {
      if (!userId) throw new Error("userId required")
      // Misskey expects { userId } – also handle username fallback if looks like username
      const body: Record<string, unknown> = { userId }
      const res = (await misskeyPost("/users/show", body)) as MisskeyUser
      return res
    },
    enabled: !!userId,
    staleTime: 60_000,
    retry: false,
  })
}

/**
 * Fetch relationship via POST /api/users/relation { userId } or { userId: [...] }.
 * Uses array vs single handling – server returns object for single, array for array.
 * This hook normalizes to single object.
 */
export function useRelationship(userId: string | string[] | undefined) {
  const key = Array.isArray(userId) ? userId.join(",") : userId
  const isArray = Array.isArray(userId)
  return useQuery<Relationship | Relationship[]>({
    queryKey: ["relationship", key],
    queryFn: async () => {
      if (!userId) throw new Error("userId required")
      const body = { userId }
      const res = await misskeyPost("/users/relation", body)
      return res as Relationship | Relationship[]
    },
    enabled: !!userId && (isArray ? (userId as string[]).length > 0 : true),
    staleTime: 30_000,
    retry: false,
  })
}

/**
 * Follow a user – POST /api/following/create { userId }
 * Optimistically updates relationship cache to isFollowing:true
 */
export function useFollow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: { userId: string }) => {
      return (await misskeyPost("/following/create", { userId: vars.userId })) as unknown
    },
    onMutate: async (vars) => {
      const userId = vars.userId
      await qc.cancelQueries({ queryKey: ["relationship"] })
      // snapshot previous values for all matching keys
      const previous = new Map<unknown, unknown>()
      const queries = qc.getQueriesData({ queryKey: ["relationship"] })
      for (const [key, data] of queries) {
        // only update if key contains userId
        const keyStr = JSON.stringify(key)
        if (keyStr.includes(userId)) {
          previous.set(key, data)
          if (data && typeof data === "object" && !Array.isArray(data) && "isFollowing" in (data as Record<string, unknown>)) {
            const next = { ...(data as Relationship), isFollowing: true }
            qc.setQueryData(key as readonly unknown[], next)
          } else if (Array.isArray(data)) {
            const next = (data as Relationship[]).map((r) => (r.id === userId ? { ...r, isFollowing: true } : r))
            qc.setQueryData(key as readonly unknown[], next)
          }
        }
      }
      // also directly set single key if not yet present
      const singleKey = ["relationship", userId] as const
      const existing = qc.getQueryData<Relationship>(singleKey)
      if (!existing) {
        // optimistic placeholder
        qc.setQueryData(singleKey, { id: userId, isFollowing: true } as Relationship)
        if (!previous.has(singleKey)) previous.set(singleKey, undefined)
      } else if (!queries.some(([k]) => JSON.stringify(k) === JSON.stringify(singleKey))) {
        previous.set(singleKey, existing)
        qc.setQueryData(singleKey, { ...existing, isFollowing: true })
      }
      return { previous }
    },
    onError: (_err, _vars, context) => {
      const ctx = context as { previous?: Map<unknown, unknown> } | undefined
      if (ctx?.previous) {
        for (const [key, data] of ctx.previous) {
          qc.setQueryData(key as readonly unknown[], data)
        }
      }
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: ["relationship", vars.userId] })
      qc.invalidateQueries({ queryKey: ["relationship"] })
      qc.invalidateQueries({ queryKey: ["user", vars.userId] })
    },
  })
}

/**
 * Unfollow a user – POST /api/following/delete { userId }
 * Optimistically updates relationship cache to isFollowing:false
 */
export function useUnfollow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: { userId: string }) => {
      return (await misskeyPost("/following/delete", { userId: vars.userId })) as unknown
    },
    onMutate: async (vars) => {
      const userId = vars.userId
      await qc.cancelQueries({ queryKey: ["relationship"] })
      const previous = new Map<unknown, unknown>()
      const queries = qc.getQueriesData({ queryKey: ["relationship"] })
      for (const [key, data] of queries) {
        const keyStr = JSON.stringify(key)
        if (keyStr.includes(userId)) {
          previous.set(key, data)
          if (data && typeof data === "object" && !Array.isArray(data) && "isFollowing" in (data as Record<string, unknown>)) {
            const next = { ...(data as Relationship), isFollowing: false }
            qc.setQueryData(key as readonly unknown[], next)
          } else if (Array.isArray(data)) {
            const next = (data as Relationship[]).map((r) => (r.id === userId ? { ...r, isFollowing: false } : r))
            qc.setQueryData(key as readonly unknown[], next)
          }
        }
      }
      const singleKey = ["relationship", userId] as const
      const existing = qc.getQueryData<Relationship>(singleKey)
      if (!existing) {
        qc.setQueryData(singleKey, { id: userId, isFollowing: false } as Relationship)
        if (!previous.has(singleKey)) previous.set(singleKey, undefined)
      } else if (!queries.some(([k]) => JSON.stringify(k) === JSON.stringify(singleKey))) {
        previous.set(singleKey, existing)
        qc.setQueryData(singleKey, { ...existing, isFollowing: false })
      }
      return { previous }
    },
    onError: (_err, _vars, context) => {
      const ctx = context as { previous?: Map<unknown, unknown> } | undefined
      if (ctx?.previous) {
        for (const [key, data] of ctx.previous) {
          qc.setQueryData(key as readonly unknown[], data)
        }
      }
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: ["relationship", vars.userId] })
      qc.invalidateQueries({ queryKey: ["relationship"] })
      qc.invalidateQueries({ queryKey: ["user", vars.userId] })
    },
  })
}

export default useUser
