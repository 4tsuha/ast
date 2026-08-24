import { Heart, MessageCircle, Repeat2, Share } from "lucide-react"
import { UserAvatar } from "@/components/ui/identity"
import { Card } from "@/components/ui/card"
import { MfmView } from "@/components/MfmView"
import { useLike, useRenote } from "@/features/notes/useNoteInteractions"
import { useCallback, useEffect, useState } from "react"

export type Tweet = {
  id: string
  handle: string
  name: string
  time: string
  text: string
  avatar?: string
  likes?: number
  retweets?: number
  verified?: boolean
  cw?: string | null
  myReaction?: string | null
  reactions?: Record<string, number>
  renoteCount?: number
  isRenoted?: boolean
}

type TweetCardProps = {
  tweet: Tweet
  pinned?: boolean
  best?: boolean
  noteId?: string
  initialLiked?: boolean
  initialRenoted?: boolean
  onLike?: (nextLiked: boolean) => void
  onRenote?: (nextRenoted: boolean) => void
}

export function TweetCard({
  tweet,
  pinned,
  best,
  noteId,
  initialLiked,
  initialRenoted,
  onLike,
  onRenote,
}: TweetCardProps) {
  const resolvedId = noteId ?? tweet.id

  const computedInitialLiked =
    typeof initialLiked === "boolean"
      ? initialLiked
      : typeof tweet.myReaction === "string" && tweet.myReaction.length > 0
        ? true
        : false

  const computedInitialRenoted =
    typeof initialRenoted === "boolean"
      ? initialRenoted
      : typeof tweet.isRenoted === "boolean"
        ? tweet.isRenoted
        : false

  const [isLiked, setIsLiked] = useState(computedInitialLiked)
  const [isRenoted, setIsRenoted] = useState(computedInitialRenoted)
  const [likeCount, setLikeCount] = useState(() => {
    if (typeof tweet.likes === "number") return tweet.likes
    if (tweet.reactions) {
      const heart = tweet.reactions["❤️"] ?? tweet.reactions["\u2764\ufe0f"] ?? 0
      if (heart) return heart
      return Object.values(tweet.reactions).reduce((a, b) => a + b, 0)
    }
    return 0
  })
  const [renoteCount, setRenoteCount] = useState(() => {
    if (typeof tweet.retweets === "number") return tweet.retweets
    if (typeof tweet.renoteCount === "number") return tweet.renoteCount
    return 0
  })

  useEffect(() => {
    setIsLiked(computedInitialLiked)
  }, [computedInitialLiked, resolvedId])

  useEffect(() => {
    setIsRenoted(computedInitialRenoted)
  }, [computedInitialRenoted, resolvedId])

  useEffect(() => {
    const nextLikes =
      typeof tweet.likes === "number"
        ? tweet.likes
        : tweet.reactions
          ? (tweet.reactions["❤️"] ?? Object.values(tweet.reactions).reduce((a, b) => a + b, 0))
          : 0
    setLikeCount(nextLikes)
  }, [tweet.likes, tweet.reactions])

  useEffect(() => {
    const nextRenotes =
      typeof tweet.retweets === "number"
        ? tweet.retweets
        : typeof tweet.renoteCount === "number"
          ? tweet.renoteCount
          : 0
    setRenoteCount(nextRenotes)
  }, [tweet.retweets, tweet.renoteCount])

  const likeMutation = useLike()
  const renoteMutation = useRenote()

  const handleLike = useCallback(() => {
    const nextLiked = !isLiked
    setIsLiked(nextLiked)
    setLikeCount((c) => (nextLiked ? c + 1 : Math.max(0, c - 1)))
    if (onLike) {
      onLike(nextLiked)
    }
    likeMutation.mutate(
      { noteId: resolvedId, isLiked },
      {
        onError: () => {
          setIsLiked(isLiked)
          setLikeCount((c) => (nextLiked ? Math.max(0, c - 1) : c + 1))
        },
      },
    )
  }, [isLiked, likeMutation, onLike, resolvedId])

  const handleRenote = useCallback(() => {
    const nextRenoted = !isRenoted
    setIsRenoted(nextRenoted)
    setRenoteCount((c) => (nextRenoted ? c + 1 : Math.max(0, c - 1)))
    if (onRenote) {
      onRenote(nextRenoted)
    }
    renoteMutation.mutate(
      { noteId: resolvedId, isRenoted },
      {
        onError: () => {
          setIsRenoted(isRenoted)
          setRenoteCount((c) => (nextRenoted ? Math.max(0, c - 1) : c + 1))
        },
      },
    )
  }, [isRenoted, renoteMutation, onRenote, resolvedId])

  const isLikePending = likeMutation.isPending
  const isRenotePending = renoteMutation.isPending

  return (
    <Card
      className={`rounded-none border-x-0 border-t-0 border-b p-4 flex gap-3 hover:bg-accent/30 transition-colors ${best ? "border-l-[3px] border-l-[#55ACEE] bg-gradient-to-r from-[#55ACEE]/[0.08] to-transparent" : ""} ${pinned ? "bg-[#55ACEE]/5" : ""}`}
      data-testid="tweet-card"
      data-note-id={resolvedId}
    >
      <UserAvatar
        className="w-12 h-12 rounded-[12px_6px_16px_6px] shrink-0"
        fallback={tweet.handle.charAt(0).toUpperCase() || "?"}
        name={tweet.name || tweet.handle}
        src={tweet.avatar}
      />
      <div className="flex-1 min-w-0">
        {pinned && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <span>📌</span> Pinned Tweet
          </div>
        )}
        {best && <div className="text-xs font-bold text-[#55ACEE] mb-1">★ Best Tweet</div>}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-bold text-sm hover:underline cursor-pointer">{tweet.name}</span>
          {tweet.verified && (
            <span className="w-4 h-4 rounded-full bg-[#55ACEE] text-white flex items-center justify-center text-[10px]">✓</span>
          )}
          <span className="text-sm text-muted-foreground">@{tweet.handle}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-sm text-muted-foreground hover:underline cursor-pointer">{tweet.time}</span>
        </div>

        <div className={`mt-1 ${best ? "text-[15px] leading-6" : ""}`}>
          <MfmView text={tweet.text} cw={tweet.cw ?? null} />
        </div>

        <div className="mt-3 flex items-center gap-6 text-muted-foreground text-xs">
          <button
            type="button"
            className="flex items-center gap-1.5 hover:text-[#55ACEE] group rounded-full px-2 py-1 -ml-2 hover:bg-[#55ACEE]/10 transition-colors"
            aria-label="Reply"
            data-testid="reply-button"
          >
            <MessageCircle size={16} className="group-hover:fill-current" /> reply
          </button>

          <button
            type="button"
            onClick={handleRenote}
            disabled={isRenotePending}
            aria-pressed={isRenoted}
            aria-label={isRenoted ? "Undo renote" : "Renote"}
            data-testid="renote-button"
            className={`flex items-center gap-1.5 group rounded-full px-2 py-1 -ml-2 transition-colors disabled:opacity-50 ${isRenoted ? "text-[#19CF86] bg-[#19CF86]/10" : "hover:text-[#19CF86] hover:bg-[#19CF86]/10"}`}
          >
            <Repeat2
              size={16}
              className={isRenoted ? "fill-current text-[#19CF86]" : "group-hover:fill-current"}
            />
            <span data-testid="renote-count">{renoteCount}</span>
          </button>

          <button
            type="button"
            onClick={handleLike}
            disabled={isLikePending}
            aria-pressed={isLiked}
            aria-label={isLiked ? "Unlike" : "Like"}
            data-testid="like-button"
            className={`flex items-center gap-1.5 group rounded-full px-2 py-1 -ml-2 transition-colors disabled:opacity-50 ${isLiked ? "text-[#E0245E] bg-[#E0245E]/10" : "hover:text-[#E0245E] hover:bg-[#E0245E]/10"}`}
          >
            <Heart
              size={16}
              className={isLiked ? "fill-[#E0245E] text-[#E0245E]" : "group-hover:fill-current"}
              fill={isLiked ? "currentColor" : "none"}
              data-testid="like-icon"
              aria-hidden="true"
            />
            <span data-testid="like-count">{likeCount}</span>
          </button>

          <button
            type="button"
            className="flex items-center gap-1.5 hover:text-[#55ACEE] hover:bg-[#55ACEE]/10 rounded-full px-2 py-1 -ml-2 transition-colors"
            aria-label="Share"
            data-testid="share-button"
          >
            <Share size={16} />
          </button>
        </div>
      </div>
    </Card>
  )
}

export default TweetCard
