import { cn } from "cn"
import { RATING_LABEL, type Rating } from "@/lib/audit"

const styles: Record<Rating, string> = {
  GOLD: "bg-yellow-50 text-yellow-900 ring-yellow-600/20",
  GREEN: "bg-emerald-50 text-emerald-800 ring-emerald-600/15",
  AMBER: "bg-amber-50 text-amber-900 ring-amber-600/20",
  RED: "bg-red-50 text-red-800 ring-red-600/15",
}

const dots: Record<Rating, string> = {
  GOLD: "bg-yellow-500",
  GREEN: "bg-emerald-500",
  AMBER: "bg-amber-500",
  RED: "bg-red-500",
}

/**
 * An unrated file is shown as "Not yet rated", never as a default band. The
 * rating is a judgement a human has not made yet, not a missing value.
 */
export function RatingPill({
  rating,
  className,
}: {
  rating: Rating | string | null
  className?: string
}) {
  if (!rating || !(rating in styles)) {
    return (
      <span
        className={cn(
          "inline-flex h-6 items-center gap-1.5 rounded-full bg-muted px-2 text-xs font-medium text-muted-foreground ring-1 ring-border ring-inset",
          className
        )}
      >
        Not yet rated
      </span>
    )
  }

  const key = rating as Rating
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2 text-xs font-medium ring-1 ring-inset",
        styles[key],
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full", dots[key])} />
      {RATING_LABEL[key]}
    </span>
  )
}
