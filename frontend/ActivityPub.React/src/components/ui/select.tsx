import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className="relative inline-flex items-center">
        <select
          ref={ref}
          className={cn(
            "flex h-7 appearance-none rounded-full border border-[#CCD6DD] dark:border-[#2A3A4A] bg-white dark:bg-[#0A1118] px-3 pr-7 py-1 text-xs font-medium text-[#292F33] dark:text-[#E1E8ED] shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#55ACEE] focus-visible:border-[#55ACEE] disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 opacity-60" />
      </div>
    )
  }
)
Select.displayName = "Select"

// Optional: shadcn-style composition helpers for future Radix migration
export const SelectTrigger = Select
export const SelectValue = ({ children }: { children?: React.ReactNode }) => <>{children}</>
export const SelectContent = ({ children }: { children?: React.ReactNode }) => <>{children}</>
export const SelectItem = ({ children, value, ...props }: { children: React.ReactNode; value: string } & React.OptionHTMLAttributes<HTMLOptionElement>) => (
  <option value={value} {...props}>{children}</option>
)

export { Select }
