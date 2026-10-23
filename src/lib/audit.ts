/**
 * Audit domain vocabulary and formatting.
 *
 * There is deliberately no compliance score and no function that turns a number
 * into a rating. A rating is reasoned by a human from the support position and
 * the document position separately, and always carries a written reason.
 * See docs/audit-rules.md.
 */

export type Rating = "GOLD" | "GREEN" | "AMBER" | "RED"
export type RoundFormat = "FIRST_AUDIT" | "REPEAT"
export type RoundStatus = "INTAKE" | "CHECKING" | "REVIEW" | "ISSUED"
export type Stream = "DOCUMENTATION" | "SUPPORT"
export type FindingSeverity = "INFORMATIONAL" | "ISSUE" | "SERIOUS"
export type FindingStatus = "PROPOSED" | "CONFIRMED" | "DISMISSED"

export const RATINGS: Rating[] = ["GOLD", "GREEN", "AMBER", "RED"]

export const RATING_LABEL: Record<Rating, string> = {
  GOLD: "Gold",
  GREEN: "Green",
  AMBER: "Amber",
  RED: "Red",
}

/** The band definitions, shown in the UI so the key is never guessed at. */
export const RATING_DEFINITION: Record<Rating, string> = {
  GOLD: "Everything documented, everything evidenced, and the support is meaningful. All three, or it is not Gold.",
  GREEN:
    "Relevant support delivered and evidenced against the resident's goals, and the document set is sound with at most minor gaps.",
  AMBER:
    "Support was delivered but something falls short — goals carried with no work against them, support not reaching the hour, outcomes not evidenced, or a document set weak enough that what was delivered has to be inferred.",
  RED: "Critical only. An extreme lack of support, or records that cannot be relied on because they are duplicated, copied between residents or fabricated.",
}

export const ROUND_FORMAT_LABEL: Record<RoundFormat, string> = {
  FIRST_AUDIT: "First audit",
  REPEAT: "Repeat audit",
}

export const ROUND_STATUS_LABEL: Record<RoundStatus, string> = {
  INTAKE: "Intake",
  CHECKING: "Checking",
  REVIEW: "Review",
  ISSUED: "Issued",
}

export const STREAM_LABEL: Record<Stream, string> = {
  DOCUMENTATION: "Documentation",
  SUPPORT: "Support",
}

/** Risk grading by the number bands. Cell colours on matrix images do not match. */
export function riskBand(score: number | null | undefined) {
  if (score == null) return null
  if (score <= 4) return "Low"
  if (score <= 9) return "Medium"
  if (score <= 16) return "High"
  return "Extremely High / Critical"
}

/** A score must be a product of 1-5 x 1-5. 7, 11, 13 and 14 are not. */
const POSSIBLE_SCORES = new Set<number>()
for (let l = 1; l <= 5; l += 1) {
  for (let s = 1; s <= 5; s += 1) POSSIBLE_SCORES.add(l * s)
}

export function isPossibleRiskScore(score: number) {
  return POSSIBLE_SCORES.has(score)
}

/** A Risk Management Plan is required at 5 or above. */
export const RMP_THRESHOLD = 5

/** Eligibility basis: at least five active goals at all times. */
export const MINIMUM_ACTIVE_GOALS = 5

/** Minimum relevant support per resident per week, room checks excluded. */
export const MINIMUM_WEEKLY_SUPPORT_MINS = 60

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
})

const shortDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
})

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
  hourCycle: "h23",
})

const numberFormatter = new Intl.NumberFormat("en-GB")

export function formatAuditDate(value: Date | string | null | undefined) {
  if (!value) return "—"
  return dateFormatter.format(new Date(value))
}

/** The form convention: 11/08/2026. Used in finding document references. */
export function formatFormDate(value: Date | string | null | undefined) {
  if (!value) return "—"
  return shortDateFormatter.format(new Date(value))
}

export function formatAuditDateTime(value: Date | string | null | undefined) {
  if (!value) return "—"
  return dateTimeFormatter.format(new Date(value))
}

export function formatCount(value: number) {
  return numberFormatter.format(value)
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * The document codes the classifier recognises by default.
 *
 * These are one provider's internal references, not a sector standard. A
 * commissioned audit is run against the client's own pack, so this list is a
 * configurable default rather than something to build rules around.
 */
export const WR_CODES = [
  { code: "WR-01", name: "Initial assessment" },
  { code: "WR-02", name: "Licence agreement" },
  { code: "WR-03", name: "Personal details and emergency contact" },
  { code: "WR-05", name: "Missing person form" },
  { code: "WR-08", name: "Risk matrix" },
  { code: "WR-09", name: "Risk assessment" },
  { code: "WR-10", name: "Risk management plan" },
  { code: "WR-11", name: "Support plan" },
  { code: "WR-12", name: "Review" },
  { code: "WR-13", name: "Support session record" },
  { code: "WR-14", name: "Contact and support log" },
  { code: "WR-16", name: "Supporting evidence" },
  { code: "WR-17", name: "Warning notice" },
  { code: "WR-19", name: "Licence conditions acknowledgement" },
  { code: "WR-20", name: "Exit form" },
] as const

export type WrCode = (typeof WR_CODES)[number]["code"]

export const WR_CODE_SET = new Set<string>(WR_CODES.map((item) => item.code))

export function wrCodeName(code: string | null | undefined) {
  if (!code) return null
  return WR_CODES.find((item) => item.code === code)?.name ?? null
}

/**
 * Reviews fall due at 3, 6 and 9 months from move-in, and are only reported
 * once due — a resident who has not been in long enough is N/A, not overdue.
 */
export function reviewsDue(moveInDate: Date | null, asAt = new Date()) {
  if (!moveInDate) return [] as (3 | 6 | 9)[]
  const due: (3 | 6 | 9)[] = []
  for (const months of [3, 6, 9] as const) {
    const when = new Date(moveInDate)
    when.setMonth(when.getMonth() + months)
    if (when <= asAt) due.push(months)
  }
  return due
}
