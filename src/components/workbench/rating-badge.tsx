import { cn } from "cn"
import type { AuditRating } from "@/lib/rating"
import type { RiskTierId } from "@/lib/risk"

const ratingStyles: Record<AuditRating, string> = {
  Gold: "bg-yellow-100 text-yellow-950 ring-yellow-600/25",
  Green: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  Amber: "bg-amber-50 text-amber-950 ring-amber-600/25",
  Red: "bg-red-50 text-red-800 ring-red-600/20",
}

export function RatingBadge({
  rating,
  className,
}: {
  rating: AuditRating
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2 text-xs font-medium ring-1 ring-inset",
        ratingStyles[rating],
        className,
      )}
    >
      {rating}
    </span>
  )
}

const tierStyles: Record<RiskTierId, string> = {
  low: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  medium: "bg-yellow-100 text-yellow-950 ring-yellow-600/25",
  high: "bg-orange-50 text-orange-900 ring-orange-600/25",
  critical: "bg-red-800 text-white ring-red-950/30",
}

export function RiskTierBadge({
  tier,
  label,
}: {
  tier: RiskTierId
  label: string
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2 text-xs font-medium ring-1 ring-inset",
        tierStyles[tier],
      )}
    >
      {label}
    </span>
  )
}
