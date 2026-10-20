import { cn } from "cn"
import type { AssuranceRating } from "@/lib/audit"

const styles: Record<AssuranceRating, string> = {
  Substantial: "bg-emerald-50 text-emerald-800 ring-emerald-600/15",
  Reasonable: "bg-blue-50 text-blue-800 ring-blue-600/15",
  Limited: "bg-amber-50 text-amber-900 ring-amber-600/20",
  "No Assurance": "bg-red-50 text-red-800 ring-red-600/15",
}

const dots: Record<AssuranceRating, string> = {
  Substantial: "bg-emerald-500",
  Reasonable: "bg-blue-500",
  Limited: "bg-amber-500",
  "No Assurance": "bg-red-500",
}

export function AssurancePill({
  rating,
  className,
}: {
  rating: AssuranceRating
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2 text-xs font-medium ring-1 ring-inset",
        styles[rating],
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full", dots[rating])} />
      {rating}
    </span>
  )
}
