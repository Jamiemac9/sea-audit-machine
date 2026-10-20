export const FEEDBACK_CATEGORIES = [
  "Basic Individual Feedback",
  "WR-01",
  "WR-02",
  "WR-03/05",
  "WR-09 (Risk & Matrix consistency)",
  "WR-11 (Goals & 5-goal SEA rule)",
  "WR-12",
  "WR-13 (Support Delivered vs Feedback on Support formatting rules)",
  "Relevancy",
  "Follow-up",
  "Resources",
  "Evidence",
  "Practical Support",
  "Progress",
  "Duplication",
  "Previous Audit Feedback",
] as const

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number]

const bulletPattern = /^[-•*]/

export function analyseFormatting(supportDelivered: string, feedbackOnSupport: string) {
  const issues: string[] = []
  const supportLines = supportDelivered
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
  const feedbackLines = feedbackOnSupport
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

  if (supportLines.length === 0) {
    issues.push("Support Delivered to the Resident is empty.")
  } else {
    if (supportLines.some((line) => !bulletPattern.test(line))) {
      issues.push(
        "Support Delivered to the Resident should be concise bullet points of actions taken.",
      )
    }
    if (
      supportLines.some(
        (line) =>
          bulletPattern.test(line) && !/supported resident to/i.test(line),
      )
    ) {
      issues.push(
        "Each Support Delivered bullet should describe an action, for example 'Supported resident to...'.",
      )
    }
  }

  if (feedbackLines.length === 0) {
    issues.push("Feedback on Support Provided is empty.")
  } else if (feedbackLines.some((line) => bulletPattern.test(line))) {
    issues.push(
      "Feedback on Support Provided should be commentary on quality, not a bullet list.",
    )
  }

  if (/supported resident to/i.test(feedbackOnSupport)) {
    issues.push(
      "Action lines belong under Support Delivered, not Feedback on Support Provided.",
    )
  }

  return issues
}
