import { useSessionStore } from "@/lib/sessionStore"

export const apiBase = "/api"
export const streamingBase = "/streaming"

// Synchronous mirror of the latest antiforgery token. fetchSession() updates it the
// moment a session response arrives, so API calls made after a session refetch always
// use the token paired with the current antiforgery cookie — regardless of React
// effect ordering (useEffect runs after children mount).
let lastCsrf: { headerName: string; requestToken: string } | null = null

export async function fetchFrontendConfig() {
  const res = await fetch("/api/frontend/config", { credentials: "include" })
  if (!res.ok) throw new Error("config failed")
  return res.json()
}
export async function fetchSession() {
  const res = await fetch("/api/frontend/session", { credentials: "include" })
  if (!res.ok) return null
  const json = await res.json()
  if (json?.csrf) {
    lastCsrf = json.csrf
    useSessionStore.getState().setSession(json)
  }
  return json
}

function buildCsrfHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}
  if (lastCsrf?.headerName && lastCsrf?.requestToken) {
    // headerName is already "X-CSRF-TOKEN" from the backend. Adding it more than
    // once makes fetch join the values with commas, which fails antiforgery
    // validation (400). Add exactly one header.
    headers[lastCsrf.headerName] = lastCsrf.requestToken
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
