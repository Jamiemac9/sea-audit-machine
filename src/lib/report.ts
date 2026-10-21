import { AGENT_TOKEN, CLIENT_TOKEN, residentDocuments } from "@/lib/documents"
import {
  reportAgentLabel,
  reportClientLabel,
} from "@/lib/deepAuditExtractor"
import { analyseFormatting } from "@/lib/feedback"
import { matrixScore, requiresRiskManagementPlan, riskTier } from "@/lib/risk"
import { rateFile, type ResidentFile } from "@/lib/rating"
import { emptyMark, type RubricQuestion } from "@/lib/rubric"

export function reportPackage(
  file: ResidentFile,
  context?: { clientLabel?: string; questions?: RubricQuestion[] },
) {
  const result = rateFile(file)
  const score = matrixScore(file.likelihood, file.severity)
  const tier = riskTier(score)
  const formatting = analyseFormatting(file.supportDelivered, file.feedbackOnSupport)
  const catchUp = result.rating === "Amber" || result.rating === "Red"
  const client = reportClientLabel(context?.clientLabel, CLIENT_TOKEN)
  const agent = reportAgentLabel(file.managingAgent, AGENT_TOKEN)
  const checklist = residentDocuments
    .map(
      (document) =>
        `${file.received[document.code] ? "Present" : "Missing"}\t${document.code}\t${document.title}`,
    )
    .join("\n")

  const report = [
    "Seaaudit internal audit report",
    `Client: ${client}`,
    `Managing agent: ${agent}`,
    `File: ${file.reference}`,
    `Rating: ${result.rating}`,
    `Signed off: ${file.signedOff ? "Yes" : "No"}`,
    "",
    "Selected support goals",
    ...(file.extractedGoals.length
      ? file.extractedGoals.map((goal) => `- ${goal}`)
      : ["- (none extracted)"]),
    "",
    "Support by goal",
    file.extractedSupportByGoal || "(none)",
    "",
    "Reasons",
    ...result.reasons.map((reason) => `- ${reason}`),
    "",
    `Matrix score: ${score} (${tier.label})`,
    `Score written on the form: ${file.scoreOnForm}`,
    `WR-09 Risk Management Plan: ${file.riskManagementPlan ? "Present" : "Missing"}`,
    requiresRiskManagementPlan(score)
      ? "A Risk Management Plan is required because the score is 5 or above."
      : "A Risk Management Plan is not required at this score.",
    "",
    "Feedback categories",
    ...(file.feedbackCategories.length
      ? file.feedbackCategories.map((category) => `- ${category}`)
      : ["- None selected"]),
    "",
    "Formatting",
    ...(formatting.length ? formatting.map((issue) => `- ${issue}`) : ["- No formatting issues."]),
    "",
    "Support Delivered to the Resident",
    file.supportDelivered || "(empty)",
    "",
    "Feedback on Support Provided",
    file.feedbackOnSupport || "(empty)",
    "",
    "Practitioner observation",
    file.observation || "(none)",
    "",
    "Rubric",
    ...(context?.questions ?? []).map((question) => {
      const mark = file.marks[question.id] ?? emptyMark()
      return `- ${mark.score || "Unset"} | ${question.prompt}${mark.note ? ` | ${mark.note}` : ""}`
    }),
    "",
    catchUp
      ? "REMEDIATION: schedule a catch-up call before returning this file."
      : "No remediation catch-up call is flagged.",
  ].join("\n")

  const files = [
    { name: `${file.reference}-audit-report.txt`, text: report },
    { name: `${file.reference}-wr-checklist.txt`, text: checklist },
  ]
  if (catchUp) {
    files.push({
      name: "REMEDIATION-CATCH-UP-REQUIRED.txt",
      text: `${file.reference} is rated ${result.rating}. Schedule a remediation catch-up with ${agent} before the secure return.`,
    })
  }
  return { files, catchUp, result }
}
