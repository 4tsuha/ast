import type { LucideIcon } from "lucide-react"
import { Button, type ButtonProps } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ActionIconProps = Omit<ButtonProps, "aria-label" | "children" | "size"> & {
  readonly icon: LucideIcon
  readonly label: string
  readonly controlSize?: "compact" | "standard"
  readonly iconSize?: 16 | 18
}

/**
 * A labelled icon-only action. The button owns the accessible name while the
 * Lucide glyph remains decorative, so every consumer gets the same semantics.
 */
export function ActionIcon({
  className,
  controlSize = "compact",
  icon: Icon,
  iconSize = 18,
  label,
  title,
  type = "button",
  variant = "ghost",
  ...props
}: ActionIconProps) {
  return (
    <Button
      aria-label={label}
      className={cn(
        "rounded-full p-0 text-primary transition-colors hover:bg-primary/10 hover:text-primary",
        controlSize === "compact" ? "h-8 w-8" : "h-9 w-9",
        className,
      )}
      title={title ?? label}
      type={type}
      variant={variant}
      {...props}
    >
      <Icon aria-hidden="true" focusable="false" size={iconSize} />
    </Button>
  )
}
