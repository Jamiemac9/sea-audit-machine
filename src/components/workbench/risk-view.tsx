"use client"

import { RiskTierBadge } from "@/components/workbench/rating-badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  LIKELIHOOD_LEVELS,
  SEVERITY_LEVELS,
  matrixScore,
  requiresRiskManagementPlan,
  riskTier,
} from "@/lib/risk"
import { useWorkbench } from "@/lib/workbench"
import { cn } from "cn"

const cellTone = (score: number) => {
  const tier = riskTier(score).id
  if (tier === "low") return "bg-emerald-50 text-emerald-900"
  if (tier === "medium") return "bg-yellow-100 text-yellow-950"
  if (tier === "high") return "bg-orange-50 text-orange-950"
  return "bg-red-800 text-white"
}

export function RiskView() {
  const { file } = useWorkbench()
  const score = matrixScore(file.likelihood, file.severity)
  const tier = riskTier(score)
  const planRequired = requiresRiskManagementPlan(score)

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div>
        <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Universal matrix
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          5×5 risk assessment
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Likelihood 1–5, from Unlikely to Frequent, times severity 1–5, from
          Negligible to Catastrophic. The same grid is used for every managing
          agent. File {file.reference} is highlighted.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <RiskTierBadge tier={tier.id} label={`${score} · ${tier.label}`} />
        <p className="text-sm text-muted-foreground">
          {planRequired
            ? file.riskManagementPlan
              ? "WR-09 Risk Management Plan is present."
              : "WR-09 Risk Management Plan is required and missing."
            : "WR-09 is not required below a score of 5."}
        </p>
      </div>

      <Card className="shadow-sm ring-foreground/8">
        <CardHeader className="border-b">
          <CardTitle>Score grid</CardTitle>
          <CardDescription>
            Low 1–4 green, medium 5–9 yellow, high 10–16 orange, and critical
            20–25 dark red. Scores 17–19 stay in the high tier.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto pt-4">
          <table className="w-full min-w-[36rem] border-separate border-spacing-1 text-center text-sm">
            <caption className="sr-only">
              Risk scores for likelihood across and severity down
            </caption>
            <thead>
              <tr>
                <th className="p-2 text-left text-xs font-medium text-muted-foreground">
                  Severity \ Likelihood
                </th>
                {LIKELIHOOD_LEVELS.map((level) => (
                  <th key={level.value} className="p-2 text-xs font-medium">
                    {level.value}
                    <span className="mt-0.5 block font-normal text-muted-foreground">
                      {level.label}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...SEVERITY_LEVELS].reverse().map((severity) => (
                <tr key={severity.value}>
                  <th className="p-2 text-left text-xs font-medium">
                    {severity.value} {severity.label}
                  </th>
                  {LIKELIHOOD_LEVELS.map((likelihood) => {
                    const cell = likelihood.value * severity.value
                    const selected =
                      file.likelihood === likelihood.value &&
                      file.severity === severity.value
                    return (
                      <td
                        key={likelihood.value}
                        className={cn(
                          "rounded-md p-3 font-medium tabular-nums",
                          cellTone(cell),
                          selected && "ring-2 ring-foreground",
                        )}
                      >
                        {cell}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
