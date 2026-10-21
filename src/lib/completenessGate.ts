import { residentDocuments, type WrCode } from "@/lib/documents"
import { deepAuditExtract } from "@/lib/deepAuditExtractor"
import type { ManagingAgentProfile } from "@/lib/directory"
import type { ResidentFile } from "@/lib/rating"
import { AGENT_TOKEN, CLIENT_TOKEN } from "@/lib/documents"

/** Core documents that block Stage 1 completion if missing. */
export const CORE_WR_CODES: WrCode[] = [
  "WR-01",
  "WR-02",
  "WR-03",
  "WR-05",
  "WR-09",
  "WR-11",
  "WR-12",
  "WR-13",
]

export type GateItemKind = "missing" | "incomplete"

export type GateItem = {
  id: string
  code: WrCode | "EVIDENCE"
  kind: GateItemKind
  title: string
  detail: string
  markedDown: boolean
}

export type CompletenessScan = {
  items: GateItem[]
  missingCount: number
  incompleteCount: number
  markedDownCount: number
  blocking: boolean
}

function titleFor(code: WrCode) {
  return (
    residentDocuments.find((document) => document.code === code)?.title ?? code
  )
}

export function scanCompleteness(
  file: ResidentFile,
  options?: { managingAgents?: ManagingAgentProfile[] },
): CompletenessScan {
  const marked = new Set(file.markedDownItems ?? [])
  const items: GateItem[] = []
  const extraction = deepAuditExtract(file, {
    managingAgents: options?.managingAgents,
  })

  for (const code of CORE_WR_CODES) {
    if (!file.received[code]) {
      items.push({
        id: `missing:${code}`,
        code,
        kind: "missing",
        title: `${code} ${titleFor(code)}`,
        detail: "Not present in the resident evidence bundle.",
        markedDown: marked.has(`missing:${code}`),
      })
    }
  }

  const hasEvidence =
    (file.bundleFiles ?? []).some(
      (item) =>
        item.classifiedAs === "evidence" ||
        /\.(jpg|jpeg|png|webp)$/i.test(item.name),
    ) || /evidence|screenshot|photo/i.test(file.ocrText)
  if (!hasEvidence) {
    items.push({
      id: "missing:EVIDENCE",
      code: "EVIDENCE",
      kind: "missing",
      title: "Attached evidence",
      detail: "No evidence screenshots/photos were classified in the bundle.",
      markedDown: marked.has("missing:EVIDENCE"),
    })
  }

  if (file.received["WR-01"]) {
    if (!file.seaEligibilityRecorded && extraction.wr01.supportNeeds.length === 0) {
      items.push({
        id: "incomplete:WR-01:needs",
        code: "WR-01",
        kind: "incomplete",
        title: "WR-01 incomplete fields",
        detail: "Support needs / Section 11 disclosures look blank.",
        markedDown: marked.has("incomplete:WR-01:needs"),
      })
    }
  }

  if (file.received["WR-03"] && !/sign(ed|ature)/i.test(file.ocrText)) {
    items.push({
      id: "incomplete:WR-03:signature",
      code: "WR-03",
      kind: "incomplete",
      title: "WR-03 resident signature",
      detail: "Move-in fire safety induction signature not detected.",
      markedDown: marked.has("incomplete:WR-03:signature"),
    })
  }

  if (file.received["WR-09"] || file.received["WR-08"]) {
    if (extraction.wr09.plansMissingForHighScores.length > 0) {
      items.push({
        id: "incomplete:WR-09:rmp",
        code: "WR-09",
        kind: "incomplete",
        title: "WR-09 Risk Management Plans",
        detail: `Scores ≥ 5 without plans: ${extraction.wr09.plansMissingForHighScores.join(", ")}.`,
        markedDown: marked.has("incomplete:WR-09:rmp"),
      })
    }
    if (extraction.wr09.invalidScores > 0) {
      items.push({
        id: "incomplete:WR-09:matrix",
        code: "WR-09",
        kind: "incomplete",
        title: "WR-09 matrix scores",
        detail: `${extraction.wr09.invalidScores} score(s) are not valid 5×5 products.`,
        markedDown: marked.has("incomplete:WR-09:matrix"),
      })
    }
  }

  if (file.received["WR-11"]) {
    const active = extraction.wr11.activeCount || file.activeGoals
    if (active < 5) {
      items.push({
        id: "incomplete:WR-11:goals",
        code: "WR-11",
        kind: "incomplete",
        title: "WR-11 active goals",
        detail: `Fewer than 5 active goals (${active} found).`,
        markedDown: marked.has("incomplete:WR-11:goals"),
      })
    }
    if (extraction.wr11.goals.some((goal) => goal.targetEqualsMoveIn)) {
      items.push({
        id: "incomplete:WR-11:target",
        code: "WR-11",
        kind: "incomplete",
        title: "WR-11 target dates",
        detail: "At least one Target Achievement Date matches the move-in date.",
        markedDown: marked.has("incomplete:WR-11:target"),
      })
    }
    if (!/sign(ed|ature)/i.test(file.ocrText + (file.bundleFiles ?? []).map((f) => f.text).join(" "))) {
      items.push({
        id: "incomplete:WR-11:signature",
        code: "WR-11",
        kind: "incomplete",
        title: "WR-11 resident signature",
        detail: "Resident signature on the support plan was not detected.",
        markedDown: marked.has("incomplete:WR-11:signature"),
      })
    }
  }

  const open = items.filter((item) => !item.markedDown)
  return {
    items,
    missingCount: open.filter((item) => item.kind === "missing").length,
    incompleteCount: open.filter((item) => item.kind === "incomplete").length,
    markedDownCount: items.filter((item) => item.markedDown).length,
    blocking: open.length > 0 && !file.proceedAfterMarkDown,
  }
}

export function buildMissingInfoRequestEmail(
  file: ResidentFile,
  scan: CompletenessScan,
  context?: {
    clientLabel?: string
    agentName?: string
    auditorName?: string
    deadline?: string
  },
) {
  const client = context?.clientLabel || CLIENT_TOKEN
  const agent = context?.agentName || file.managingAgent || AGENT_TOKEN
  const open = scan.items.filter((item) => !item.markedDown)
  const lines = open.map(
    (item) => `- ${item.title}: ${item.detail}`,
  )
  const deadline =
    context?.deadline ||
    file.reRequestDeadline ||
    file.documentDeadline

  return [
    `Subject: Missing / incomplete resident documents — ${file.reference}`,
    "",
    `Dear ${agent},`,
    "",
    `We are auditing resident file ${file.reference} on behalf of ${client}.`,
    "The completeness scan identified the following missing or incomplete items:",
    "",
    ...lines,
    "",
    `Please upload the outstanding items by ${deadline}.`,
    "If items cannot be supplied, confirm in writing so they can be marked down and the audit can proceed.",
    "",
    "Kind regards,",
    context?.auditorName || "Lead Auditor",
    "Seaaudit",
  ].join("\n")
}

export function markDownPenalties(scan: CompletenessScan) {
  const marked = scan.items.filter((item) => item.markedDown)
  const findings: string[] = []
  for (const item of marked) {
    if (item.kind === "missing") {
      findings.push(
        `FAILED / MARKED DOWN: ${item.title} was not received after request.`,
      )
    } else {
      findings.push(
        `FAILED / MARKED DOWN: ${item.title} remained incomplete after request.`,
      )
    }
  }
  const forcesRed = marked.some(
    (item) =>
      item.code === "WR-13" ||
      item.code === "WR-09" ||
      item.code === "WR-11",
  )
  return {
    findings,
    suggestedRating: forcesRed
      ? ("Red" as const)
      : marked.length > 0
        ? ("Amber" as const)
        : null,
  }
}
