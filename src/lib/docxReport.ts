import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
  AlignmentType,
} from "docx"
import { saveAs } from "file-saver"
import { deepAuditExtract, reportAgentLabel, reportClientLabel } from "@/lib/deepAuditExtractor"
import { markDownPenalties, scanCompleteness } from "@/lib/completenessGate"
import type { ManagingAgentProfile } from "@/lib/directory"
import { rateFile, type ResidentFile } from "@/lib/rating"
import type { MasterlistSection } from "@/lib/auditorSettings"
import type { RubricQuestion } from "@/lib/rubric"
import { emptyMark } from "@/lib/rubric"

function p(text: string, opts?: { bold?: boolean; heading?: (typeof HeadingLevel)[keyof typeof HeadingLevel] }) {
  if (opts?.heading) {
    return new Paragraph({
      heading: opts.heading,
      children: [new TextRun(text)],
    })
  }
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: opts?.bold,
      }),
    ],
  })
}

function bullets(lines: string[]) {
  if (lines.length === 0) return [p("(none)")]
  return lines.map(
    (line) =>
      new Paragraph({
        children: [new TextRun(line.replace(/^\s*[-•]\s*/, ""))],
        bullet: { level: 0 },
      }),
  )
}

export async function downloadResidentDocx(options: {
  file: ResidentFile
  clientLabel?: string
  managingAgents?: ManagingAgentProfile[]
  masterlist?: MasterlistSection[]
  questions?: RubricQuestion[]
  auditorName?: string
}) {
  const { file } = options
  const client = reportClientLabel(options.clientLabel)
  const agent = reportAgentLabel(file.managingAgent)
  const extraction = deepAuditExtract(file, {
    managingAgents: options.managingAgents,
  })
  const scan = scanCompleteness(file, {
    managingAgents: options.managingAgents,
  })
  const penalties = markDownPenalties(scan)
  const rating = rateFile(file)
  const suggested =
    penalties.suggestedRating &&
    (penalties.suggestedRating === "Red" ||
      (penalties.suggestedRating === "Amber" &&
        rating.rating !== "Red"))
      ? penalties.suggestedRating
      : rating.rating

  const children: Paragraph[] = [
    p("Seaaudit — Resident File Audit Report", {
      heading: HeadingLevel.TITLE,
    }),
    p(`Client (Registered Provider): ${client}`),
    p(`Managing Agent: ${agent}`),
    p(`Resident file: ${file.reference}`),
    p(`Lead auditor: ${options.auditorName || "Lead Auditor"}`),
    p(`Overall audit rating: ${suggested}`),
    p(`Signed off: ${file.signedOff ? "Yes" : "No"}`),
    new Paragraph({ children: [] }),
    p("1. Rating reasons", { heading: HeadingLevel.HEADING_1 }),
    ...bullets([
      ...rating.reasons,
      ...penalties.findings,
    ]),
    p("2. Which goals have been selected on the support plan?", {
      heading: HeadingLevel.HEADING_1,
    }),
    ...bullets(
      extraction.wr11.goalTitlesForReport.length
        ? extraction.wr11.goalTitlesForReport
        : file.extractedGoals ?? [],
    ),
    p("3. What support has been given to the resident for each of their current goals?", {
      heading: HeadingLevel.HEADING_1,
    }),
    ...extraction.wr13.supportByGoal.flatMap((entry) => [
      p(entry.goalTitle, { bold: true }),
      ...bullets(entry.interventions),
    ]),
    p("4. WR-01 needs, benefits, and Section 11 disclosures", {
      heading: HeadingLevel.HEADING_1,
    }),
    p("Support needs", { bold: true }),
    ...bullets(extraction.wr01.supportNeeds),
    p("Benefits", { bold: true }),
    ...bullets(
      extraction.wr01.benefits.map(
        (benefit) =>
          `${benefit.name}${benefit.amount ? ` — ${benefit.amount}` : ""}`,
      ),
    ),
    p("Section 11 / initial risks", { bold: true }),
    ...bullets(extraction.wr01.section11Risks),
    p("5. WR-02 / WR-07 charges vs Managing Agent rent schedule", {
      heading: HeadingLevel.HEADING_1,
    }),
    p(
      `Extracted rent/licence: ${extraction.wr02.rentAmount != null ? `£${extraction.wr02.rentAmount}` : "not found"}`,
    ),
    p(
      `Schedule rent: ${extraction.wr02.scheduleRent != null ? `£${extraction.wr02.scheduleRent}` : "n/a"} · Match: ${String(extraction.wr02.scheduleMatch)}`,
    ),
    p(
      `Service charge: ${extraction.wr07.serviceCharge != null ? `£${extraction.wr07.serviceCharge}` : "not found"} · Match: ${String(extraction.wr07.scheduleMatch)}`,
    ),
    p(
      `Entity / property address: ${extraction.wr02.entityAddress || "not found"} · Address check: ${String(extraction.wr02.addressMatch)}`,
    ),
    p("6. WR-09 risk matrix", { heading: HeadingLevel.HEADING_1 }),
    ...extraction.wr09.scores
      .filter((row) => row.score != null)
      .flatMap((row) => [
        p(
          `${row.category}: score ${row.score}${row.valid ? "" : " (INVALID)"} · RMP ${row.hasManagementPlan ? "present" : "missing"}`,
        ),
      ]),
    p("7. Points of strength", { heading: HeadingLevel.HEADING_1 }),
    ...bullets(
      file.pointsOfStrength?.length
        ? file.pointsOfStrength
        : extraction.qualitative.pointsOfStrength,
    ),
    p("8. Next steps", { heading: HeadingLevel.HEADING_1 }),
    ...bullets(
      file.nextSteps?.length
        ? file.nextSteps
        : extraction.qualitative.nextSteps,
    ),
    p("9. Masterlist", { heading: HeadingLevel.HEADING_1 }),
  ]

  for (const section of options.masterlist ?? []) {
    children.push(p(section.label, { bold: true }))
    children.push(p(section.content))
    const hints =
      extraction.qualitative.masterlistHints[section.label] ?? []
    if (hints.length) {
      children.push(...bullets(hints.map((hint) => `Evidence: ${hint}`)))
    }
  }

  if (options.questions?.length) {
    children.push(p("10. Rubric marks", { heading: HeadingLevel.HEADING_1 }))
    for (const question of options.questions) {
      const mark = file.marks[question.id] ?? emptyMark()
      children.push(
        p(
          `${mark.score || "Unset"} — ${question.prompt}${mark.note ? ` (${mark.note})` : ""}`,
        ),
      )
    }
  }

  children.push(
    new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [
        new TextRun({
          text: "Generated locally by Seaaudit. No client brand placeholders other than the Registered Provider / Managing Agent names above.",
          italics: true,
          size: 18,
        }),
      ],
    }),
  )

  const doc = new Document({
    sections: [{ children }],
  })
  const blob = await Packer.toBlob(doc)
  saveAs(blob, `${file.reference}-seaaudit-report.docx`)
  return { suggested }
}
