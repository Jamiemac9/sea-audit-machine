import type { AuditScore, CrmStatus, FeedbackTier } from "@/lib/types"

export type PillOption<T extends string> = {
  value: T
  label: string
  bg: string
  fg: string
}

export const CRM_OPTIONS: readonly PillOption<CrmStatus>[] = [
  { value: "Files Requested", label: "Files Requested", bg: "#0073ea", fg: "#ffffff" },
  { value: "Docs Received", label: "Docs Received", bg: "#f5d000", fg: "#3b3200" },
  { value: "Awaiting More Info", label: "Awaiting More Info", bg: "#a25ddc", fg: "#ffffff" },
  { value: "Audit in Progress", label: "Audit in Progress", bg: "#ff6d3b", fg: "#ffffff" },
  { value: "Audit Complete", label: "Audit Complete", bg: "#00c875", fg: "#ffffff" },
  { value: "Teams Call Scheduled", label: "Teams Call Scheduled", bg: "#f0a202", fg: "#3b2800" },
]

export const SCORE_OPTIONS: readonly PillOption<AuditScore>[] = [
  { value: "unscored", label: "Unscored", bg: "#7d808a", fg: "#ffffff" },
  { value: "gold", label: "Gold", bg: "#e6b325", fg: "#3a2c00" },
  { value: "green", label: "Green", bg: "#00c875", fg: "#ffffff" },
  { value: "amber", label: "Amber", bg: "#f08a24", fg: "#ffffff" },
  { value: "red", label: "Red", bg: "#e11d48", fg: "#ffffff" },
]

export const TIER_OPTIONS: readonly PillOption<Exclude<FeedbackTier, "">>[] = [
  { value: "Excellent", label: "Excellent", bg: "#00c875", fg: "#ffffff" },
  { value: "Strong", label: "Strong", bg: "#0073ea", fg: "#ffffff" },
  { value: "Improvement Required", label: "Improvement Required", bg: "#f0a202", fg: "#3b2800" },
  { value: "Concern", label: "Concern", bg: "#e11d48", fg: "#ffffff" },
]

export const SCORE_LABEL: Record<AuditScore, string> = {
  unscored: "Unscored",
  gold: "Gold",
  green: "Green",
  amber: "Amber",
  red: "Red",
}

export function pillForScore(score: AuditScore) {
  return SCORE_OPTIONS.find((option) => option.value === score) ?? SCORE_OPTIONS[0]
}

export function pillForStatus(status: CrmStatus) {
  return CRM_OPTIONS.find((option) => option.value === status) ?? CRM_OPTIONS[0]
}
