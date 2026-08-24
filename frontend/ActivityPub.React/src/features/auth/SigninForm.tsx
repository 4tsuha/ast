import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { useSessionStore } from "@/lib/sessionStore"

export function SigninForm({ onSuccess }: { onSuccess?: () => void }) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [token, setToken] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [need2fa, setNeed2fa] = useState(false)
  const [loading, setLoading] = useState(false)
  const qc = useQueryClient()
  const { session } = useSessionStore()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const headers: Record<string,string> = { "Content-Type": "application/json", "X-ActivityPub-Frontend": "1" }
      if (session?.csrf) headers[session.csrf.headerName] = session.csrf.requestToken
      const body: any = { username, password }
      if (token) body.token = token
      const res = await fetch("/api/signin", { method: "POST", credentials: "include", headers, body: JSON.stringify(body) })
      const text = await res.text()
      let json: any = null
      try { json = JSON.parse(text) } catch {}
      if (res.ok) {
        // backend returns {status:"succeeded"} for frontend, or {id,i} for native - both set cookie.
        // Invalidate so SessionGate refetches /api/frontend/session exactly once and stores
        // the fresh antiforgery token. Do NOT fetch session again here: each GET session call
        // rotates the antiforgery cookie, which can desync tokens from concurrent API calls.
        qc.invalidateQueries({ queryKey: ["session"] })
        onSuccess?.()
        return
      }
      // handle misskey error codes
      const code = json?.error?.code || json?.code || text
      if (code?.includes("two-factor") || code?.includes("TWO_FACTOR") || res.status === 401 && !token) {
        setNeed2fa(true)
        setError("Two-factor token required")
      } else if (code?.includes("suspended")) {
        setError("Account suspended")
      } else if (code?.includes("locked")) {
        setError("Account locked — try later")
      } else {
        setError(json?.error?.message || code || "Signin failed")
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-sm mx-auto alien-card" data-testid="signin-form">
      <CardHeader><CardTitle className="text-center">Sign in — twtr.</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" value={username} onChange={e=>setUsername(e.target.value)} placeholder="naya1115" required autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={12} maxLength={1024} autoComplete="current-password" />
          </div>
          {need2fa && (
            <div className="space-y-2">
              <Label htmlFor="token">2FA Token</Label>
              <Input id="token" value={token} onChange={e=>setToken(e.target.value)} placeholder="123456" />
            </div>
          )}
          {error && <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950 p-2 rounded" data-testid="signin-error">{error}</div>}
          <Button type="submit" disabled={loading} className="w-full rounded-full bg-[#55ACEE] hover:bg-[#2795E9] font-bold alien-card">
            {loading ? "Signing in…" : "Sign in"}
          </Button>
          <div className="text-xs text-muted-foreground text-center">HttpOnly Cookie + CSRF protected</div>
        </form>
      </CardContent>
    </Card>
  )
}
