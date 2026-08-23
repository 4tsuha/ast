import { useSessionStore } from "@/lib/sessionStore"

export const apiBase = "/api"
export const streamingBase = "/streaming"

export async function fetchFrontendConfig() {
  const res = await fetch("/api/frontend/config", { credentials: "include" })
  if (!res.ok) throw new Error("config failed")
  return res.json()
}
export async function fetchSession() {
  const res = await fetch("/api/frontend/session", { credentials: "include" })
  if (!res.ok) return null
  return res.json()
}

function buildCsrfHeaders(): Record<string, string> {
  const session = useSessionStore.getState().session
  const headers: Record<string, string> = {}
  if (session?.csrf?.headerName && session?.csrf?.requestToken) {
    headers[session.csrf.headerName] = session.csrf.requestToken
    headers["X-CSRF-TOKEN"] = session.csrf.requestToken
    headers["X-CSRF-Token"] = session.csrf.requestToken
  }
  headers["X-ActivityPub-Frontend"] = "1"
  return headers
}

function buildIdempotencyKey(): string {
  try {
    if (typeof crypto !== "undefined" && typeof (crypto as unknown as { randomUUID?: () => string }).randomUUID === "function") {
      return (crypto as unknown as { randomUUID: () => string }).randomUUID!()
    }
  } catch {
    // ignore
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export async function misskeyPost(path: string, body: unknown, opts: RequestInit = {}) {
  const csrfHeaders = buildCsrfHeaders()
  const needsIdempotency =
    path.includes("/notes/create") ||
    path.includes("/reactions") ||
    path.includes("/notes/delete") ||
    path.includes("/polls/vote")
  const idempotencyHeader: Record<string, string> = needsIdempotency
    ? { "Idempotency-Key": buildIdempotencyKey() }
    : {}
  const callerHeaders = (opts.headers as Record<string, string> | undefined) ?? {}
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...csrfHeaders,
    ...idempotencyHeader,
    ...callerHeaders,
  }
  const { headers: _ignoredHeaders, ...restOpts } = opts as RequestInit & { headers?: Record<string, string> }
  void _ignoredHeaders
  const res = await fetch(`${apiBase}${path}`, {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify(body),
    ...restOpts,
  } as RequestInit)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `POST ${path} failed ${res.status}`)
  }
  const ct = res.headers.get("content-type") || ""
  return ct.includes("application/json") ? res.json() : res.text()
}
