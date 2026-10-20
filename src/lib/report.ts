import { AGENT_TOKEN, CLIENT_TOKEN, residentDocuments } from "@/lib/documents"
import { analyseFormatting } from "@/lib/feedback"
import { matrixScore, requiresRiskManagementPlan, riskTier } from "@/lib/risk"
import { rateFile, type ResidentFile } from "@/lib/rating"

export function reportPackage(file: ResidentFile) {
  const result = rateFile(file)
  const score = matrixScore(file.likelihood, file.severity)
  const tier = riskTier(score)
  const formatting = analyseFormatting(file.supportDelivered, file.feedbackOnSupport)
  const catchUp = result.rating === "Amber" || result.rating === "Red"
  const checklist = residentDocuments
    .map(
      (document) =>
        `${file.received[document.code] ? "Present" : "Missing"}\t${document.code}\t${document.title}`,
    )
    .join("\n")

  const report = [
    "Seaaudit internal audit report",
    `Client: ${CLIENT_TOKEN}`,
    `Managing agent: ${AGENT_TOKEN}`,
    `Mock training agent: ${file.managingAgent}`,
    `File: ${file.reference}`,
    `Rating: ${result.rating}`,
    `Signed off: ${file.signedOff ? "Yes" : "No"}`,
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
      text: `${file.reference} is rated ${result.rating}. Schedule a remediation catch-up with ${AGENT_TOKEN} before the secure return.`,
    })
  }
  return { files, catchUp, result }
}
