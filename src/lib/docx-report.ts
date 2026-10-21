import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type FileChild,
} from "docx"
import { RATING_RATIONALE } from "@/lib/audit-factory"
import { matrixIssues } from "@/lib/matrix"
import { SCORE_LABEL } from "@/lib/pills"
import { RUBRIC_SECTIONS } from "@/lib/rubric-content"
import { agentLabel, asBullets, clientLabel } from "@/lib/text"
import type {
  AuditScore,
  ManagingAgent,
  Profile,
  RentSchedule,
  ResidentFile,
} from "@/lib/types"

const GREEN = "0E7A43"
const INK = "1F2437"
const MUTED = "667085"
const LINE = { style: BorderStyle.SINGLE, size: 4, color: "D9E2EC" }
const BORDERS = { top: LINE, bottom: LINE, left: LINE, right: LINE }

const BANNER: Record<AuditScore, { fill: string; text: string; label: string }> = {
  unscored: { fill: "6B7280", text: "FFFFFF", label: "PENDING REVIEW / UNSCORED" },
  gold: { fill: "E6B325", text: "3A2C00", label: "GOLD" },
  green: { fill: "00A86B", text: "FFFFFF", label: "GREEN" },
  amber: { fill: "F08A24", text: "FFFFFF", label: "AMBER" },
  red: { fill: "E11D48", text: "FFFFFF", label: "RED" },
}

function run(text: string, options?: { bold?: boolean; color?: string; size?: number; italics?: boolean; underline?: boolean }) {
  return new TextRun({
    text,
    bold: options?.bold,
    color: options?.color,
    size: options?.size,
    italics: options?.italics,
    underline: options?.underline ? {} : undefined,
  })
}

function para(text: string, options?: { bold?: boolean; color?: string; size?: number; italics?: boolean; before?: number; after?: number }) {
  return new Paragraph({
    spacing: { before: options?.before ?? 0, after: options?.after ?? 80 },
    children: [run(text, options)],
  })
}

function heading(text: string) {
  return new Paragraph({
    spacing: { before: 320, after: 140 },
    children: [run(text, { bold: true, color: GREEN, size: 28 })],
  })
}

function bullet(text: string) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 40 },
    children: [run(text, { color: INK, size: 21 })],
  })
}

function bulletBlock(items: string[], empty: string) {
  if (items.length === 0) return [para(empty, { italics: true, color: MUTED })]
  return items.map((item) => bullet(item))
}

function cell(children: Paragraph[], options?: { fill?: string; span?: number }) {
  return new TableCell({
    borders: BORDERS,
    columnSpan: options?.span,
    shading: options?.fill ? { type: ShadingType.CLEAR, fill: options.fill } : undefined,
    margins: { top: 70, bottom: 70, left: 90, right: 90 },
    width: options?.span ? undefined : { size: options?.span === 2 ? 100 : 50, type: WidthType.PERCENTAGE },
    children: children.length > 0 ? children : [new Paragraph("")],
  })
}

function pair(label: string, value: string) {
  return new TableRow({
    children: [
      cell([para(label, { bold: true, color: GREEN, size: 20 })], { fill: "E8F6EF" }),
      cell([para(value || "—", { size: 21 })]),
    ],
  })
}

function dataTable(rows: TableRow[]) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  })
}

function rationaleLines(file: ResidentFile) {
  const custom = asBullets(file.audit.ratingRationale)
  if (custom.length > 0) return custom
  if (file.score === "unscored") {
    return ["This file is pending review. It was not graded when it was uploaded."]
  }
  return asBullets(RATING_RATIONALE[file.score])
}

function ratingBanner(score: AuditScore) {
  const tone = BANNER[score]
  return new TableRow({
    children: [
      new TableCell({
        borders: BORDERS,
        columnSpan: 2,
        shading: { type: ShadingType.CLEAR, fill: tone.fill },
        margins: { top: 120, bottom: 120, left: 120, right: 120 },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
            children: [run("OVERALL AUDIT RATING", { bold: true, color: tone.text, size: 18 })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [run(tone.label, { bold: true, color: tone.text, size: 40 })],
          }),
        ],
      }),
    ],
  })
}

function rationaleBox(lines: string[]) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: {
              top: LINE,
              bottom: LINE,
              right: LINE,
              left: { style: BorderStyle.SINGLE, size: 18, color: GREEN },
            },
            shading: { type: ShadingType.CLEAR, fill: "F3FBF6" },
            margins: { top: 100, bottom: 100, left: 140, right: 140 },
            children: [
              para("Rating rationale", { bold: true, color: GREEN, after: 80 }),
              ...bulletBlock(lines, "No rationale recorded."),
            ],
          }),
        ],
      }),
    ],
  })
}

export type ReportInput = {
  profile: Profile
  agent: ManagingAgent
  file: ResidentFile
  rentSchedules: RentSchedule[]
}

function fileSections(input: ReportInput): FileChild[] {
  const { profile, agent, file, rentSchedules } = input
  const audit = file.audit
  const goals = audit.goals.filter((goal) => goal.active && goal.title.trim())
  const issues = matrixIssues(audit)
  const formIssues = audit.formNotes.filter(
    (note) => note.status === "discrepancy" || note.status === "missing",
  )
  const children: FileChild[] = []

  children.push(
    para("Seaaudit internal audit report", { bold: true, color: GREEN, size: 36, after: 40 }),
    para(
      `${clientLabel(profile.defaultClientRpName)}  ·  ${agentLabel(agent.name)}  ·  ${file.fileName}`,
      { color: MUTED, size: 20, after: 160 },
    ),
  )

  children.push(heading("Table 1. Resident and managing agent summary"))
  children.push(
    dataTable([
      pair("Resident file", file.fileName),
      pair("Managing agent", agentLabel(agent.name)),
      pair("Client RP", clientLabel(profile.defaultClientRpName)),
      pair("Properties / units", agent.propertiesUnits),
      pair("Docs deadline", agent.docsDeadline),
      pair("Docs received", agent.docsReceived),
      pair("CRM status", agent.crmStatus),
      pair("Re-request deadline", agent.reRequestDeadline),
      pair("Teams call date", agent.teamsCallDate),
      pair("Overall audit score", SCORE_LABEL[file.score]),
      ratingBanner(file.score),
    ]),
  )
  children.push(new Paragraph({ spacing: { before: 140 }, children: [] }))
  children.push(rationaleBox(rationaleLines(file)))

  children.push(heading("Table 2. Support delivered to the resident"))
  children.push(para("1. Selected WR-11 goals", { bold: true, color: INK, size: 22 }))
  if (goals.length === 0) {
    children.push(para("No active goals have been titled yet.", { italics: true, color: MUTED }))
  } else {
    goals.forEach((goal, index) => {
      children.push(para(`${index + 1}. ${goal.title}`, { size: 21 }))
    })
  }
  children.push(
    para("2. Support worker actions, grouped by goal", {
      bold: true,
      color: INK,
      size: 22,
      before: 160,
    }),
  )
  if (goals.length === 0) {
    children.push(para("No support-worker actions recorded.", { italics: true, color: MUTED }))
  }
  for (const goal of goals) {
    children.push(
      new Paragraph({
        spacing: { before: 160, after: 60 },
        children: [run(goal.title, { bold: true, underline: true, size: 22 })],
      }),
    )
    children.push(
      ...bulletBlock(
        asBullets(goal.supportBullets),
        "No support-worker actions recorded under this goal.",
      ),
    )
  }

  children.push(heading("Table 3. Feedback on support provided"))
  children.push(para("Points of strength", { bold: true, color: GREEN, size: 22 }))
  children.push(...bulletBlock(asBullets(audit.strengths), "No points of strength recorded."))
  children.push(para("Next steps", { bold: true, color: GREEN, size: 22, before: 140 }))
  children.push(...bulletBlock(asBullets(audit.nextSteps), "No next steps recorded."))

  const themes: [string, string][] = [
    ["Relevancy", audit.relevancy],
    ["Follow-up", audit.followUp],
    ["Resources and signposting", audit.resources],
    ["Evidence", audit.evidence],
    ["Practical (“do with”) and advisory support", audit.practical],
    ["Duplication and authenticity", audit.duplication],
  ]
  for (const [label, value] of themes) {
    if (!value.trim()) continue
    children.push(para(label, { bold: true, color: INK, size: 22, before: 140 }))
    children.push(...bulletBlock(asBullets(value), ""))
  }

  for (const section of RUBRIC_SECTIONS) {
    const narrative = audit.narratives[section.id]?.trim()
    if (!narrative) continue
    const tier = audit.tiers[section.id]
    children.push(
      para(
        tier ? `${section.title} — ${tier}` : section.title,
        { bold: true, color: GREEN, size: 22, before: 180 },
      ),
    )
    children.push(...asBullets(narrative).map((line) => para(line, { size: 21 })))
  }

  children.push(heading("Table 4. General notes"))
  const noteRows: TableRow[] = [
    pair("General notes", audit.generalNotes),
    pair("Previous audit follow-up", audit.previousAuditFollowUp),
    pair("Rent setting corrections", audit.rentCorrections),
  ]
  if (rentSchedules.length > 0) {
    const rentText = rentSchedules
      .map((row) => {
        const name = row.propertyName || "Property"
        return `${name}: rent ${row.weeklyRent || "—"}, licence ${row.licenceCharge || "—"}, service charge ${row.serviceCharge || "—"}, ${row.legalEntity || "legal entity not set"}`
      })
      .join("\n")
    noteRows.push(pair("Rent setting table", rentText))
  }
  children.push(dataTable(noteRows))
  children.push(para("Invalid matrix numbers", { bold: true, color: GREEN, size: 22, before: 180 }))
  children.push(
    ...bulletBlock(
      issues.map((issue) => issue.message),
      "No matrix violations recorded.",
    ),
  )
  children.push(
    para("Form discrepancies (WR-01 to WR-22)", {
      bold: true,
      color: GREEN,
      size: 22,
      before: 160,
    }),
  )
  children.push(
    ...bulletBlock(
      formIssues.map((note) => {
        const status = note.status === "missing" ? "Missing" : "Discrepancy"
        return `${note.code} ${note.title} — ${status}${note.note ? `: ${note.note}` : ""}`
      }),
      "No form discrepancies recorded.",
    ),
  )
  children.push(
    para(
      "The overall rating is chosen by the auditor. Uploading a file does not grade it.",
      { italics: true, color: MUTED, size: 18, before: 200 },
    ),
  )
  return children
}

function properties() {
  return {
    page: {
      margin: { top: 720, bottom: 720, left: 720, right: 720 },
    },
  }
}

export function buildFileDocument(input: ReportInput) {
  return new Document({
    title: `Seaaudit audit report ${input.file.fileName}`,
    creator: input.profile.name || "Seaaudit",
    description: "Internal resident-file audit report",
    sections: [{ properties: properties(), children: fileSections(input) }],
  })
}

export function buildPackageDocument(input: {
  profile: Profile
  agent: ManagingAgent
  files: ResidentFile[]
  rentSchedules: RentSchedule[]
}) {
  const { profile, agent, files } = input
  const cover: FileChild[] = [
    para("Seaaudit managing agent audit package", { bold: true, color: GREEN, size: 36, after: 40 }),
    para(
      `${clientLabel(profile.defaultClientRpName)}  ·  ${agentLabel(agent.name)}`,
      { color: MUTED, size: 20, after: 160 },
    ),
    heading("Caseload summary"),
    dataTable([
      pair("Managing agent", agentLabel(agent.name)),
      pair("Client RP", clientLabel(profile.defaultClientRpName)),
      pair("Properties / units", agent.propertiesUnits),
      pair("CRM status", agent.crmStatus),
      pair("Docs deadline", agent.docsDeadline),
      pair("Docs received", agent.docsReceived),
      pair("Re-request deadline", agent.reRequestDeadline),
      pair("Teams call date", agent.teamsCallDate),
      pair("Overall audit score", SCORE_LABEL[agent.overallScore]),
      ratingBanner(agent.overallScore),
    ]),
    new Paragraph({ spacing: { before: 180 }, children: [] }),
    para("Resident files in this package", { bold: true, color: GREEN, size: 24 }),
  ]
  if (files.length === 0) {
    cover.push(
      para("No resident files have been uploaded for this managing agent.", {
        italics: true,
        color: MUTED,
      }),
    )
  } else {
    cover.push(
      dataTable([
        new TableRow({
          children: [
            cell([para("Resident file", { bold: true, color: "FFFFFF", size: 20 })], { fill: GREEN }),
            cell([para("Audit score", { bold: true, color: "FFFFFF", size: 20 })], { fill: GREEN }),
          ],
        }),
        ...files.map(
          (file) =>
            new TableRow({
              children: [
                cell([para(file.fileName, { size: 21 })]),
                cell([para(SCORE_LABEL[file.score], { bold: true, size: 21 })]),
              ],
            }),
        ),
      ]),
    )
  }

  const sections = [{ properties: properties(), children: cover }]
  for (const file of files) {
    sections.push({
      properties: properties(),
      children: fileSections({ ...input, file }),
    })
  }
  return new Document({
    title: `Seaaudit package ${agentLabel(agent.name)}`,
    creator: profile.name || "Seaaudit",
    description: "Managing agent audit package",
    sections,
  })
}

export async function documentToBuffer(document: Document) {
  return Packer.toBuffer(document)
}
