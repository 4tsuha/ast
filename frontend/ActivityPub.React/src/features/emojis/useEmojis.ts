import { useQuery } from "@tanstack/react-query"

export type Emoji = { name: string; url: string; category?: string | null; host?: string | null; aliases?: string[] }

export function useEmojis() {
  return useQuery({
    queryKey: ["emojis"],
    queryFn: async () => {
      try {
        const r = await fetch("/api/emojis", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) })
        if (r.ok) {
          const j = await r.json()
          if (Array.isArray(j.emojis)) return j.emojis as Emoji[]
          if (Array.isArray(j)) return j as Emoji[]
        }
      } catch {}
      try {
        const r = await fetch("/api/meta", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) })
        if (r.ok) {
          const j = await r.json()
          if (Array.isArray(j.emojis)) return j.emojis as Emoji[]
        }
      } catch {}
      return [] as Emoji[]
    },
    staleTime: 1000 * 60 * 5,
  })
}
