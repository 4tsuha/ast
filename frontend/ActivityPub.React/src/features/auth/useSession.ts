import { useQuery } from "@tanstack/react-query"
import { fetchSession } from "@/lib/api"
export function useSession() {
  return useQuery({ queryKey: ["session"], queryFn: fetchSession, retry: false })
}
