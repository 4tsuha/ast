import { Search, Bell, Home, User, Feather, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useNotifications } from "@/features/notifications/useNotifications"
import { useSessionStore } from "@/lib/sessionStore"
import { useCallback } from "react"

export function TopNav() {
  const { data } = useNotifications({ limit: 20 })
  const session = useSessionStore((s) => s.session)
  const isAuthed = !!session?.authenticated

  const unreadCount = Array.isArray(data) ? data.filter((n) => !n.isRead).length : 0

  const handleLogout = useCallback(async () => {
    const csrf = session?.csrf
    const baseHeaders: Record<string, string> = {
      "X-ActivityPub-Frontend": "1",
    }
    if (csrf?.headerName && csrf?.requestToken) {
      baseHeaders[csrf.headerName] = csrf.requestToken
      baseHeaders["X-CSRF-TOKEN"] = csrf.requestToken
      baseHeaders["X-CSRF-Token"] = csrf.requestToken
    }

    // Try POST to /auth/logout (real endpoint) and fallback to /api/logout
    try {
      const formBody = ""
      const headersForm: Record<string, string> = {
        ...baseHeaders,
        "Content-Type": "application/x-www-form-urlencoded",
      }
      let res = await fetch("/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: headersForm,
        body: formBody,
      })
      if (!res.ok) {
        // try /api/logout with json
        const headersJson: Record<string, string> = {
          ...baseHeaders,
          "Content-Type": "application/json",
        }
        res = await fetch("/api/logout", {
          method: "POST",
          credentials: "include",
          headers: headersJson,
          body: JSON.stringify({}),
        })
      }
      // also try misskey-style? no-op
      if (!res.ok) {
        // try clearing via fetch to /api/frontend/session? not needed
      }
    } catch {
      // ignore network errors
    } finally {
      // clear cookies client-side and reload
      try {
        document.cookie.split(";").forEach((c) => {
          const eq = c.indexOf("=")
          const name = eq > -1 ? c.slice(0, eq).trim() : c.trim()
          if (name) {
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`
          }
        })
      } catch {}
      try {
        useSessionStore.getState().clear()
      } catch {}
      window.location.reload()
    }
  }, [session])

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white dark:bg-[#0F1A24] dark:border-[#2A3A4A] backdrop-blur supports-[backdrop-filter]:bg-white/95">
      <div className="mx-auto flex h-[46px] max-w-[1190px] items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-[#55ACEE] font-bold text-xl tracking-tight">
            <span className="w-7 h-7 rounded-full bg-[#55ACEE] flex items-center justify-center text-white text-sm biolume">◉</span>
            <span className="hidden sm:inline">twtr.</span>
          </div>
          <nav className="hidden md:flex items-center gap-1 text-sm">
            <a
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-accent font-medium text-primary border-b-2 border-primary"
            >
              <Home size={18} /> Home
            </a>
            <a
              href="/notifications"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-accent text-muted-foreground relative"
              data-testid="nav-notifications"
            >
              <Bell size={18} /> Notifications
              {isAuthed && unreadCount > 0 && (
                <span
                  className="ml-1 bg-[#E0245E] text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none"
                  data-testid="notification-badge"
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </a>
            <a
              href="/profile"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-accent text-muted-foreground"
            >
              <User size={18} /> Me
            </a>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#66757F]" />
            <input
              placeholder="Search"
              className="w-[205px] h-8 rounded-full bg-[#F5F8FA] dark:bg-[#0A1118] border border-[#E1E8ED] dark:border-[#2A3A4A] pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>
          <Button className="rounded-full bg-[#55ACEE] hover:bg-[#2795E9] text-white font-bold px-5 h-8 alien-card">
            <Feather size={14} /> Tweet
          </Button>
          <Avatar className="w-8 h-8">
            <AvatarImage src="https://api.dicebear.com/7.x/initials/svg?seed=N" />
            <AvatarFallback>N</AvatarFallback>
          </Avatar>
          {isAuthed ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="rounded-full h-8 px-3 text-muted-foreground hover:text-[#E0245E] hover:bg-[#E0245E]/10 border border-transparent hover:border-[#E0245E]/20"
              data-testid="logout-button"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut size={14} /> <span className="hidden sm:inline">Logout</span>
            </Button>
          ) : (
            <a
              href="/"
              className="text-xs font-bold text-[#55ACEE] hover:underline hidden sm:inline"
              data-testid="login-link"
            >
              Sign in
            </a>
          )}
          {/* mobile notification shortcut */}
          <a
            href="/notifications"
            className="md:hidden relative p-2 rounded-full hover:bg-accent"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {isAuthed && unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-[#E0245E] text-white text-[10px] font-bold px-1 rounded-full min-w-[16px] text-center" data-testid="notification-badge-mobile">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </a>
        </div>
      </div>
    </header>
  )
}
