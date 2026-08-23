import { useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { useSessionStore } from "@/lib/sessionStore"

export function AvatarPicker({ onUploaded, label = "Upload avatar" }: { onUploaded: (id: string) => void; label?: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const session = useSessionStore(s => s.session)

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      // Upload via drive
      const form = new FormData()
      form.append("file", file)
      form.append("name", file.name)
      const headers: Record<string,string> = {}
      if (session?.csrf) headers[session.csrf.headerName] = session.csrf.requestToken
      const res = await fetch("/api/drive/files/create", { method: "POST", credentials: "include", headers, body: form })
      if (!res.ok) throw new Error(await res.text())
      const json = await res.json()
      // Misskey returns {id, ...} or {id}
      const id = json.id || json.file?.id || json
      if (typeof id === "string") onUploaded(id)
      else if (json.id) onUploaded(json.id)
    } catch (err) {
      alert("Upload failed: " + (err as Error).message)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }, [onUploaded, session])

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} data-testid="avatar-file-input" />
      <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading} className="rounded-full">
        {uploading ? "Uploading…" : label}
      </Button>
    </>
  )
}

export function useProfileUpdate() {
  const session = useSessionStore(s => s.session)
  const update = useCallback(async (payload: { name?: string; description?: string; avatarId?: string | null; bannerId?: string | null }) => {
    const headers: Record<string,string> = { "Content-Type": "application/json" }
    if (session?.csrf) headers[session.csrf.headerName] = session.csrf.requestToken
    const res = await fetch("/api/i/update", { method: "POST", credentials: "include", headers, body: JSON.stringify(payload) })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  }, [session])
  return update
}
