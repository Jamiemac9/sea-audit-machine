import { SCORE_LABEL, pillForScore } from "@/lib/pills"
import { scoreDistribution } from "@/lib/score"
import type { AuditScore } from "@/lib/types"

export function ProgressRing({
  value,
  label = "Caseload completion",
  color = "#00c875",
}: {
  value: number
  label?: string
  color?: string
}) {
  const size = 58
  const stroke = 6
  const radius = (size - stroke) / 2
  const circ = 2 * Math.PI * radius
  const safe = Math.max(0, Math.min(100, value))
  const offset = circ - (safe / 100) * circ
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`${label} ${safe}%`}
      className="shrink-0"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="white"
        stroke="#e7e9f2"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="52%"
        dominantBaseline="middle"
        textAnchor="middle"
        fontSize="12"
        fontWeight="700"
        fill="#1c1f4a"
      >
        {safe}%
      </text>
    </svg>
  )
}

export function CompletionBar({ value, color }: { value: number; color: string }) {
  const safe = Math.max(0, Math.min(100, value))
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-4 text-xs font-bold whitespace-nowrap">
        <span>Caseload completion: {safe}%</span>
        <span>{safe}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full"
          style={{
            width: `${safe}%`,
            background: `linear-gradient(90deg, ${color}, #00c875)`,
          }}
        />
      </div>
    </div>
  )
}

export function ScoreBattery({ scores }: { scores: AuditScore[] }) {
  const parts = scoreDistribution(scores)
  return (
    <div className="min-w-[180px]">
      <div className="flex h-3 overflow-hidden rounded-full bg-slate-200">
        {parts.map((part) =>
          part.pct > 0 ? (
            <div
              key={part.key}
              style={{
                width: `${part.pct}%`,
                backgroundColor: pillForScore(part.key).bg,
              }}
            />
          ) : null,
        )}
      </div>
      <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-600">
        {parts.map((part) => (
          <span key={part.key} className="whitespace-nowrap">
            {part.count} {SCORE_LABEL[part.key]}
          </span>
        ))}
      </p>
    </div>
  )
}
