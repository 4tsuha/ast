import * as React from "react"
import { cn } from "@/lib/utils"

type DropdownMenuProps = {
  children: React.ReactNode
  className?: string
}

export function DropdownMenu({ children, className }: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  const toggle = React.useCallback(() => setOpen(v => !v), [])
  const close = React.useCallback(() => setOpen(false), [])

  React.useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open, close])

  // Clone children to inject open/toggle – simple pattern for stub
  return (
    <div ref={ref} className={cn("relative inline-block", className)}>
      {React.Children.map(children, child => {
        if (!React.isValidElement(child)) return child
        const el = child as React.ReactElement<any>
        if (el.type === DropdownMenuTrigger) {
          return React.cloneElement(el, { onClick: toggle, "aria-expanded": open } as any)
        }
        if (el.type === DropdownMenuContent) {
          return open ? React.cloneElement(el, { onClose: close } as any) : null
        }
        return child
      })}
    </div>
  )
}

export const DropdownMenuTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn("inline-flex items-center justify-center rounded-full border border-[#CCD6DD] dark:border-[#2A3A4A] bg-white dark:bg-[#0A1118] px-3 h-7 text-xs font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#55ACEE]", className)}
      {...props}
    >
      {children}
    </button>
  )
)
DropdownMenuTrigger.displayName = "DropdownMenuTrigger"

export const DropdownMenuContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { onClose?: () => void }>(
  ({ className, children, onClose: _onClose, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("absolute left-0 top-full z-50 mt-2 min-w-[10rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md bg-white dark:bg-[#0F1A24] border-[#E1E8ED] dark:border-[#2A3A4A]", className)}
      {...props}
    >
      {children}
    </div>
  )
)
DropdownMenuContent.displayName = "DropdownMenuContent"

export const DropdownMenuItem = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn("relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1 text-xs outline-none hover:bg-[#E8F5FD] dark:hover:bg-[#1A2A3A] focus:bg-accent", className)}
      {...props}
    >
      {children}
    </button>
  )
)
DropdownMenuItem.displayName = "DropdownMenuItem"
