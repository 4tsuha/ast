import * as React from "react"
import { cn } from "@/lib/utils"
const Tabs = ({ defaultValue, children, className }: { defaultValue?: string; children: React.ReactNode; className?: string }) => {
  const [active, setActive] = React.useState(defaultValue)
  return <div className={cn(className)} data-active={active}>{React.Children.map(children, child => React.isValidElement(child) ? React.cloneElement(child as any, { active, setActive }) : child)}</div>
}
const TabsList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { active?: string; setActive?: any }>(({ className, children, active, setActive, ...props }, ref) => (
  <div ref={ref} className={cn("inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground", className)} {...props}>
    {React.Children.map(children, child => React.isValidElement(child) ? React.cloneElement(child as any, { active, setActive }) : child)}
  </div>
))
TabsList.displayName = "TabsList"
const TabsTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string; active?: string; setActive?: any }>(({ className, children, value, active, setActive, ...props }, ref) => (
  <button ref={ref} onClick={() => setActive(value)} data-state={active === value ? "active" : "inactive"} className={cn("inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow", className)} {...props}>{children}</button>
))
TabsTrigger.displayName = "TabsTrigger"
const TabsContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { value: string; active?: string }>(({ className, children, value, active, ...props }, ref) => (
  active === value ? <div ref={ref} className={cn("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)} {...props}>{children}</div> : null
))
TabsContent.displayName = "TabsContent"
export { Tabs, TabsList, TabsTrigger, TabsContent }
