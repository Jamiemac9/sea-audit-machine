import { RISK_AREAS, RUBRIC_SECTIONS, WR_FORMS } from "@/lib/rubric-content"
import type {
  AuditEvaluation,
  AuditScore,
  CheckAnswer,
  FeedbackTier,
  FormStatus,
  ResidentFile,
  RiskScore,
} from "@/lib/types"

const TIERS = new Set<FeedbackTier>([
  "",
  "Excellent",
  "Strong",
  "Improvement Required",
  "Concern",
])
const ANSWERS = new Set<CheckAnswer>(["", "yes", "partial", "no"])
const FORM_STATUSES = new Set<FormStatus>(["", "ok", "discrepancy", "missing"])

export const RATING_RATIONALE: Record<AuditScore, string> = {
  unscored: "",
  gold: [
    "The file meets the SEA standard across assessment, licence, risk, support planning, and weekly sessions.",
    "Matrix scores are valid 5×5 products, and every risk of 5 or above has a Risk Management Plan.",
    "At least five active goals stay open, and the notes record what the support worker did.",
  ].join("\n"),
  green: [
    "The file is sound, with only minor gaps that do not undermine SEA eligibility or resident safety.",
    "Matrix scoring and the weekly support hour are in place, with small administrative points to tidy.",
  ].join("\n"),
  amber: [
    "Improvement is required before this file can be treated as audit-complete.",
    "Agree a re-request deadline and a Teams call so the managing agent can close the gaps.",
  ].join("\n"),
  red: [
    "The file raises a concern that needs a remediation plan before it is returned.",
    "Core safety, risk, or support-hour evidence is not in place.",
  ].join("\n"),
}

export function emptyAudit(): AuditEvaluation {
  const tiers: AuditEvaluation["tiers"] = {}
  const checks: AuditEvaluation["checks"] = {}
  const narratives: AuditEvaluation["narratives"] = {}
  for (const section of RUBRIC_SECTIONS) {
    tiers[section.id] = ""
    narratives[section.id] = ""
    for (const check of section.checks) {
      checks[check.id] = { answer: "", note: "" }
    }
  }
  return {
    tiers,
    checks,
    narratives,
    risks: RISK_AREAS.map((area) => ({
      id: area.id,
      likelihood: null,
      severity: null,
      writtenScore: "",
      justification: "",
      triggers: "",
      planComplete: false,
      staffEyesOnly: false,
    })),
    reviewMonths: { m3: false, m6: false, m9: false, m12: false },
    newRisksAdded: false,
    goals: Array.from({ length: 5 }, (_, index) => ({
      id: `goal-${index + 1}`,
      title: "",
      active: true,
      targetDate: "",
      actionPlan: "",
      supportBullets: "",
    })),
    moveInDateUsedAsTarget: false,
    reviewsEvery3Months: false,
    residentReflections: "",
    strengths: "",
    nextSteps: "",
    relevancy: "",
    followUp: "",
    resources: "",
    evidence: "",
    practical: "",
    duplication: "",
    generalNotes: "",
    previousAuditFollowUp: "",
    rentCorrections: "",
    formNotes: WR_FORMS.map((form) => ({
      code: form.code,
      title: form.title,
      status: "",
      note: "",
    })),
    ratingRationale: "",
  }
}

function text(value: unknown, max = 8000) {
  return typeof value === "string" ? value.slice(0, max) : ""
}

function level(value: unknown) {
  const number = typeof value === "number" ? value : Number(value)
  if (!Number.isInteger(number) || number < 1 || number > 5) return null
  return number
}

function asRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {}
}

export function mergeAudit(input: unknown): AuditEvaluation {
  const base = emptyAudit()
  const raw = asRecord(input)
  const rawTiers = asRecord(raw.tiers)
  const rawChecks = asRecord(raw.checks)
  const rawNarratives = asRecord(raw.narratives)
  const rawRisks = Array.isArray(raw.risks) ? raw.risks : []
  const rawGoals = Array.isArray(raw.goals) ? raw.goals : []
  const rawForms = Array.isArray(raw.formNotes) ? raw.formNotes : []
  const months = asRecord(raw.reviewMonths)

  for (const section of Object.keys(base.tiers)) {
    const tier = rawTiers[section]
    if (typeof tier === "string" && TIERS.has(tier as FeedbackTier)) {
      base.tiers[section] = tier as FeedbackTier
    }
    base.narratives[section] = text(rawNarratives[section], 12000)
  }

  for (const checkId of Object.keys(base.checks)) {
    const check = asRecord(rawChecks[checkId])
    const answer = check.answer
    base.checks[checkId] = {
      answer: typeof answer === "string" && ANSWERS.has(answer as CheckAnswer)
        ? (answer as CheckAnswer)
        : "",
      note: text(check.note, 2000),
    }
  }

  base.risks = base.risks.map((risk) => {
    const found = rawRisks.map(asRecord).find((item) => item.id === risk.id) ?? {}
    const next: RiskScore = {
      ...risk,
      likelihood: level(found.likelihood),
      severity: level(found.severity),
      writtenScore: text(found.writtenScore, 12),
      justification: text(found.justification, 4000),
      triggers: text(found.triggers, 2000),
      planComplete: found.planComplete === true,
      staffEyesOnly: found.staffEyesOnly === true,
    }
    return next
  })

  base.reviewMonths = {
    m3: months.m3 === true,
    m6: months.m6 === true,
    m9: months.m9 === true,
    m12: months.m12 === true,
  }
  base.newRisksAdded = raw.newRisksAdded === true
  base.moveInDateUsedAsTarget = raw.moveInDateUsedAsTarget === true
  base.reviewsEvery3Months = raw.reviewsEvery3Months === true
  base.residentReflections = text(raw.residentReflections, 8000)
  base.strengths = text(raw.strengths, 8000)
  base.nextSteps = text(raw.nextSteps, 8000)
  base.relevancy = text(raw.relevancy, 8000)
  base.followUp = text(raw.followUp, 8000)
  base.resources = text(raw.resources, 8000)
  base.evidence = text(raw.evidence, 8000)
  base.practical = text(raw.practical, 8000)
  base.duplication = text(raw.duplication, 8000)
  base.generalNotes = text(raw.generalNotes, 12000)
  base.previousAuditFollowUp = text(raw.previousAuditFollowUp, 8000)
  base.rentCorrections = text(raw.rentCorrections, 8000)
  base.ratingRationale = text(raw.ratingRationale, 8000)

  if (rawGoals.length > 0) {
    base.goals = rawGoals.slice(0, 20).map((goal, index) => {
      const item = asRecord(goal)
      return {
        id: text(item.id, 80) || `goal-${index + 1}`,
        title: text(item.title, 500),
        active: item.active !== false,
        targetDate: text(item.targetDate, 20),
        actionPlan: text(item.actionPlan, 4000),
        supportBullets: text(item.supportBullets, 8000),
      }
    })
  }

  base.formNotes = base.formNotes.map((note) => {
    const found = rawForms.map(asRecord).find((item) => item.code === note.code) ?? {}
    const status = found.status
    return {
      ...note,
      status:
        typeof status === "string" && FORM_STATUSES.has(status as FormStatus)
          ? (status as FormStatus)
          : "",
      note: text(found.note, 2000),
    }
  })

  return base
}

const SCORES = new Set<AuditScore>(["unscored", "gold", "green", "amber", "red"])

export function newResidentFile(input: {
  id: string
  agentId: string
  fileName: string
  mimeType: string
  byteSize: number
  extractText: string
  extractEngine: string
  extractError: string
  previewHtml: string
}): ResidentFile {
  return {
    id: input.id,
    agentId: input.agentId,
    fileName: input.fileName,
    mimeType: input.mimeType,
    byteSize: input.byteSize,
    uploadedAt: new Date().toISOString(),
    scoredAt: "",
    extractText: input.extractText,
    extractEngine: input.extractEngine,
    extractError: input.extractError,
    previewHtml: input.previewHtml,
    score: "unscored",
    audit: emptyAudit(),
  }
}

export function coerceScore(value: unknown): AuditScore {
  return typeof value === "string" && SCORES.has(value as AuditScore)
    ? (value as AuditScore)
    : "unscored"
}

export function rationaleForScore(current: string, score: AuditScore) {
  const templates = new Set(Object.values(RATING_RATIONALE))
  if (!current.trim() || templates.has(current)) return RATING_RATIONALE[score]
  return current
}
