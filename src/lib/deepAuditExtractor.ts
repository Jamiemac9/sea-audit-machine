import {
  findManagingAgentByName,
  rentScheduleForAddress,
  type ManagingAgentProfile,
} from "@/lib/directory"
import { AGENT_TOKEN, CLIENT_TOKEN, type WrCode } from "@/lib/documents"
import type { ResidentBundleFile, ResidentFile } from "@/lib/rating"

/** Valid 5×5 matrix products (likelihood × severity). */
export const VALID_MATRIX_SCORES = [
  1, 2, 3, 4, 5, 6, 8, 9, 10, 12, 15, 16, 20, 25,
] as const

export type RiskScoreRow = {
  category: string
  score: number | null
  valid: boolean
  hasManagementPlan: boolean
  triggers: string
  review3m: boolean
  review6m: boolean
  review9m: boolean
  review12m: boolean
}

export type SupportGoal = {
  title: string
  targetDate: string | null
  targetEqualsMoveIn: boolean
  active: boolean
}

export type GoalSupportEntry = {
  goalTitle: string
  interventions: string[]
}

export type DeepAuditExtraction = {
  wr01: {
    supportNeeds: string[]
    benefits: { name: string; amount: string | null }[]
    section11Risks: string[]
    needsMatchWr09: boolean | null
    needsMatchWr11: boolean | null
  }
  wr02: {
    rentAmount: number | null
    licenceCharge: number | null
    entityAddress: string | null
    scheduleMatch: boolean | null
    addressMatch: boolean | null
    scheduleRent: number | null
    scheduleServiceCharge: number | null
  }
  wr07: {
    serviceCharge: number | null
    arrearsWeeks: number | null
    scheduleMatch: boolean | null
  }
  wr09: {
    scores: RiskScoreRow[]
    invalidScores: number
    plansMissingForHighScores: string[]
  }
  wr11: {
    goals: SupportGoal[]
    activeCount: number
    meetsFiveGoalRule: boolean
    goalTitlesForReport: string[]
  }
  wr12: {
    reviewPresent: boolean
    goalsReviewed: string[]
  }
  wr13: {
    supportByGoal: GoalSupportEntry[]
    phrasedInterventions: string[]
    evidenceQuotes: string[]
  }
  qualitative: {
    pointsOfStrength: string[]
    nextSteps: string[]
    masterlistHints: Record<string, string[]>
  }
  reportBoxes: {
    selectedGoals: string
    supportPerGoal: string
  }
}

const DEFAULT_RISK_CATEGORIES = [
  "Self-harm / suicide",
  "Violence / aggression",
  "Substance misuse",
  "Neglect of self",
  "Exploitation",
  "Fire safety",
  "Anti-social behaviour",
  "Mental health crisis",
  "Absconding / missing",
  "Financial vulnerability",
  "Physical health",
  "Safeguarding others",
]

function combinedText(file: ResidentFile) {
  const bundle = file.bundleFiles?.map((item) => item.text).join("\n\n") ?? ""
  return `${file.ocrText}\n\n${bundle}`
}

function money(match: RegExpMatchArray | null) {
  if (!match?.[1]) return null
  const value = Number(match[1].replace(/,/g, ""))
  return Number.isFinite(value) ? value : null
}

function extractList(text: string, patterns: RegExp[]) {
  const found: string[] = []
  for (const pattern of patterns) {
    const global = new RegExp(
      pattern.source,
      pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`,
    )
    for (const match of text.matchAll(global)) {
      const value = (match[1] ?? match[0]).trim()
      if (value && !found.includes(value)) found.push(value)
    }
  }
  return found
}

function phraseIntervention(raw: string) {
  const cleaned = raw.replace(/^[-•*\d.)\s]+/, "").trim()
  if (!cleaned) return ""
  if (
    /^(supported|completed|provided|arranged|accompanied|advocated)/i.test(
      cleaned,
    )
  ) {
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  }
  if (/referral/i.test(cleaned)) {
    return `Completed a referral to ${cleaned.replace(/^.*referral\s*(to\s*)?/i, "").trim() || "a support service"}`
  }
  if (/guidance|advice|explained/i.test(cleaned)) {
    return `Provided guidance on ${cleaned.replace(/^(provided\s+)?(guidance|advice)\s+(on\s+)?/i, "").trim()}`
  }
  return `Supported resident to ${cleaned.charAt(0).toLowerCase()}${cleaned.slice(1)}`
}

function parseGoals(text: string): SupportGoal[] {
  const goals: SupportGoal[] = []
  const moveIn =
    text.match(/move[- ]?in(?:\s+date)?[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2})/i)?.[1] ??
    null

  const goalBlocks = [
    ...text.matchAll(
      /(?:goal|support\s+goal)\s*#?\s*\d*[:.\s-]+([^\n]+?)(?:\n|$)/gi,
    ),
    ...text.matchAll(
      /selected\s+support\s+goals?[:\s]+([\s\S]*?)(?:\n\n|WR-\d{2}|$)/gi,
    ),
  ]

  for (const match of goalBlocks) {
    const chunk = match[1]
    if (chunk.includes("\n") || chunk.includes(";")) {
      for (const part of chunk.split(/[\n;•]+/)) {
        const title = part.replace(/^[-*\d.)\s]+/, "").trim()
        if (title.length < 3) continue
        const target =
          title.match(
            /(?:target|achieve(?:ment)?\s+date)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2})/i,
          )?.[1] ?? null
        const cleanTitle = title
          .replace(
            /\s*(?:target|achieve(?:ment)?\s+date)[:\s]+.+$/i,
            "",
          )
          .trim()
        if (!cleanTitle) continue
        goals.push({
          title: cleanTitle,
          targetDate: target,
          targetEqualsMoveIn: Boolean(
            target && moveIn && target.replace(/\//g, "-") === moveIn.replace(/\//g, "-"),
          ),
          active: !/closed|achieved|inactive/i.test(title),
        })
      }
    } else {
      const title = chunk.trim()
      if (title.length < 3) continue
      const target =
        text.match(
          new RegExp(
            `${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]{0,80}(?:target|achieve(?:ment)?\\s+date)[:\\s]+(\\d{1,2}[\\/\\-]\\d{1,2}[\\/\\-]\\d{2,4}|\\d{4}-\\d{2}-\\d{2})`,
            "i",
          ),
        )?.[1] ?? null
      goals.push({
        title,
        targetDate: target,
        targetEqualsMoveIn: Boolean(target && moveIn && target === moveIn),
        active: true,
      })
    }
  }

  if (goals.length === 0) {
    const countMatch = text.match(/(\d+)\s+active\s+goals?/i)
    const count = countMatch ? Number(countMatch[1]) : 0
    for (let i = 0; i < count; i += 1) {
      goals.push({
        title: `Active support goal ${i + 1}`,
        targetDate: null,
        targetEqualsMoveIn: false,
        active: true,
      })
    }
  }

  const unique = new Map<string, SupportGoal>()
  for (const goal of goals) {
    if (!unique.has(goal.title.toLowerCase())) {
      unique.set(goal.title.toLowerCase(), goal)
    }
  }
  return [...unique.values()]
}

function parseRiskScores(text: string): RiskScoreRow[] {
  const rows: RiskScoreRow[] = []
  for (const category of DEFAULT_RISK_CATEGORIES) {
    const escaped = category.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const scoreMatch = text.match(
      new RegExp(`${escaped}[^\\d]{0,40}(\\d{1,2})`, "i"),
    )
    const score = scoreMatch ? Number(scoreMatch[1]) : null
    const planNear =
      score != null &&
      new RegExp(
        `${escaped}[\\s\\S]{0,220}(risk\\s+management\\s+plan|rmp|controls?|triggers?)`,
        "i",
      ).test(text)
    const triggers =
      text.match(
        new RegExp(
          `${escaped}[\\s\\S]{0,220}triggers?[:\\s]+([^\\n]+)`,
          "i",
        ),
      )?.[1]?.trim() ?? ""
    rows.push({
      category,
      score,
      valid: score != null && VALID_MATRIX_SCORES.includes(score as (typeof VALID_MATRIX_SCORES)[number]),
      hasManagementPlan: planNear || (score != null && score < 5),
      triggers,
      review3m: /3[\s-]*month/i.test(text),
      review6m: /6[\s-]*month/i.test(text),
      review9m: /9[\s-]*month/i.test(text),
      review12m: /12[\s-]*month/i.test(text),
    })
  }

  // Fallback: capture generic "score: N" lines if categories not named
  if (rows.every((row) => row.score == null)) {
    const generic = [...text.matchAll(/risk\s*(?:score|rating)?\s*[:=]?\s*(\d{1,2})/gi)]
    generic.slice(0, 12).forEach((match, index) => {
      const score = Number(match[1])
      rows[index] = {
        ...rows[index],
        score,
        valid: VALID_MATRIX_SCORES.includes(score as (typeof VALID_MATRIX_SCORES)[number]),
        hasManagementPlan: score < 5 || /risk management plan/i.test(text),
      }
    })
  }

  return rows
}

function nearAmounts(text: string) {
  const rent =
    money(text.match(/(?:weekly\s+)?(?:rent|licence\s+charge)[:\s£]*([\d,.]+)/i)) ??
    money(text.match(/£\s*([\d,.]+)\s*(?:per\s+week|pw|weekly).*rent/i))
  const service =
    money(text.match(/(?:weekly\s+)?service\s+charge[:\s£]*([\d,.]+)/i)) ??
    money(text.match(/£\s*([\d,.]+)\s*(?:per\s+week|pw|weekly).*service/i))
  return { rent, service }
}

export function deepAuditExtract(
  file: ResidentFile,
  options?: {
    managingAgents?: ManagingAgentProfile[]
    clientLabel?: string
  },
): DeepAuditExtraction {
  const text = combinedText(file)
  const agent = findManagingAgentByName(
    options?.managingAgents ?? [],
    file.managingAgent,
  )
  const amounts = nearAmounts(text)
  const entityAddress =
    text.match(
      /(?:registered|licence|property)\s+address[:\s]+([^\n]+)/i,
    )?.[1]?.trim() ?? null
  const schedule = rentScheduleForAddress(
    agent,
    entityAddress ?? file.reference,
  )

  const goals = parseGoals(text)
  const activeGoals = goals.filter((goal) => goal.active)
  const riskScores = parseRiskScores(text)
  const highMissing = riskScores
    .filter(
      (row) =>
        row.score != null && row.score >= 5 && !row.hasManagementPlan,
    )
    .map((row) => row.category)

  const supportNeeds = extractList(text, [
    /support\s+needs?[:\s]+([^\n]+)/gi,
    /stated\s+needs?[:\s]+([^\n]+)/gi,
  ])
  const benefits = [
    ...text.matchAll(
      /(universal\s+credit|housing\s+benefit|pip|esa|jsa)[^£\n]{0,40}£?\s*([\d,.]+)?/gi,
    ),
  ].map((match) => ({
    name: match[1],
    amount: match[2] ? `£${match[2]}` : null,
  }))
  const section11 = extractList(text, [
    /section\s*11[^:\n]*[:\s]+([^\n]+)/gi,
    /initial\s+risk\s+(?:flag|disclosure)s?[:\s]+([^\n]+)/gi,
  ])

  const interventions = [
    ...text.matchAll(
      /(?:^|\n)\s*[-•*]\s*((?:supported|completed|provided|arranged)[^\n]+)/gi,
    ),
  ].map((match) => phraseIntervention(match[1]))

  const supportByGoal: GoalSupportEntry[] = activeGoals.map((goal) => {
    const linked = interventions.filter((line) =>
      line.toLowerCase().includes(goal.title.toLowerCase().slice(0, 12)),
    )
    return {
      goalTitle: goal.title,
      interventions:
        linked.length > 0
          ? linked
          : interventions.slice(0, 2).map((line) => line),
    }
  })

  const evidenceQuotes = [
    ...text.matchAll(/"([^"]{20,180})"/g),
  ]
    .map((match) => match[1].trim())
    .slice(0, 6)

  const needsMatchWr09 =
    supportNeeds.length === 0
      ? null
      : supportNeeds.some((need) =>
          riskScores.some(
            (row) =>
              row.score != null &&
              need.toLowerCase().includes(row.category.toLowerCase().slice(0, 8)),
          ),
        )
  const needsMatchWr11 =
    supportNeeds.length === 0 || activeGoals.length === 0
      ? null
      : supportNeeds.some((need) =>
          activeGoals.some((goal) =>
            goal.title.toLowerCase().includes(need.toLowerCase().slice(0, 8)),
          ),
        )

  const scheduleRent = schedule?.weeklyRent ?? null
  const scheduleService = schedule?.weeklyServiceCharge ?? null
  const rentMatch =
    amounts.rent != null && scheduleRent != null
      ? Math.abs(amounts.rent - scheduleRent) < 0.05
      : null
  const serviceMatch =
    amounts.service != null && scheduleService != null
      ? Math.abs(amounts.service - scheduleService) < 0.05
      : null
  const addressMatch =
    entityAddress && agent
      ? agent.registeredAddress
          .toLowerCase()
          .includes(entityAddress.toLowerCase().slice(0, 12)) ||
        entityAddress
          .toLowerCase()
          .includes(agent.registeredAddress.toLowerCase().slice(0, 12)) ||
        agent.assignedProperties.some((property) =>
          property.toLowerCase().includes(entityAddress.toLowerCase().slice(0, 12)),
        )
      : null

  const goalTitles = activeGoals.map((goal) => goal.title)
  const supportPerGoal = supportByGoal
    .map(
      (entry) =>
        `${entry.goalTitle}\n${entry.interventions.map((line) => `- ${line}`).join("\n")}`,
    )
    .join("\n\n")

  const pointsOfStrength: string[] = []
  if (activeGoals.length >= 5) {
    pointsOfStrength.push(
      `WR-11 records ${activeGoals.length} active goals, meeting the SEA eligibility threshold.`,
    )
  }
  if (file.weeklySupportMinutes >= 60) {
    pointsOfStrength.push(
      "WR-13 evidences the weekly one-hour support requirement.",
    )
  }
  if (evidenceQuotes.length > 0) {
    pointsOfStrength.push(`Resident voice captured: “${evidenceQuotes[0]}”.`)
  }

  const nextSteps: string[] = []
  if (highMissing.length > 0) {
    nextSteps.push(
      `Complete Risk Management Plans for: ${highMissing.join(", ")}.`,
    )
  }
  if (activeGoals.length < 5) {
    nextSteps.push("Open additional WR-11 goals to reach the five-goal rule.")
  }
  if (rentMatch === false || serviceMatch === false) {
    nextSteps.push(
      "Reconcile WR-02 / WR-07 charges with the Managing Agent rent schedule.",
    )
  }

  return {
    wr01: {
      supportNeeds,
      benefits,
      section11Risks: section11,
      needsMatchWr09,
      needsMatchWr11,
    },
    wr02: {
      rentAmount: amounts.rent,
      licenceCharge: amounts.rent,
      entityAddress,
      scheduleMatch: rentMatch,
      addressMatch,
      scheduleRent,
      scheduleServiceCharge: scheduleService,
    },
    wr07: {
      serviceCharge: amounts.service,
      arrearsWeeks: file.arrearsWeeks,
      scheduleMatch: serviceMatch,
    },
    wr09: {
      scores: riskScores,
      invalidScores: riskScores.filter(
        (row) => row.score != null && !row.valid,
      ).length,
      plansMissingForHighScores: highMissing,
    },
    wr11: {
      goals,
      activeCount: activeGoals.length,
      meetsFiveGoalRule: activeGoals.length >= 5,
      goalTitlesForReport: goalTitles,
    },
    wr12: {
      reviewPresent: /WR-12|3[\s-]*month(?:ly)?\s+review/i.test(text),
      goalsReviewed: goalTitles.filter((title) =>
        new RegExp(title.slice(0, 10), "i").test(text),
      ),
    },
    wr13: {
      supportByGoal,
      phrasedInterventions: interventions.filter(Boolean),
      evidenceQuotes,
    },
    qualitative: {
      pointsOfStrength,
      nextSteps,
      masterlistHints: {
        Relevancy: supportNeeds.slice(0, 3),
        "Follow-up": interventions.slice(0, 2),
        Evidence: evidenceQuotes,
        "Practical Support": interventions.filter((line) =>
          /supported|completed|arranged/i.test(line),
        ),
        Progress: goalTitles.slice(0, 3),
      },
    },
    reportBoxes: {
      selectedGoals:
        goalTitles.length > 0
          ? goalTitles.map((title) => `• ${title}`).join("\n")
          : "(no goals extracted)",
      supportPerGoal:
        supportPerGoal ||
        interventions.map((line) => `- ${line}`).join("\n") ||
        "(no session interventions extracted)",
    },
  }
}

export function applyExtractionToFile(
  file: ResidentFile,
  extraction: DeepAuditExtraction,
): Partial<ResidentFile> {
  const highest =
    extraction.wr09.scores
      .map((row) => row.score)
      .filter((score): score is number => score != null)
      .sort((a, b) => b - a)[0] ?? file.scoreOnForm

  return {
    activeGoals: extraction.wr11.activeCount || file.activeGoals,
    scoreOnForm: highest,
    riskManagementPlan:
      extraction.wr09.plansMissingForHighScores.length === 0 &&
      (highest < 5 || file.riskManagementPlan || extraction.wr09.scores.some((row) => row.hasManagementPlan)),
    supportDelivered:
      file.supportDelivered.trim() ||
      extraction.wr13.phrasedInterventions.map((line) => `- ${line}`).join("\n"),
    seaEligibilityRecorded:
      file.seaEligibilityRecorded ||
      extraction.wr01.supportNeeds.length > 0 ||
      extraction.wr11.meetsFiveGoalRule,
    extractedGoals: extraction.wr11.goalTitlesForReport,
    extractedSupportByGoal: extraction.reportBoxes.supportPerGoal,
    pointsOfStrength: extraction.qualitative.pointsOfStrength,
    nextSteps: extraction.qualitative.nextSteps,
  }
}

export function reportClientLabel(
  label: string | undefined,
  fallback = CLIENT_TOKEN,
) {
  const value = (label || "").trim()
  if (!value || /windrush/i.test(value)) return fallback
  return value
}

export function reportAgentLabel(
  label: string | undefined,
  fallback = AGENT_TOKEN,
) {
  const value = (label || "").trim()
  if (!value || /windrush/i.test(value)) return fallback
  return value
}

export function classifyWrFromName(name: string): WrCode | "evidence" | "session" | null {
  const upper = name.toUpperCase()
  const wr = upper.match(/WR[-_ ]?(\d{1,2})/)
  if (wr) {
    const code = `WR-${wr[1].padStart(2, "0")}` as WrCode
    return code
  }
  if (/session|note|support\s*log/i.test(name)) return "session"
  if (/evidence|photo|screenshot|jpg|png|image/i.test(name)) return "evidence"
  return null
}

export type ClassifiedUpload = {
  name: string
  text: string
  classifiedAs: WrCode | "evidence" | "session" | "unclassified"
}

export function mergeBundleClassification(
  uploads: ClassifiedUpload[],
): Record<WrCode, boolean> {
  const received = Object.fromEntries(
    Array.from({ length: 22 }, (_, i) => [
      `WR-${String(i + 1).padStart(2, "0")}`,
      false,
    ]),
  ) as Record<WrCode, boolean>

  for (const upload of uploads) {
    if (upload.classifiedAs.startsWith("WR-")) {
      received[upload.classifiedAs as WrCode] = true
    }
    const fromText = upload.text.toUpperCase().match(/WR[-_ ]?(\d{1,2})/g)
    if (fromText) {
      for (const token of fromText) {
        const num = token.match(/(\d{1,2})/)?.[1]
        if (!num) continue
        received[`WR-${num.padStart(2, "0")}` as WrCode] = true
      }
    }
  }
  return received
}

export function toBundleFiles(
  uploads: ClassifiedUpload[],
): ResidentBundleFile[] {
  return uploads.map((upload) => ({
    id: `bf-${crypto.randomUUID()}`,
    name: upload.name,
    text: upload.text,
    classifiedAs: upload.classifiedAs,
    uploadedAt: new Date().toISOString(),
  }))
}
