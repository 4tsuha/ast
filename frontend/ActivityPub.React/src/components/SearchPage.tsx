import { useState } from "react"
import { useSearchParams, Link } from "react-router-dom"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { UserAvatar } from "@/components/ui/identity"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useUserSearch, useHashtagSearch } from "@/features/search/useSearch"

export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get("q") || ""
  const [input, setInput] = useState(q)
  const users = useUserSearch(q, true)
  const tags = useHashtagSearch(q, true)
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setParams({ q: input })
  }
  return (
    <div className="p-4 space-y-4">
      <form onSubmit={submit} className="flex gap-2">
        <Input value={input} onChange={e=>setInput(e.target.value)} placeholder="Search users, hashtags" className="flex-1" />
        <Button type="submit" className="rounded-full bg-[#55ACEE]">Search</Button>
      </form>
      {!q ? <div className="text-sm text-muted-foreground text-center py-8">Enter query to search</div> :
      <Tabs defaultValue="users">
        <TabsList><TabsTrigger value="users">Users</TabsTrigger><TabsTrigger value="hashtags">Hashtags</TabsTrigger></TabsList>
        <TabsContent value="users">
          {users.isLoading ? <div className="p-4 text-muted-foreground">Loading…</div> :
           users.data?.length ? <div className="divide-y border rounded-lg bg-white dark:bg-[#0F1A24]">{users.data.map((u:any)=>
             <Link key={u.id} to={`/profile/${u.id}`} className="flex items-center gap-3 p-3 hover:bg-accent/50">
               <UserAvatar className="w-10 h-10" fallback={u.username?.[0]} name={u.name || u.username} src={u.avatarUrl} />
               <div><div className="font-bold text-sm">{u.name || u.username}</div><div className="text-xs text-muted-foreground">@{u.username}{u.host?`@${u.host}`:""}</div></div>
             </Link>
           )}</div> : <div className="p-8 text-center text-muted-foreground">No users found</div>}
        </TabsContent>
        <TabsContent value="hashtags">
          {tags.data?.length ? <div className="space-y-2">{tags.data.map((t:any)=><Card key={t}><CardContent className="p-3"><Link to={`/search?q=%23${encodeURIComponent(t.tag || t)}`} className="text-[#55ACEE]">#{t.tag || t}</Link></CardContent></Card>)}</div> : <div className="p-8 text-center text-muted-foreground">No hashtags</div>}
        </TabsContent>
      </Tabs>
      }
    </div>
  )
}
