import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

type UserAvatarProps = {
  readonly alt?: string
  readonly className?: string
  readonly fallback?: string
  readonly imageClassName?: string
  readonly name: string
  readonly src?: string | null
}

type CustomEmojiProps = {
  readonly className?: string
  readonly name: string
  readonly src?: string | null
}

/** Returns image sources permitted by the app's `img-src 'self' data:` CSP. */
export function allowedImageSource(source: string | null | undefined): string | null {
  if (!source) return null
  if (source.startsWith("data:image/")) return source

  try {
    const candidate = new URL(source, window.location.href)
    return candidate.origin === window.location.origin ? source : null
  } catch (error) {
    if (error instanceof TypeError) return null
    throw error
  }
}

function avatarFallback(name: string): string {
  const initial = name.trim().charAt(0)
  return initial ? initial.toUpperCase() : "?"
}

/** CSP-compatible user identity with a deterministic textual failure state. */
export function UserAvatar({ alt, className, fallback, imageClassName, name, src }: UserAvatarProps) {
  const safeSource = allowedImageSource(src)
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const showImage = safeSource !== null && failedSource !== safeSource

  return (
    <Avatar className={className}>
      {showImage ? (
        <AvatarImage
          alt={alt ?? `${name}'s avatar`}
          className={imageClassName}
          onError={() => setFailedSource(safeSource)}
          src={safeSource}
        />
      ) : null}
      {!showImage ? (
        <AvatarFallback aria-label={`${name} avatar fallback`} data-testid="user-avatar-fallback">
          {fallback ?? avatarFallback(name)}
        </AvatarFallback>
      ) : null}
    </Avatar>
  )
}

/** CSP-compatible custom emoji that preserves its shortcode on rejection/error. */
export function CustomEmoji({ className, name, src }: CustomEmojiProps) {
  const shortcode = `:${name}:`
  const safeSource = allowedImageSource(src)
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const showImage = safeSource !== null && failedSource !== safeSource

  if (!showImage) {
    return <span data-testid="custom-emoji-fallback" title={shortcode}>{shortcode}</span>
  }

  return (
    <img
      alt={shortcode}
      className={cn("inline", className)}
      data-testid="custom-emoji"
      loading="lazy"
      onError={() => setFailedSource(safeSource)}
      src={safeSource}
      title={shortcode}
    />
  )
}
