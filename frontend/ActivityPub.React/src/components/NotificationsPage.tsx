import { useNotifications, useReadNotifications, type MisskeyNotification } from "@/features/notifications/useNotifications"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Bell, Heart, Repeat2, AtSign, UserPlus } from "lucide-react"

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    const diff = Date.now() - d.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "now"
    if (mins < 60) return `${mins}m`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d`
    return d.toLocaleDateString()
  } catch {
    return iso
  }
}

function NotificationIcon({ type }: { type: string }) {
  const cls = "w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs"
  switch (type) {
    case "follow":
      return <span className={`${cls} bg-[#55ACEE]`}><UserPlus size={14} /></span>
    case "mention":
    case "reply":
      return <span className={`${cls} bg-[#19CF86]`}><AtSign size={14} /></span>
    case "reaction":
      return <span className={`${cls} bg-[#E0245E]`}><Heart size={14} /></span>
    case "renote":
      return <span className={`${cls} bg-[#19CF86]`}><Repeat2 size={14} /></span>
    case "pollEnded":
      return <span className={`${cls} bg-[#FFAD1F]`}>◉</span>
    default:
      return <span className={`${cls} bg-[#66757F]`}><Bell size={14} /></span>
  }
}

function notificationText(n: MisskeyNotification): string {
  const name = n.user?.name ?? n.user?.username ?? "Someone"
  const username = n.user?.username ?? "unknown"
  switch (n.type) {
    case "follow":
      return `${name} (@${username}) followed you`
    case "mention":
    case "reply":
      return `${name} mentioned you${n.note?.text ? `: “${String(n.note.text).slice(0, 80)}”` : ""}`
    case "reaction":
      return `${name} reacted ${n.reaction ?? "❤️"} to your note${n.note?.text ? `: “${String(n.note.text).slice(0, 60)}”` : ""}`
    case "renote":
      return `${name} renoted your note${n.note?.text ? `: “${String(n.note.text).slice(0, 60)}”` : ""}`
    case "pollEnded":
      return `Poll ended${n.note?.text ? `: “${String(n.note.text).slice(0, 60)}”` : ""}`
    default:
      return `${name} — ${n.type}${n.note?.text ? `: “${String(n.note.text).slice(0,60)}”` : ""}`
  }
}

function NotificationRow({ n }: { n: MisskeyNotification }) {
  const avatar = n.user?.avatarUrl ?? `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(n.user?.username ?? "unknown")}`
  const name = n.user?.name ?? n.user?.username ?? "Unknown"
  const handle = n.user?.username ? `@${n.user.username}${n.user.host ? `@${n.user.host}` : ""}` : ""
  return (
    <div
      className={`flex gap-3 p-4 hover:bg-accent/30 transition-colors border-b last:border-0 ${!n.isRead ? "bg-[#E8F5FD]/60 dark:bg-[#55ACEE]/10" : ""}`}
      data-testid="notification-item"
      data-notification-id={n.id}
      data-notification-type={n.type}
    >
      <div className="relative shrink-0">
        <Avatar className="w-10 h-10 rounded-[12px_6px_16px_6px]">
          <AvatarImage src={avatar} alt={name} />
          <AvatarFallback>{(name[0] ?? "U").toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="absolute -bottom-1 -right-1">
          <NotificationIcon type={n.type} />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm leading-5 break-words">
          <span className="font-bold">{name}</span> <span className="text-muted-foreground text-xs">{handle}</span>
          <div className="mt-0.5 text-[14px] text-[#292F33] dark:text-[#E1E8ED]">{notificationText(n)}</div>
        </div>
        {n.note?.text && n.type !== "mention" && n.type !== "reply" && n.type !== "reaction" && n.type !== "renote" ? null : null}
        <div className="mt-1 text-xs text-muted-foreground flex items-center gap-2">
          <span data-testid="notification-time">{formatTime(n.createdAt)}</span>
          {!n.isRead && <span className="w-2 h-2 rounded-full bg-[#55ACEE] inline-block" aria-label="unread" />}
          <span className="capitalize text-[11px] px-1.5 py-0.5 rounded-full bg-muted border">{n.type}</span>
        </div>
      </div>
    </div>
  )
}

export function NotificationsPage() {
  const { data, isLoading, isError, error, refetch } = useNotifications({ limit: 20 })
  const markAll = useReadNotifications()

  const notifications = data ?? []
  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <div className="min-w-0" data-testid="notifications-page">
      <Card className="alien-card overflow-hidden m-0 rounded-none border-x-0 border-t-0 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b bg-white dark:bg-[#0F1A24]">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell size={18} className="text-[#55ACEE]" /> Notifications
            {unreadCount > 0 && (
              <span className="ml-1 bg-[#55ACEE] text-white text-xs font-bold px-2 py-0.5 rounded-full" data-testid="notifications-unread-count">
                {unreadCount}
              </span>
            )}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending || unreadCount === 0}
            className="rounded-full border-[#55ACEE] text-[#55ACEE] hover:bg-[#55ACEE] hover:text-white text-xs h-7"
            data-testid="mark-all-as-read"
          >
            {markAll.isPending ? "Marking…" : "Mark all as read"}
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y" data-testid="notifications-loading">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 flex gap-3">
                  <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="p-8 text-center text-sm text-muted-foreground" data-testid="notifications-error">
              <div className="text-red-600 mb-2">Failed to load notifications</div>
              <div className="text-xs mb-3">{(error as Error)?.message ?? "Unknown error"}</div>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="rounded-full">Retry</Button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground" data-testid="empty-notifications">
              <div className="mx-auto w-12 h-12 rounded-full bg-[#E8F5FD] dark:bg-[#0F1A24] flex items-center justify-center mb-3">
                <Bell size={20} className="text-[#55ACEE]" />
              </div>
              <div className="font-medium">No notifications yet</div>
              <div className="text-xs mt-1">When someone follows, mentions, reacts or renotes, you&apos;ll see it here.</div>
            </div>
          ) : (
            <div className="divide-y" data-testid="notifications-list">
              {notifications.map((n) => (
                <NotificationRow key={n.id} n={n} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <div className="p-3 text-xs text-muted-foreground text-center border-t bg-[#F5F8FA] dark:bg-[#0A1118]">
        Polling every 15s • <span className="text-[#55ACEE]">Streaming via /streaming when available</span>
      </div>
    </div>
  )
}

export default NotificationsPage
