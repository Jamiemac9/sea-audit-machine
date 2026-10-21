import { countReceived, WR_CODES, type WrCode } from "@/lib/documents"
import { analyseFormatting } from "@/lib/feedback"
import type { RubricMark } from "@/lib/rubric"
import {
  matrixScore,
  requiresRiskManagementPlan,
  riskReviewOverdue,
} from "@/lib/risk"

export const AUDIT_RATINGS = ["Gold", "Green", "Amber", "Red"] as const

export type AuditRating = (typeof AUDIT_RATINGS)[number]

export type AuditStatus =
  | "Files Requested"
  | "Docs Received"
  | "Awaiting More Info"
  | "Audit in Progress"
  | "Audit Complete"

export const AUDIT_STATUSES: AuditStatus[] = [
  "Files Requested",
  "Docs Received",
  "Awaiting More Info",
  "Audit in Progress",
  "Audit Complete",
]

export type ResidentBundleFile = {
  id: string
  name: string
  text: string
  classifiedAs: WrCode | "evidence" | "session" | "unclassified"
  uploadedAt: string
}

export type ResidentFile = {
  id: string
  reference: string
  managingAgent: string
  managingAgentId?: string
  registeredProviderId?: string
  propertyAddress?: string
  documentDeadline: string
  reRequestDeadline?: string | null
  teamsCall: string | null
  status: AuditStatus
  likelihood: number
  severity: number
  scoreOnForm: number
  riskManagementPlan: boolean
  lastRiskReview: string | null
  activeGoals: number
  weeklySupportMinutes: number
  residentVoice: boolean
  nonEngagement: boolean
  warningTrackComplete: boolean
  followUpRecorded: boolean
  relevancy: "strong" | "general" | "limited" | "poor"
  arrearsWeeks: number
  seaEligibilityRecorded: boolean
  received: Record<WrCode, boolean>
  ocrText: string
  bundleFiles: ResidentBundleFile[]
  supportDelivered: string
  feedbackOnSupport: string
  feedbackCategories: string[]
  observation: string
  marks: Record<string, RubricMark>
  projectId: string
  signedOff: boolean
  markedDownItems: string[]
  proceedAfterMarkDown: boolean
  extractedGoals: string[]
  extractedSupportByGoal: string
  pointsOfStrength: string[]
  nextSteps: string[]
  gateEmailDraft?: string
}

export type RatingResult = {
  rating: AuditRating
  reasons: string[]
}

export function rateFile(file: ResidentFile): RatingResult {
  const score = matrixScore(file.likelihood, file.severity)
  const formattingIssues = analyseFormatting(
    file.supportDelivered,
    file.feedbackOnSupport,
  )
  const red: string[] = []
  const amber: string[] = []
  const minor: string[] = []

  if (file.weeklySupportMinutes < 60) {
    red.push("WR-13 does not evidence the weekly 1-hour support requirement.")
  }
  if (requiresRiskManagementPlan(score) && !file.riskManagementPlan) {
    red.push(
      "Matrix score is 5 or above and WR-09 has no Risk Management Plan.",
    )
  }
  if (file.nonEngagement && !file.warningTrackComplete) {
    red.push(
      "Non-engagement is recorded without the WR-16, WR-17, and WR-18 warning track.",
    )
  }
  if (file.relevancy === "poor") {
    red.push("Support on the file is not relevant to the assessed needs.")
  }

  const marked = file.markedDownItems ?? []
  if (marked.some((id) => /WR-13|WR-09|WR-11|EVIDENCE/.test(id))) {
    red.push(
      "Core items were not received after request and have been marked down as failed.",
    )
  } else if (marked.length > 0) {
    amber.push(
      "Requested documents remained outstanding after the re-request deadline and were marked down.",
    )
  }

  if (file.scoreOnForm !== score) {
    amber.push(
      `The score written on the form (${file.scoreOnForm}) does not match likelihood × severity (${score}).`,
    )
  }
  if (file.activeGoals < 5) {
    amber.push(
      "WR-11 has fewer than 5 active goals, so the SEA eligibility rule is not met.",
    )
  }
  if (!file.seaEligibilityRecorded) {
    amber.push("WR-01 does not record the SEA eligibility justification.")
  }
  if (!file.followUpRecorded) {
    amber.push("WR-13 follow-up actions are missing.")
  }
  if (formattingIssues.length > 0) {
    amber.push(formattingIssues[0])
  }
  if (riskReviewOverdue(file.lastRiskReview)) {
    amber.push("WR-08 / WR-09 is outside the 3-month review cycle.")
  }
  if (file.arrearsWeeks >= 8) {
    amber.push("WR-07 service-charge arrears have reached the 8-week threshold.")
  }
  const coreMissing = (["WR-01", "WR-08", "WR-11", "WR-13"] as WrCode[]).filter(
    (code) => !file.received[code],
  )
  if (coreMissing.length > 0 && !file.proceedAfterMarkDown) {
    amber.push(`Core documents are missing: ${coreMissing.join(", ")}.`)
  }

  if (countReceived(file.received) < WR_CODES.length) {
    minor.push("Not every document from WR-01 to WR-22 is on the file.")
  }
  if (!file.residentVoice) {
    minor.push("Resident voice is thin in the support record.")
  }
  if (file.relevancy === "limited") {
    minor.push("Support is mostly relevant, with some exceptions.")
  }

  if (red.length > 0) return { rating: "Red", reasons: red }
  if (amber.length > 0) return { rating: "Amber", reasons: amber }
  if (minor.length > 0) return { rating: "Green", reasons: minor }
  return {
    rating: "Gold",
    reasons: [
      "Documentation, matrix scoring, risk plans, relevancy, 1-hour evidence, and resident voice meet the file standard.",
    ],
  }
}
