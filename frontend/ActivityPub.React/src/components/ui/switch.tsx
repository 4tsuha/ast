import * as React from "react"
import { cn } from "@/lib/utils"

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, defaultChecked, onCheckedChange, onChange, disabled, ...props }, ref) => {
    const handleChange = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onCheckedChange?.(e.target.checked)
        onChange?.(e)
      },
      [onCheckedChange, onChange]
    )
    return (
      <label
        className={cn(
          "relative inline-flex h-5 w-9 items-center rounded-full border border-transparent transition-colors focus-within:ring-1 focus-within:ring-[#55ACEE]",
          checked ?? defaultChecked ? "bg-[#55ACEE]" : "bg-[#CCD6DD] dark:bg-[#2A3A4A]",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        <input
          ref={ref}
          type="checkbox"
          className="sr-only"
          checked={checked}
          defaultChecked={defaultChecked}
          onChange={handleChange}
          disabled={disabled}
          {...props}
        />
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
            (checked ?? defaultChecked) ? "translate-x-4" : "translate-x-0.5"
          )}
        />
      </label>
    )
  }
)
Switch.displayName = "Switch"
export { Switch }
