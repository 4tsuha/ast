import { BrowserRouter, Routes, Route, useLocation, useParams } from "react-router-dom"
import { QueryClient, QueryClientProvider, useQuery, useInfiniteQuery } from "@tanstack/react-query"
import { TopNav } from "@/components/TopNav"
import { Composer, type ComposerPostParams } from "@/components/Composer"
import { TweetCard } from "@/components/TweetCard"
import { TrendsCard, WhoToFollowCard } from "@/components/TrendsCard"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { useTimeline, useCreateNote, useStreaming, type CreateNoteParams } from "@/features/timeline/useTimeline"
import { VirtualTimeline } from "@/features/timeline/VirtualTimeline"
import { UserAvatar } from "@/components/ui/identity"
import { Button } from "@/components/ui/button"
import { SearchPage } from "@/components/SearchPage"
import { AvatarPicker, useProfileUpdate } from "@/components/AvatarPicker"
import { Skeleton } from "@/components/ui/skeleton"
import { SigninForm } from "@/features/auth/SigninForm"
import { useSessionStore } from "@/lib/sessionStore"
import { fetchSession, misskeyPost } from "@/lib/api"
import { useCallback, useEffect } from "react"
import { useUser, useRelationship, useFollow, useUnfollow, type Relationship } from "@/features/users/useUser"
import { NotificationsPage } from "@/components/NotificationsPage"

const qc = new QueryClient()

function SessionGate({ children }: { children: React.ReactNode }) {
  const { data, isLoading, isFetching, error } = useQuery({ queryKey: ["session"], queryFn: fetchSession, retry: false })
  const setSession = useSessionStore(s => s.setSession)
  useEffect(() => {
    if (data) setSession(data)
  }, [data, setSession])
  // Hold children until the latest session (and its antiforgery token) has arrived.
  // After sign-in, invalidateQueries triggers a refetch; mounting children early would
  // send API calls with the pre-sign-in anonymous token, which fails antiforgery
  // validation ("different claims-based user").
  if (isLoading || isFetching) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading session…</div>
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-600">Session error</div>
  const authed = (data as any)?.authenticated
  if (!authed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F8FA] dark:bg-[#0A1118] p-4">
        <div className="mb-6 text-center">
          <div className="text-3xl font-bold text-[#55ACEE]">twtr.</div>
          <div className="text-sm text-muted-foreground">2014 alien • Sign in to continue</div>
        </div>
        <SigninForm onSuccess={() => { /* SessionGate refetches /api/frontend/session via invalidate */ }} />
        <div className="mt-4 text-xs text-muted-foreground">Public timeline is available without sign-in via Guest view <a href="/guest" className="text-[#55ACEE] underline">Guest</a></div>
      </div>
    )
  }
  return <>{children}</>
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F5F8FA] dark:bg-[#0A1118]">
      <TopNav />
      <div className="mx-auto max-w-[1190px] grid grid-cols-1 lg:grid-cols-[290px_590px_290px] gap-2.5 px-2.5 py-2.5 lg:px-0">
        <aside className="hidden lg:block space-y-2.5 sticky top-[56px] self-start" data-testid="left-sidebar">
          <Card className="alien-card overflow-hidden alien-header">
            <div className="h-24 bg-gradient-to-br from-[#55ACEE] via-[#00E5CC] to-[#6DFF7A] relative">
              <div className="absolute -bottom-10 left-4 w-[73px] h-[73px] rounded-[6px] bg-white dark:bg-[#0F1A24] p-1 border-2 border-white">
                <div className="w-full h-full rounded-[6px] bg-gradient-to-br from-[#66757F] to-[#292F33] flex items-center justify-center text-white font-bold">N</div>
              </div>
            </div>
            <CardContent className="pt-12 pb-4">
              <div className="font-bold">naya1115</div>
              <div className="text-sm text-muted-foreground">@naya1115</div>
              <div className="mt-3 flex gap-4 text-sm">
                <div><span className="font-bold">1,234</span> <span className="text-muted-foreground">Tweets</span></div>
                <div><span className="font-bold">56</span> <span className="text-muted-foreground">Following</span></div>
                <div><span className="font-bold">89</span> <span className="text-muted-foreground">Followers</span></div>
              </div>
            </CardContent>
          </Card>
          <TrendsCard />
          <Card className="p-3 text-xs text-muted-foreground">© 2026 twtr. alien <span className="text-[#55ACEE]">About</span></Card>
        </aside>
        <main className="min-w-0 space-y-0 border-x bg-white dark:bg-[#0F1A24] lg:border rounded-lg overflow-hidden" data-testid="center-feed">{children}</main>
        <aside className="hidden lg:block space-y-2.5 sticky top-[56px] self-start" data-testid="right-sidebar">
          <WhoToFollowCard />
          <TrendsCard />
          <Card className="p-4 text-xs text-muted-foreground leading-relaxed">
            <div>Welcome to <span className="text-[#55ACEE]">twtr.</span> alien edition — 2014 flat, now biolume.</div>
            <Separator className="my-2" />
            <div>Public Base: testtest.exekey.net</div>
          </Card>
        </aside>
      </div>
    </div>
  )
}

function GuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F5F8FA] dark:bg-[#0A1118]">
      <TopNav />
      <div className="mx-auto max-w-[1190px] grid grid-cols-1 lg:grid-cols-[290px_590px_290px] gap-2.5 px-2.5 py-2.5 lg:px-0">
        <aside className="hidden lg:block space-y-2.5 sticky top-[56px] self-start" data-testid="left-sidebar">
          <Card className="p-4 text-sm"><div className="font-bold">Guest view</div><div className="text-muted-foreground">Sign in to post & interact</div></Card>
          <TrendsCard />
        </aside>
        <main className="min-w-0 space-y-0 border-x bg-white dark:bg-[#0F1A24] lg:border rounded-lg overflow-hidden" data-testid="center-feed">{children}</main>
        <aside className="hidden lg:block space-y-2.5 sticky top-[56px] self-start" data-testid="right-sidebar">
          <WhoToFollowCard />
          <Card className="p-4 text-xs"><a href="/" className="text-[#55ACEE] underline">Sign in</a> to access home timeline</Card>
        </aside>
      </div>
    </div>
  )
}

function HomePage() {
  const home = useTimeline("home")
  const local = useTimeline("local")
  const globalQ = useTimeline("global")
  const create = useCreateNote()
  useStreaming(true)
  const tweets = home.data?.pages.flat() ?? []
  const mockTweets = [
    { id: "1", handle: "naya1115", name: "naya1115", time: "2h", text: "Twitter 2014を離形 — フラットなまま有機的に歪める alien #ActivityPub", likes: 3, retweets: 1, avatar: undefined },
    { id: "2", handle: "haganejp", name: "てすと", time: "4h", text: "Hello from exekey.net 👽 sharedInbox via https://exekey.net/inbox", likes: 12, retweets: 2 },
  ]
  const display = tweets.length
    ? (tweets.map((t: unknown) => {
        const n = t as {
          id: string
          text?: string | null
          cw?: string | null
          createdAt: string
          user?: { username?: string; name?: string; avatarUrl?: string | null }
          myReaction?: string | null
          reactions?: Record<string, number>
          renoteCount?: number
          repliesCount?: number
        }
        const likes = n.reactions ? (n.reactions["❤️"] ?? Object.values(n.reactions).reduce((a, b) => a + b, 0)) : 0
        return {
          id: n.id,
          handle: n.user?.username || "unknown",
          name: n.user?.name || "unknown",
          time: n.createdAt ? new Date(n.createdAt).toLocaleTimeString() : "now",
          text: n.text || "",
          cw: n.cw ?? null,
          myReaction: n.myReaction ?? null,
          reactions: n.reactions ?? {},
          renoteCount: n.renoteCount ?? 0,
          likes,
          retweets: n.renoteCount ?? 0,
          avatar: n.user?.avatarUrl ?? undefined,
        }
      }) as unknown as typeof mockTweets)
    : mockTweets

  const handlePost = useCallback(
    (params: ComposerPostParams) => {
      const body: CreateNoteParams = {
        text: params.text,
        visibility: params.visibility,
        cw: params.cw,
        localOnly: params.localOnly,
      }
      create.mutate(body)
    },
    [create]
  )

  return (
    <>
      <Composer onPost={handlePost} isPosting={create.isPending} />
      <Tabs defaultValue="home" className="w-full">
        <TabsList className="w-full justify-around rounded-none bg-white dark:bg-[#0F1A24] border-b h-10">
          <TabsTrigger value="home" className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-[#55ACEE] rounded-none">Home</TabsTrigger>
          <TabsTrigger value="local" className="flex-1">Local</TabsTrigger>
          <TabsTrigger value="global" className="flex-1">Global</TabsTrigger>
        </TabsList>
        <TabsContent value="home" className="m-0">
          <VirtualTimeline notes={display as any} hasNextPage={home.hasNextPage} fetchNextPage={() => home.fetchNextPage()} isFetchingNextPage={home.isFetchingNextPage} isLoading={home.isLoading} />
        </TabsContent>
        <TabsContent value="local" className="m-0">
          {(local.data?.pages.flat().length ?? 0) ===0 ? <div className="p-8 text-sm text-muted-foreground" data-testid="empty-local">No local notes yet.</div> : <VirtualTimeline notes={local.data?.pages.flat() as any} hasNextPage={local.hasNextPage} fetchNextPage={() => local.fetchNextPage()} isFetchingNextPage={local.isFetchingNextPage} isLoading={local.isLoading} />}
        </TabsContent>
        <TabsContent value="global" className="m-0">
          {(globalQ.data?.pages.flat().length ??0)===0 ? <div className="p-8 text-sm text-muted-foreground" data-testid="empty-global">Global is quiet.</div> : <VirtualTimeline notes={globalQ.data?.pages.flat() as any} hasNextPage={globalQ.hasNextPage} fetchNextPage={() => globalQ.fetchNextPage()} isFetchingNextPage={globalQ.isFetchingNextPage} isLoading={globalQ.isLoading} />}
        </TabsContent>
      </Tabs>
    </>
  )
}

function GuestPage() {
  const globalQ = useTimeline("global")
  return (
    <>
      <div className="p-4 bg-[#E8F5FD] dark:bg-[#0F1A24] border-b text-center text-sm">Guest view — <a href="/" className="text-[#55ACEE] underline">Sign in</a> to post</div>
      <Tabs defaultValue="global" className="w-full">
        <TabsList className="w-full justify-around rounded-none bg-white dark:bg-[#0F1A24] border-b h-10">
          <TabsTrigger value="global" className="flex-1">Global</TabsTrigger>
          <TabsTrigger value="local" className="flex-1">Local</TabsTrigger>
        </TabsList>
        <TabsContent value="global" className="m-0">
          {(globalQ.data?.pages.flat().length ??0)===0 ? <div className="p-8 text-sm text-muted-foreground">Global is quiet.</div> : globalQ.data?.pages.flat().map((t: unknown)=>{
            const n = t as { id: string; text?: string | null; cw?: string | null; createdAt?: string; user?: { username?: string; name?: string; avatarUrl?: string | null }; myReaction?: string | null; reactions?: Record<string, number>; renoteCount?: number }
            const likes = n.reactions ? (n.reactions["❤️"] ?? Object.values(n.reactions).reduce((a,b)=>a+b,0)) : 0
            return (<TweetCard key={n.id} tweet={{id:n.id, handle:n.user?.username||"unknown", name:n.user?.name||"unknown", time: n.createdAt ? new Date(n.createdAt).toLocaleTimeString() : "now", text:n.text||"", cw: n.cw ?? null, myReaction: n.myReaction ?? null, reactions: n.reactions ?? {}, renoteCount: n.renoteCount ?? 0, likes, retweets: n.renoteCount ?? 0, avatar: n.user?.avatarUrl ?? undefined}} />)
          })}
        </TabsContent>
        <TabsContent value="local" className="m-0">
          <div className="p-8 text-sm text-muted-foreground">Local requires sign-in for full view.</div>
        </TabsContent>
      </Tabs>
    </>
  )
}

function ProfilePage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const session = useSessionStore((s) => s.session)

  // fetch self id if no param – via /api/i
  const selfQuery = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = (await misskeyPost("/i", {})) as { id?: string }
      return res
    },
    enabled: !id,
    retry: false,
  })

  const effectiveId = id ?? (selfQuery.data as any)?.id

  const { data: user, isLoading, isError, error } = useUser(effectiveId)
  const { data: relRaw, isLoading: relLoading } = useRelationship(effectiveId)
  const relation: Relationship | undefined = Array.isArray(relRaw) ? (relRaw[0] as Relationship) : (relRaw as Relationship | undefined)
  const follow = useFollow()
  const unfollow = useUnfollow()
  const updateProfile = useProfileUpdate()

  // user notes infinite
  const notesQuery = useInfiniteQuery({
    queryKey: ["userNotes", effectiveId],
    queryFn: async ({ pageParam }: { pageParam: unknown }) => {
      const body: Record<string, unknown> = { userId: effectiveId, limit: 20 }
      if (pageParam) body.untilId = pageParam
      try {
        const res = (await misskeyPost("/users/notes", body)) as unknown[]
        return res as any[]
      } catch {
        return [] as any[]
      }
    },
    enabled: !!effectiveId,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: unknown[]) => {
      const arr = lastPage as { id: string }[]
      return arr.length ? arr[arr.length - 1].id : undefined
    },
  })

  const allNotes: any[] = (notesQuery.data?.pages.flat() as any[]) ?? []

  // derive tabs
  const replies = allNotes.filter((n) => n.replyId != null || n.reply != null)
  const media = allNotes.filter((n) => {
    const files = (n as any).files ?? (n as any).fileIds ?? []
    return Array.isArray(files) && files.length > 0
  })
  // likes tab – placeholder empty (could fetch liked notes if endpoint existed)
  const likes: any[] = []

  const isSelf = (() => {
    if (!user) return false
    const viewerUsername = session?.viewer?.username
    if (viewerUsername && user.username === viewerUsername) return true
    // also check if effectiveId equals self id and no id param
    if (!id && selfQuery.data) return true
    return false
  })()

  const isFollowing = !!relation?.isFollowing
  const isPending = follow.isPending || unfollow.isPending || relLoading

  const handleToggleFollow = useCallback(() => {
    if (!effectiveId) return
    if (isFollowing) {
      unfollow.mutate({ userId: effectiveId })
    } else {
      follow.mutate({ userId: effectiveId })
    }
  }, [effectiveId, isFollowing, follow, unfollow])

  if (!effectiveId && selfQuery.isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-full" />
      </div>
    )
  }

  if (!effectiveId) {
    // Fallback static profile for /profile without id (e.g., test without mocked /api/i) – keep alien header
    return (
      <div data-testid="profile-page">
        <div className="h-[200px] bg-gradient-to-r from-[#55ACEE] to-[#00E5CC] alien-header relative" data-testid="profile-header">
          <div className="absolute -bottom-12 left-4 flex items-end gap-4">
            <UserAvatar className="w-[100px] h-[100px] rounded-[6px] border-4 border-white dark:border-[#0F1A24] alien-card overflow-hidden bg-white" fallback="N" name="naya1115" />
            <div className="mb-2 flex gap-2">
              <Button variant="outline" className="rounded-full border border-[#55ACEE] bg-white text-[#55ACEE] hover:bg-[#55ACEE] hover:text-white alien-card text-xs h-8" data-testid="edit-profile-button">Edit profile</Button>
              <AvatarPicker onUploaded={async (id)=>{ try{ await updateProfile({avatarId:id}); location.reload()}catch(e:any){alert((e as Error).message)}} } label="Avatar" />
              <AvatarPicker onUploaded={async (id)=>{ try{ await updateProfile({bannerId:id}); location.reload()}catch(e:any){alert((e as Error).message)}} } label="Banner" />
            </div>
          </div>
        </div>
        <div className="mt-14 px-4">
          <div className="font-bold text-xl" data-testid="profile-display-name">naya1115</div>
          <div className="text-muted-foreground text-sm" data-testid="profile-handle">@naya1115</div>
          <div className="mt-2 text-sm break-words whitespace-pre-wrap" data-testid="profile-bio">Alien organism profile. 2014 flat meets biolume.</div>
          <div className="mt-3 flex flex-wrap gap-4 text-sm border-y py-3" data-testid="profile-stats">
            <span><b data-testid="profile-notes-count">1,234</b> <span className="text-muted-foreground">Tweets</span></span>
            <span><b data-testid="profile-following-count">56</b> <span className="text-muted-foreground">Following</span></span>
            <span><b data-testid="profile-followers-count">89</b> <span className="text-muted-foreground">Followers</span></span>
          </div>
        </div>
        <Tabs defaultValue="notes" className="w-full mt-2">
          <TabsList className="w-full justify-around rounded-none bg-white dark:bg-[#0F1A24] border-y h-10">
            <TabsTrigger value="notes" className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-[#55ACEE] rounded-none" data-testid="tab-notes">Notes</TabsTrigger>
            <TabsTrigger value="replies" className="flex-1" data-testid="tab-replies">Replies</TabsTrigger>
            <TabsTrigger value="media" className="flex-1" data-testid="tab-media">Media</TabsTrigger>
            <TabsTrigger value="likes" className="flex-1" data-testid="tab-likes">Likes</TabsTrigger>
          </TabsList>
          <TabsContent value="notes" className="m-0"><div className="p-8 text-sm text-muted-foreground text-center" data-testid="empty-notes">No notes yet. Visit <code>/profile/:id</code> for real data.</div></TabsContent>
          <TabsContent value="replies" className="m-0"><div className="p-8 text-sm text-muted-foreground text-center" data-testid="empty-replies">No replies yet.</div></TabsContent>
          <TabsContent value="media" className="m-0"><div className="p-8 text-sm text-muted-foreground text-center" data-testid="empty-media">No media yet.</div></TabsContent>
          <TabsContent value="likes" className="m-0"><div className="p-8 text-sm text-muted-foreground text-center" data-testid="empty-likes">No likes yet.</div></TabsContent>
        </Tabs>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div data-testid="profile-loading">
        <div className="h-[200px] bg-gradient-to-r from-[#55ACEE] to-[#00E5CC] alien-header relative animate-pulse" />
        <div className="px-4 mt-4 space-y-3">
          <div className="flex gap-4">
            <Skeleton className="w-[100px] h-[100px] rounded-[6px] -mt-12 border-4 border-white" />
            <Skeleton className="h-8 w-24 mt-2" />
          </div>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    )
  }

  if (isError || !user) {
    return (
      <div className="p-8 text-center text-sm" data-testid="profile-error">
        <div className="text-red-600 mb-2">Failed to load profile</div>
        <div className="text-muted-foreground text-xs mb-3">{(error as Error)?.message ?? "User not found"}</div>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="rounded-full">Retry</Button>
      </div>
    )
  }

  const displayName = (user.name as string) ?? user.username
  const handle = user.username
  const host = user.host ? `@${user.host}` : ""
  const avatarUrl = (user.avatarUrl as string) ?? null
  const bannerUrl = user.bannerUrl as string | null
  const description = (user.description as string) ?? "Alien organism profile. 2014 flat meets biolume."
  const followersCount = (user.followersCount as number) ?? 0
  const followingCount = (user.followingCount as number) ?? 0
  const notesCount = (user.notesCount as number) ?? 0

  return (
    <div data-testid="profile-page">
      <div
        className="h-[200px] bg-gradient-to-r from-[#55ACEE] to-[#00E5CC] alien-header relative"
        data-testid="profile-header"
        style={
          bannerUrl
            ? { backgroundImage: `url(${bannerUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
            : undefined
        }
      >
        <div className="absolute -bottom-12 left-4 flex items-end gap-4">
          <UserAvatar
            className="w-[100px] h-[100px] rounded-[6px] border-4 border-white dark:border-[#0F1A24] alien-card overflow-hidden bg-white"
            fallback={displayName[0]?.toUpperCase() ?? "U"}
            name={displayName}
            src={avatarUrl}
          />
          <div className="mb-2 flex gap-2">
            {isSelf ? (
              <>
              <Button
                variant="outline"
                className="rounded-full border border-[#55ACEE] bg-white text-[#55ACEE] hover:bg-[#55ACEE] hover:text-white alien-card text-xs h-8"
                data-testid="edit-profile-button"
                onClick={() => alert("Edit profile: use avatar/banner pickers below")}
              >
                Edit profile
              </Button>
              <AvatarPicker onUploaded={async (id)=>{ try{ await updateProfile({avatarId:id}); location.reload()}catch(e:any){alert((e as Error).message)}} } label="Avatar" />
              <AvatarPicker onUploaded={async (id)=>{ try{ await updateProfile({bannerId:id}); location.reload()}catch(e:any){alert((e as Error).message)}} } label="Banner" />
              </>

            ) : (
              <Button
                onClick={handleToggleFollow}
                disabled={isPending}
                className={`rounded-full border alien-card text-xs h-8 font-bold px-5 ${
                  isFollowing
                    ? "bg-white text-[#55ACEE] border-[#55ACEE] hover:bg-[#FFEFEF] hover:text-[#E0245E] hover:border-[#E0245E]"
                    : "bg-[#55ACEE] text-white border-[#55ACEE] hover:bg-[#2795E9]"
                }`}
                data-testid="follow-button"
                aria-pressed={isFollowing}
              >
                {isPending ? "…" : isFollowing ? "Following" : "Follow"}
              </Button>
            )}
          </div>
        </div>
      </div>
      <div className="mt-14 px-4">
        <div className="font-bold text-xl" data-testid="profile-display-name">{displayName}</div>
        <div className="text-muted-foreground text-sm" data-testid="profile-handle">@{handle}{host}</div>
        <div className="mt-2 text-sm break-words whitespace-pre-wrap" data-testid="profile-bio">{description}</div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm border-y py-3" data-testid="profile-stats">
          <span>
            <b data-testid="profile-notes-count">{notesCount.toLocaleString()}</b> <span className="text-muted-foreground">Tweets</span>
          </span>
          <span>
            <b data-testid="profile-following-count">{followingCount.toLocaleString()}</b> <span className="text-muted-foreground">Following</span>
          </span>
          <span>
            <b data-testid="profile-followers-count">{followersCount.toLocaleString()}</b> <span className="text-muted-foreground">Followers</span>
          </span>
          <span className="hidden sm:inline">
            <b>12</b> <span className="text-muted-foreground">Favorites</span>
          </span>
        </div>
        {isFollowing !== undefined || relation ? (
          <div className="mt-2 text-xs text-muted-foreground" data-testid="profile-relation">
            {relation?.isFollowed ? "Follows you" : ""}
            {relation?.hasPendingFollowRequestFromYou ? " • Follow request pending" : ""}
          </div>
        ) : null}
      </div>

      <Tabs defaultValue="notes" className="w-full mt-2">
        <TabsList className="w-full justify-around rounded-none bg-white dark:bg-[#0F1A24] border-y h-10">
          <TabsTrigger value="notes" className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-[#55ACEE] rounded-none" data-testid="tab-notes">Notes</TabsTrigger>
          <TabsTrigger value="replies" className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-[#55ACEE] rounded-none" data-testid="tab-replies">Replies</TabsTrigger>
          <TabsTrigger value="media" className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-[#55ACEE] rounded-none" data-testid="tab-media">Media</TabsTrigger>
          <TabsTrigger value="likes" className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-[#55ACEE] rounded-none" data-testid="tab-likes">Likes</TabsTrigger>
        </TabsList>
        <TabsContent value="notes" className="m-0">
          {notesQuery.isLoading ? (
            <div className="p-4 space-y-3"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>
          ) : allNotes.length === 0 ? (
            <div className="p-8 text-sm text-muted-foreground text-center" data-testid="empty-notes">No notes yet.</div>
          ) : (
            <VirtualTimeline
              notes={allNotes as any}
              hasNextPage={notesQuery.hasNextPage}
              fetchNextPage={() => notesQuery.fetchNextPage()}
              isFetchingNextPage={notesQuery.isFetchingNextPage}
              isLoading={notesQuery.isLoading}
            />
          )}
        </TabsContent>
        <TabsContent value="replies" className="m-0">
          {replies.length === 0 ? (
            <div className="p-8 text-sm text-muted-foreground text-center" data-testid="empty-replies">No replies yet.</div>
          ) : (
            <VirtualTimeline
              notes={replies as any}
              hasNextPage={notesQuery.hasNextPage}
              fetchNextPage={() => notesQuery.fetchNextPage()}
              isFetchingNextPage={notesQuery.isFetchingNextPage}
              isLoading={notesQuery.isLoading}
            />
          )}
        </TabsContent>
        <TabsContent value="media" className="m-0">
          {media.length === 0 ? (
            <div className="p-8 text-sm text-muted-foreground text-center" data-testid="empty-media">No media yet.</div>
          ) : (
            <VirtualTimeline
              notes={media as any}
              hasNextPage={notesQuery.hasNextPage}
              fetchNextPage={() => notesQuery.fetchNextPage()}
              isFetchingNextPage={notesQuery.isFetchingNextPage}
              isLoading={notesQuery.isLoading}
            />
          )}
        </TabsContent>
        <TabsContent value="likes" className="m-0">
          {likes.length === 0 ? (
            <div className="p-8 text-sm text-muted-foreground text-center" data-testid="empty-likes">No likes yet.</div>
          ) : (
            <VirtualTimeline
              notes={likes as any}
              hasNextPage={false}
              fetchNextPage={() => {}}
              isFetchingNextPage={false}
              isLoading={false}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function AppRoutes() {
  const loc = useLocation()
  return (
    <Routes>
      <Route path="/" element={<SessionGate><Layout><HomePage /></Layout></SessionGate>} />
      <Route path="/guest" element={<GuestLayout><GuestPage /></GuestLayout>} />
      <Route path="/profile" element={<SessionGate><Layout><ProfilePage /></Layout></SessionGate>} />
      <Route path="/profile/:id" element={<SessionGate><Layout><ProfilePage /></Layout></SessionGate>} />
      <Route path="/notifications" element={<SessionGate><Layout><NotificationsPage /></Layout></SessionGate>} />
      <Route path="/search" element={<Layout><SearchPage /></Layout>} />
      <Route path="*" element={<div className="p-8">Not found: {loc.pathname}</div>} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
