import { useQuery } from "@tanstack/react-query"
import { misskeyPost } from "@/lib/api"

export function useUserSearch(query: string, enabled: boolean) {
  return useQuery({
    queryKey: ["search", "users", query],
    queryFn: async () => {
      if (!query) return []
      try {
        const res = await misskeyPost("/users/search", { query, limit: 10 })
        return res as any[]
      } catch {
        return []
      }
    },
    enabled: enabled && query.length > 1,
  })
}
export function useHashtagSearch(query: string, enabled: boolean) {
  return useQuery({
    queryKey: ["search", "hashtags", query],
    queryFn: async () => {
      if (!query) return []
      try {
        const res = await misskeyPost("/hashtags/search", { query, limit: 10 })
        return res as any[]
      } catch {
        return []
      }
    },
    enabled: enabled && query.length > 1,
  })
}
