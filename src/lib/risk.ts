export const AUDIT_AS_OF = "2026-10-20"

export const LIKELIHOOD_LEVELS = [
  { value: 1, label: "Unlikely" },
  { value: 2, label: "Seldom" },
  { value: 3, label: "Possible" },
  { value: 4, label: "Likely" },
  { value: 5, label: "Frequent" },
] as const

export const SEVERITY_LEVELS = [
  { value: 1, label: "Negligible" },
  { value: 2, label: "Slight" },
  { value: 3, label: "Moderate" },
  { value: 4, label: "Major" },
  { value: 5, label: "Catastrophic" },
] as const

export type RiskTierId = "low" | "medium" | "high" | "critical"

export type RiskTier = {
  id: RiskTierId
  label: string
  band: string
}

export function matrixScore(likelihood: number, severity: number) {
  return likelihood * severity
}

export function riskTier(score: number): RiskTier {
  if (score >= 20) {
    return {
      id: "critical",
      label: "Extremely High Risk / Critical",
      band: "20–25",
    }
  }
  if (score >= 17) {
    return { id: "high", label: "High Risk", band: "17–19" }
  }
  if (score >= 10) {
    return { id: "high", label: "High Risk", band: "10–16" }
  }
  if (score >= 5) {
    return { id: "medium", label: "Medium Risk", band: "5–9" }
  }
  return { id: "low", label: "Low Risk", band: "1–4" }
}

export function requiresRiskManagementPlan(score: number) {
  return score >= 5
}

export function addMonths(isoDate: string, months: number) {
  const date = new Date(`${isoDate}T00:00:00Z`)
  date.setUTCMonth(date.getUTCMonth() + months)
  return date.toISOString().slice(0, 10)
}

export function riskReviewOverdue(lastReview: string | null, asOf = AUDIT_AS_OF) {
  if (!lastReview) return true
  return addMonths(lastReview, 3) < asOf
}
