export type CaseloadGroup = "active" | "first-time"

export type CrmStatus =
  | "Files Requested"
  | "Docs Received"
  | "Awaiting More Info"
  | "Audit in Progress"
  | "Audit Complete"
  | "Teams Call Scheduled"

export type AuditScore = "unscored" | "gold" | "green" | "amber" | "red"

export type FeedbackTier =
  | ""
  | "Excellent"
  | "Strong"
  | "Improvement Required"
  | "Concern"

export type CheckAnswer = "" | "yes" | "partial" | "no"

export type FormStatus = "" | "ok" | "discrepancy" | "missing"

export type Profile = {
  name: string
  role: string
  email: string
  defaultClientRpName: string
}

export type ManagingAgent = {
  id: string
  name: string
  group: CaseloadGroup
  propertiesUnits: string
  docsDeadline: string
  docsReceived: string
  crmStatus: CrmStatus
  overallScore: AuditScore
  reRequestDeadline: string
  teamsCallDate: string
}

export type RentSchedule = {
  id: string
  propertyName: string
  legalEntity: string
  address: string
  weeklyRent: string
  licenceCharge: string
  serviceCharge: string
  notes: string
}

export type RiskScore = {
  id: string
  likelihood: number | null
  severity: number | null
  writtenScore: string
  justification: string
  triggers: string
  planComplete: boolean
  staffEyesOnly: boolean
}

export type Goal = {
  id: string
  title: string
  active: boolean
  targetDate: string
  actionPlan: string
  supportBullets: string
}

export type FormNote = {
  code: string
  title: string
  status: FormStatus
  note: string
}

export type CheckState = {
  answer: CheckAnswer
  note: string
}

export type AuditEvaluation = {
  tiers: Record<string, FeedbackTier>
  checks: Record<string, CheckState>
  narratives: Record<string, string>
  risks: RiskScore[]
  reviewMonths: { m3: boolean; m6: boolean; m9: boolean; m12: boolean }
  newRisksAdded: boolean
  goals: Goal[]
  moveInDateUsedAsTarget: boolean
  reviewsEvery3Months: boolean
  residentReflections: string
  strengths: string
  nextSteps: string
  relevancy: string
  followUp: string
  resources: string
  evidence: string
  practical: string
  duplication: string
  generalNotes: string
  previousAuditFollowUp: string
  rentCorrections: string
  formNotes: FormNote[]
  ratingRationale: string
}

export type ResidentFile = {
  id: string
  agentId: string
  fileName: string
  mimeType: string
  byteSize: number
  uploadedAt: string
  scoredAt: string
  extractText: string
  extractEngine: string
  extractError: string
  previewHtml: string
  score: AuditScore
  audit: AuditEvaluation
}

export type Snapshot = {
  profile: Profile
  agents: ManagingAgent[]
  rentSchedules: RentSchedule[]
  files: ResidentFile[]
  selectedFileId: string
}
