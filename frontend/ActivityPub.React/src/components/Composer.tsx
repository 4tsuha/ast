import { memo, useCallback, useMemo, useRef, useState, type ChangeEvent } from "react"
import { Image as ImageIcon, Smile, MapPin, Eye, EyeOff, Globe, Home, Lock, Mail, Paperclip, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ActionIcon } from "@/components/ui/action-icon"
import { CustomEmoji, UserAvatar } from "@/components/ui/identity"
import { Card } from "@/components/ui/card"
import { misskeyPost } from "@/lib/api"
import { useEmojis } from "@/features/emojis/useEmojis"

export const COMPOSER_MAX_LENGTH = 5000

export type ComposerVisibility = "public" | "home" | "followers" | "specified"

export type ComposerPostParams = {
  text: string
  visibility: ComposerVisibility
  cw: string | null
  localOnly: boolean
}

type ComposerProps = {
  onPost?: (params: ComposerPostParams) => void | Promise<void>
  isPosting?: boolean
}

const visibilityOptions: { value: ComposerVisibility; label: string; icon: React.ReactNode }[] = [
  { value: "public", label: "Public", icon: <Globe size={12} /> },
  { value: "home", label: "Home", icon: <Home size={12} /> },
  { value: "followers", label: "Followers", icon: <Lock size={12} /> },
  { value: "specified", label: "Direct", icon: <Mail size={12} /> },
]

function ComposerImpl({ onPost, isPosting = false }: ComposerProps) {
  const [text, setText] = useState("")
  const [visibility, setVisibility] = useState<ComposerVisibility>("public")
  const [cwEnabled, setCwEnabled] = useState(false)
  const [cw, setCw] = useState("")
  const [localOnly, setLocalOnly] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [emojiOpen, setEmojiOpen] = useState(false)
  const { data: emojis = [] } = useEmojis()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const remaining = useMemo(() => COMPOSER_MAX_LENGTH - text.length, [text.length])
  const isOver = useMemo(() => text.length > COMPOSER_MAX_LENGTH, [text.length])
  const isEmpty = useMemo(() => text.trim().length === 0, [text])
  const isDisabled = useMemo(
    () => isEmpty || isOver || isPosting,
    [isEmpty, isOver, isPosting]
  )

  const counterColor = useMemo(() => {
    if (isOver) return "text-red-500"
    if (remaining < 500) return "text-[#FFAD1F]"
    return "text-muted-foreground"
  }, [isOver, remaining])

  const handleTextChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
  }, [])

  const handleVisibilityChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    setVisibility(e.target.value as ComposerVisibility)
  }, [])

  const handleCwChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setCw(e.target.value)
  }, [])

  const handleCwToggle = useCallback((checked: boolean) => {
    setCwEnabled(checked)
    if (!checked) setCw("")
  }, [])

  const handleLocalOnlyChange = useCallback((checked: boolean) => {
    setLocalOnly(checked)
  }, [])

  const handleMediaClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    setSelectedFiles(files)
    if (files.length > 0) {
      // stub: log to console, actual upload not implemented
      console.log("[Composer] media selected:", files.map(f => ({ name: f.name, size: f.size, type: f.type })))
    }
  }, [])

  const handleRemoveFiles = useCallback(() => {
    setSelectedFiles([])
    if (fileInputRef.current) fileInputRef.current.value = ""
    console.log("[Composer] media cleared")
  }, [])

  const handlePost = useCallback(async () => {
    if (isDisabled) return
    const params: ComposerPostParams = {
      text,
      visibility,
      cw: cwEnabled ? (cw.trim() ? cw.trim() : null) : null,
      localOnly,
    }

    if (selectedFiles.length > 0) {
      console.log("[Composer] post with media stub:", { ...params, files: selectedFiles.map(f => f.name) })
    }

    try {
      if (onPost) {
        await onPost(params)
      } else {
        // fallback: direct misskeyPost if no handler provided
        await misskeyPost("/notes/create", params)
      }
      // reset after successful post
      setText("")
      if (cwEnabled) {
        // keep cwEnabled state but clear cw text? spec says toggle remains; clear cw field
        setCw("")
      }
      setSelectedFiles([])
      if (fileInputRef.current) fileInputRef.current.value = ""
    } catch (err) {
      console.error("[Composer] post failed", err)
    }
  }, [isDisabled, text, visibility, cw, cwEnabled, localOnly, selectedFiles, onPost])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault()
        void handlePost()
      }
    },
    [handlePost]
  )

  return (
    <Card className="rounded-t-lg border-b-0 alien-card p-4 bg-[#E8F5FD] dark:bg-[#0F1A24] border-[#55ACEE]/20 overflow-hidden">
      <div className="flex gap-3 min-w-0">
        <UserAvatar className="w-8 h-8 rounded-full shrink-0" fallback="N" name="Naya" />
        <div className="flex-1 min-w-0 overflow-hidden">
          {/* CW input */}
          {cwEnabled && (
            <div className="mb-2">
              <Input
                value={cw}
                onChange={handleCwChange}
                placeholder="Write content warning..."
                className="bg-white dark:bg-[#0A1118] border-[#CCD6DD] focus-visible:ring-[#55ACEE] text-sm"
                maxLength={100}
                data-testid="composer-cw-input"
                aria-label="Content warning"
              />
            </div>
          )}

          <Textarea
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="What's happening?"
            className="min-h-[52px] max-h-[40vh] resize-none bg-white dark:bg-[#0A1118] border-[#CCD6DD] focus-visible:ring-[#55ACEE] text-sm break-words whitespace-pre-wrap overflow-y-auto w-full"
            rows={3}
            data-testid="composer-textarea"
            aria-label="Post text"
          />

          {/* selected files badge */}
          {selectedFiles.length > 0 && (
            <div className="mt-2 flex items-center gap-2 text-xs bg-white dark:bg-[#0A1118] border border-[#CCD6DD] dark:border-[#2A3A4A] rounded-md px-2 py-1.5 min-w-0 overflow-hidden">
              <Paperclip size={14} className="shrink-0 text-[#55ACEE]" />
              <span className="truncate flex-1 min-w-0">
                {selectedFiles.length} file(s) selected: {selectedFiles.map(f => f.name).join(", ")}
              </span>
              <ActionIcon
                icon={X}
                iconSize={16}
                label="Remove selected files"
                onClick={handleRemoveFiles}
                className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground"
              />
            </div>
          )}

          {/* controls row */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 min-w-0">
            {/* left: actions + picks */}
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              {/* media upload stub */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*,audio/*"
                className="hidden"
                onChange={handleFileChange}
                data-testid="composer-file-input"
                aria-hidden="true"
                tabIndex={-1}
              />
              <ActionIcon
                icon={ImageIcon}
                label="Attach media"
                onClick={handleMediaClick}
                title="Attach media (stub)"
                data-testid="composer-media-button"
              />
              <div className="relative">
                <ActionIcon
                  icon={Smile}
                  label="Emoji picker"
                  onClick={() => setEmojiOpen(o => !o)}
                  data-testid="composer-emoji-button"
                />
                {emojiOpen && (
                  <div className="absolute z-10 mt-1 left-0 w-64 max-h-48 overflow-auto bg-white dark:bg-[#0F1A24] border rounded-lg shadow-lg p-2 grid grid-cols-6 gap-1">
                    {emojis.slice(0, 48).map((e) => (
                      <button key={e.name} type="button" onClick={()=>{ setText(t=> t + ` :${e.name}: `); setEmojiOpen(false)}} className="p-1 hover:bg-accent rounded" title={`:${e.name}:`}>
                        <CustomEmoji name={e.name} src={e.url} className="w-6 h-6" />
                      </button>
                    ))}
                    {emojis.length === 0 && <div className="col-span-6 text-xs text-muted-foreground p-2">No custom emojis — add via /emoji</div>}
                  </div>
                )}
              </div>
              <ActionIcon
                icon={MapPin}
                label="Location"
                title="Location (coming soon)"
                disabled
              />

              <span className="hidden sm:inline-flex w-px h-5 bg-[#CCD6DD] dark:bg-[#2A3A4A] mx-1" />

              {/* visibility picker */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Label htmlFor="composer-visibility" className="text-xs text-muted-foreground hidden sm:inline">
                  Visibility
                </Label>
                <Select
                  id="composer-visibility"
                  value={visibility}
                  onChange={handleVisibilityChange}
                  data-testid="composer-visibility"
                  aria-label="Visibility"
                >
                  {visibilityOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>

              {/* cw toggle */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCwToggle(!cwEnabled)}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${cwEnabled ? "bg-[#FFAD1F] text-white border-[#FFAD1F]" : "bg-white dark:bg-[#0A1118] text-muted-foreground border-[#CCD6DD] dark:border-[#2A3A4A] hover:bg-muted"}`}
                  data-testid="composer-cw-toggle"
                  aria-pressed={cwEnabled}
                  aria-label="Toggle content warning"
                  title="Content warning"
                >
                  {cwEnabled ? <EyeOff size={12} /> : <Eye size={12} />}
                  CW
                </button>
              </div>

              {/* localOnly toggle */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Switch
                  id="composer-localOnly"
                  checked={localOnly}
                  onCheckedChange={handleLocalOnlyChange}
                  data-testid="composer-localOnly-toggle"
                  aria-label="Local only"
                />
                <Label htmlFor="composer-localOnly" className="text-xs text-muted-foreground cursor-pointer select-none">
                  Local only
                </Label>
              </div>
            </div>

            {/* right: counter + post */}
            <div className="flex items-center gap-3 shrink-0 ml-auto">
              <span
                className={`text-sm font-medium tabular-nums ${counterColor}`}
                data-testid="composer-counter"
                aria-live="polite"
              >
                {remaining}
              </span>
              <Button
                disabled={isDisabled}
                onClick={handlePost}
                className="rounded-full bg-[#55ACEE] hover:bg-[#2795E9] font-bold px-6 h-8 disabled:opacity-50 alien-card shrink-0"
                data-testid="composer-post-button"
              >
                {isPosting ? "Posting…" : "Tweet"}
              </Button>
            </div>
          </div>

          {/* over limit hint */}
          {isOver && (
            <div className="mt-2 text-xs text-red-500" data-testid="composer-error">
              Post is too long ({text.length} / {COMPOSER_MAX_LENGTH})
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

export const Composer = memo(ComposerImpl)
