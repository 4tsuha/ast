import { memo, useCallback, useMemo, useState } from "react"
import { useEmojis } from "@/features/emojis/useEmojis"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type MfmViewProps = {
  text: string
  cw?: string | null
  className?: string
  disableLinks?: boolean
}

type Token =
  | { type: "text"; value: string }
  | { type: "mention"; value: string; href: string }
  | { type: "hashtag"; value: string; href: string }
  | { type: "url"; value: string; href: string }
  | { type: "emoji"; value: string; name: string }
  | { type: "space"; value: string }

/**
 * Simple tokenizer for MFM-ish rendering.
 * Handles @mentions, #hashtags and http(s) URLs via regex.
 * vercel best-practices: pure function, no side effects, memoizable.
 */
function tokenize(text: string): Token[] {
  // Regex matches: URLs, mentions (@user or @user@host), hashtags (#tag)
  // Mention: @ + alnum + _ + optional @host (host includes dot)
  // Hashtag: # + alnum/underscore
  // URL: https?:// non-space
  const pattern = /(https?:\/\/[^\s]+|:[a-zA-Z0-9_\-]+:|@[a-zA-Z0-9_]+(?:@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})?|#[a-zA-Z0-9_]+)/g
  const tokens: Token[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  // split preserving spaces is handled via substring
  while ((match = pattern.exec(text)) !== null) {
    const idx = match.index
    if (idx > lastIndex) {
      const before = text.slice(lastIndex, idx)
      // push before as text (could contain spaces)
      tokens.push({ type: "text", value: before })
    }
    const token = match[0]
    if (token.startsWith(":") && token.endsWith(":") && token.length > 2) {
      const name = token.slice(1, -1)
      tokens.push({ type: "emoji", value: token, name })
    } else if (token.startsWith("http://") || token.startsWith("https://")) {
      tokens.push({ type: "url", value: token, href: token })
    } else if (token.startsWith("@")) {
      // mention -> strip leading @ for href, keep display with @
      const handle = token.slice(1)
      // simple href: /@handle or /@user@host
      tokens.push({ type: "mention", value: token, href: `/@${handle}` })
    } else if (token.startsWith("#")) {
      const tag = token.slice(1)
      tokens.push({ type: "hashtag", value: token, href: `/tags/${encodeURIComponent(tag)}` })
    } else {
      tokens.push({ type: "text", value: token })
    }
    lastIndex = pattern.lastIndex
  }
  if (lastIndex < text.length) {
    tokens.push({ type: "text", value: text.slice(lastIndex) })
  }
  // If no tokens, fallback to single text
  if (tokens.length === 0 && text.length > 0) {
    tokens.push({ type: "text", value: text })
  }
  return tokens
}

function renderTokens(tokens: Token[], disableLinks: boolean, emojiMap: Map<string,string>): React.ReactNode[] {
  return tokens.map((tok, i) => {
    if (tok.type === "emoji") {
      const url = emojiMap.get(tok.name)
      if (url) {
        return <img key={i} src={url} alt={tok.value} title={tok.value} className="inline h-5 w-5 align-text-bottom" loading="lazy" data-testid="custom-emoji" />
      }
      return <span key={i}>{tok.value}</span>
    }
    if (tok.type === "text") {
      return <span key={i}>{tok.value}</span>
    }
    if (disableLinks) {
      return <span key={i}>{tok.value}</span>
    }
    if (tok.type === "mention") {
      return (
        <a
          key={i}
          href={tok.href}
          className="text-[#55ACEE] hover:underline"
          data-testid="mfm-mention"
          onClick={(e) => e.stopPropagation()}
        >
          {tok.value}
        </a>
      )
    }
    if (tok.type === "hashtag") {
      return (
        <a
          key={i}
          href={tok.href}
          className="text-[#55ACEE] hover:underline"
          data-testid="mfm-hashtag"
          onClick={(e) => e.stopPropagation()}
        >
          {tok.value}
        </a>
      )
    }
    if (tok.type === "url") {
      return (
        <a
          key={i}
          href={tok.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#55ACEE] hover:underline break-all"
          data-testid="mfm-link"
          onClick={(e) => e.stopPropagation()}
        >
          {tok.value}
        </a>
      )
    }
    return <span key={i}>{tok.value}</span>
  })
}

function MfmContent({ text, disableLinks }: { text: string; disableLinks?: boolean }) {
  const { data: emojis } = useEmojis()
  const emojiMap = useMemo(() => {
    const m = new Map<string,string>()
    emojis?.forEach(e => m.set(e.name, e.url))
    return m
  }, [emojis])
  const tokens = useMemo(() => tokenize(text), [text])
  const nodes = useMemo(() => renderTokens(tokens, !!disableLinks, emojiMap), [tokens, disableLinks, emojiMap])
  return <>{nodes}</>
}

function MfmViewImpl({ text, cw, className, disableLinks }: MfmViewProps) {
  const [cwExpanded, setCwExpanded] = useState(false)

  const toggleCw = useCallback(() => {
    setCwExpanded((v) => !v)
  }, [])

  const hasCw = typeof cw === "string" && cw.length > 0

  if (hasCw) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-start gap-2 rounded-[12px_6px_16px_6px] border border-[#FFAD1F]/30 bg-[#FFAD1F]/10 px-3 py-2 text-sm">
          <span className="flex-1 break-words">
            <span className="font-semibold text-[#8a6d00] dark:text-[#FFD54F]">CW:</span>{" "}
            <span data-testid="cw-text">
              <MfmContent text={cw} disableLinks={disableLinks} />
            </span>
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleCw}
            aria-expanded={cwExpanded}
            aria-controls="cw-content"
            data-testid="cw-toggle"
            className="shrink-0 rounded-full border-[#FFAD1F] bg-white text-[#8a6d00] hover:bg-[#FFAD1F] hover:text-white h-7 px-3 text-xs font-bold"
          >
            {cwExpanded ? "Hide" : "Show"}
          </Button>
        </div>
        {cwExpanded ? (
          <div
            id="cw-content"
            data-testid="cw-content"
            className="break-words whitespace-pre-wrap text-[14px] leading-[18px] text-[#292F33] dark:text-[#E1E8ED]"
          >
            <MfmContent text={text} disableLinks={disableLinks} />
          </div>
        ) : (
          <div
            data-testid="cw-collapsed"
            className="text-xs italic text-muted-foreground"
          >
            Hidden content — click Show to reveal
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      data-testid="mfm-view"
      className={cn("break-words whitespace-pre-wrap text-[14px] leading-[18px] text-[#292F33] dark:text-[#E1E8ED]", className)}
    >
      <MfmContent text={text} disableLinks={disableLinks} />
    </div>
  )
}

export const MfmView = memo(MfmViewImpl)
export default MfmView
