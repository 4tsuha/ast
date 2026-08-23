import { useCallback, useEffect, useMemo, useRef } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { TweetCard, type Tweet as TweetCardTweet } from "@/components/TweetCard"
import { Skeleton } from "@/components/ui/skeleton"

type RawNote = {
  id: string
  text?: string | null
  cw?: string | null
  createdAt?: string
  user?: {
    name?: string | null
    username?: string
    avatarUrl?: string | null
    host?: string | null
  }
  myReaction?: string | null
  reactions?: Record<string, number>
  renoteCount?: number
  repliesCount?: number
  likes?: number
  retweets?: number
  // allow already-mapped Tweet shape
  handle?: string
  name?: string
  time?: string
  avatar?: string
  cw2?: string | null
}

type Tweet = TweetCardTweet

export interface VirtualTimelineProps {
  notes: RawNote[]
  hasNextPage?: boolean
  fetchNextPage: () => void
  isFetchingNextPage?: boolean
  isLoading?: boolean
  estimateSize?: number
  overscan?: number
}

function mapToTweet(note: RawNote): Tweet {
  // if already Tweet-shaped (has handle+name)
  if ("handle" in note && "name" in note && typeof (note as unknown as Tweet).handle === "string" && typeof (note as unknown as Tweet).text === "string") {
    // preserve Tweet shape but also inject extended fields if present on note
    const t = note as unknown as Tweet & RawNote
    // if note already has Tweet fields but also has myReaction etc, merge
    return {
      ...(t as Tweet),
      cw: (t as unknown as { cw?: string | null }).cw ?? t.cw ?? null,
      myReaction: (t as unknown as { myReaction?: string | null }).myReaction ?? null,
      reactions: (t as unknown as { reactions?: Record<string, number> }).reactions,
      renoteCount: (t as unknown as { renoteCount?: number }).renoteCount,
    } as Tweet
  }
  const handle = note.user?.username ?? "unknown"
  const name = note.user?.name ?? handle
  const time = note.createdAt ? new Date(note.createdAt).toLocaleTimeString() : "now"
  const reactions = note.reactions ?? {}
  const likes =
    typeof note.likes === "number"
      ? note.likes
      : reactions["❤️"] !== undefined
        ? reactions["❤️"]
        : Object.values(reactions).reduce((a, b) => a + b, 0)
  const retweets = typeof note.retweets === "number" ? note.retweets : (note.renoteCount ?? 0)
  return {
    id: note.id,
    handle,
    name,
    time,
    text: note.text ?? "",
    avatar: note.user?.avatarUrl ?? undefined,
    cw: note.cw ?? null,
    myReaction: note.myReaction ?? null,
    reactions,
    renoteCount: note.renoteCount ?? retweets,
    likes,
    retweets,
  } as Tweet
}

function TimelineSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="divide-y" aria-busy="true" aria-label="Loading timeline">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 flex gap-3">
          <Skeleton className="w-12 h-12 rounded-[12px_6px_16px_6px] shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function VirtualTimeline({
  notes,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage = false,
  isLoading = false,
  estimateSize = 144,
  overscan = 5,
}: VirtualTimelineProps) {
  const parentRef = useRef<HTMLDivElement | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const tweets: Tweet[] = useMemo(() => notes.map(mapToTweet), [notes])

  const rowVirtualizer = useVirtualizer({
    count: tweets.length,
    getScrollElement: useCallback(() => parentRef.current, []),
    estimateSize: useCallback(() => estimateSize, [estimateSize]),
    overscan,
  })

  const virtualItems = rowVirtualizer.getVirtualItems()
  const totalSize = rowVirtualizer.getTotalSize()

  const handleFetchNext = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  useEffect(() => {
    const sentinel = sentinelRef.current
    const root = parentRef.current
    if (!sentinel || !root) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry?.isIntersecting) {
          handleFetchNext()
        }
      },
      {
        root,
        rootMargin: "200px",
        threshold: 0,
      },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [handleFetchNext])

  if (isLoading) {
    return <TimelineSkeleton count={6} />
  }

  if (tweets.length === 0) {
    return (
      <div className="p-8 text-sm text-muted-foreground text-center" data-testid="empty-timeline">
        No notes yet.
      </div>
    )
  }

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto overscroll-contain" data-testid="virtual-timeline">
      <div
        style={{
          height: `${totalSize}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualItems.map((virtualRow) => {
          const tweet = tweets[virtualRow.index]
          return (
            <div
              key={tweet.id}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <TweetCard
                tweet={tweet}
                noteId={tweet.id}
                initialLiked={!!tweet.myReaction}
                initialRenoted={!!(tweet as unknown as { isRenoted?: boolean }).isRenoted}
              />
            </div>
          )
        })}
      </div>

      <div ref={sentinelRef} className="h-1 w-full" aria-hidden="true" />

      {isFetchingNextPage && (
        <div className="py-2">
          <TimelineSkeleton count={2} />
        </div>
      )}

      {!hasNextPage && tweets.length > 0 && (
        <div className="p-4 text-center text-xs text-muted-foreground">You&apos;ve reached the end</div>
      )}
    </div>
  )
}

export default VirtualTimeline
