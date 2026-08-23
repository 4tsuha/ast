import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

export function TrendsCard() {
  const trends = ["#ActivityPub", "#Misskey", "#dotnet", "#fediverse", "#react"]
  return (
    <Card className="alien-card overflow-hidden">
      <CardHeader className="pb-2"><CardTitle className="text-base flex items-center justify-between">Trends for you <a className="text-xs text-[#55ACEE] font-normal hover:underline">Change</a></CardTitle></CardHeader>
      <CardContent className="p-0">
        {trends.map(t => (
          <a key={t} href="#" className="block px-4 py-2.5 hover:bg-accent/50 border-b last:border-0">
            <div className="text-sm font-bold text-[#55ACEE] hover:underline">{t}</div>
            <div className="text-xs text-muted-foreground">1,234 posts</div>
          </a>
        ))}
      </CardContent>
    </Card>
  )
}
export function WhoToFollowCard() {
  return (
    <Card className="alien-card overflow-hidden">
      <CardHeader className="pb-2"><CardTitle className="text-base">Who to follow</CardTitle></CardHeader>
      <CardContent className="p-0">
        {[1,2,3].map(i => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 border-b last:border-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#55ACEE] to-[#00E5CC] biolume shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold truncate">user{i} • alien</div>
              <div className="text-xs text-muted-foreground truncate">@user{i}_x</div>
            </div>
            <button className="px-4 py-1 text-xs font-bold rounded-full border border-[#55ACEE] text-[#55ACEE] hover:bg-[#55ACEE] hover:text-white">Follow</button>
          </div>
        ))}
        <a href="#" className="block px-4 py-2 text-sm text-[#55ACEE] hover:bg-accent/50">Show more</a>
      </CardContent>
    </Card>
  )
}
