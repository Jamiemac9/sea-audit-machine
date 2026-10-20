import {
  CLIENT_TOKEN,
  receivedMap,
  type WrCode,
} from "@/lib/documents"
import type { ResidentFile } from "@/lib/rating"

const goldSupport = `- Supported resident to contact the housing benefit team about the service charge letter.
- Supported resident to practise the next step on the budgeting goal.`

const goldFeedback =
  "Strong, reputable resources were used. The session stayed on the active support goals and the resident described the next step in their own words."

function withGaps(
  received: Record<WrCode, boolean>,
  missing: WrCode[],
): Record<WrCode, boolean> {
  const next = { ...received }
  for (const code of missing) next[code] = false
  return next
}

export const seedFiles: ResidentFile[] = [
  {
    id: "ch-1042",
    reference: "CH-1042",
    managingAgent: "Chantry Housing",
    documentDeadline: "2026-10-28",
    teamsCall: "2026-10-30",
    status: "Audit in Progress",
    likelihood: 2,
    severity: 2,
    scoreOnForm: 4,
    riskManagementPlan: true,
    lastRiskReview: "2026-09-01",
    activeGoals: 5,
    weeklySupportMinutes: 60,
    residentVoice: true,
    nonEngagement: false,
    warningTrackComplete: true,
    followUpRecorded: true,
    relevancy: "strong",
    arrearsWeeks: 1,
    seaEligibilityRecorded: true,
    received: receivedMap(true),
    ocrText: `Local OCR extract for resident file CH-1042
Client: ${CLIENT_TOKEN}
Managing agent: Chantry Housing

WR-01 records benefit details, initial risk flags, and the SEA eligibility justification.
WR-11 lists five active goals with target dates.
WR-13 records a 60-minute session linked to the budgeting goal.`,
    supportDelivered: goldSupport,
    feedbackOnSupport: goldFeedback,
    feedbackCategories: ["WR-13 (Support Delivered vs Feedback on Support formatting rules)"],
    signedOff: false,
  },
  {
    id: "ch-1108",
    reference: "CH-1108",
    managingAgent: "Chantry Housing",
    documentDeadline: "2026-11-04",
    teamsCall: "2026-11-06",
    status: "Docs Received",
    likelihood: 2,
    severity: 3,
    scoreOnForm: 6,
    riskManagementPlan: true,
    lastRiskReview: "2026-08-20",
    activeGoals: 5,
    weeklySupportMinutes: 60,
    residentVoice: false,
    nonEngagement: false,
    warningTrackComplete: true,
    followUpRecorded: true,
    relevancy: "general",
    arrearsWeeks: 2,
    seaEligibilityRecorded: true,
    received: withGaps(receivedMap(true), ["WR-21"]),
    ocrText: `Local OCR extract for resident file CH-1108
Client: ${CLIENT_TOKEN}
Managing agent: Chantry Housing

The inventory at WR-21 is not in the extract. The remaining WR forms are present.
Session notes meet the hour and follow the formatting guide, with limited resident voice.`,
    supportDelivered: goldSupport,
    feedbackOnSupport: goldFeedback,
    feedbackCategories: [],
    signedOff: false,
  },
  {
    id: "bc-2201",
    reference: "BC-2201",
    managingAgent: "Best Choice Housing",
    documentDeadline: "2026-10-22",
    teamsCall: "2026-10-24",
    status: "Audit in Progress",
    likelihood: 3,
    severity: 3,
    scoreOnForm: 4,
    riskManagementPlan: true,
    lastRiskReview: "2026-05-01",
    activeGoals: 3,
    weeklySupportMinutes: 60,
    residentVoice: true,
    nonEngagement: false,
    warningTrackComplete: true,
    followUpRecorded: false,
    relevancy: "limited",
    arrearsWeeks: 8,
    seaEligibilityRecorded: true,
    received: withGaps(receivedMap(true), ["WR-06"]),
    ocrText: `Local OCR extract for resident file BC-2201
Client: ${CLIENT_TOKEN}
Managing agent: Best Choice Housing

The form records a risk score of 4. Likelihood and severity on the matrix read as 3 and 3.
WR-11 shows three open goals. WR-06 nil income form is absent.`,
    supportDelivered: `Supported resident to book a GP appointment.
- Checked the corridor and said hello.`,
    feedbackOnSupport: `- Supported resident to book a GP appointment.
- Strong resources.`,
    feedbackCategories: ["WR-09 (Risk & Matrix consistency)", "WR-11 (Goals & 5-goal SEA rule)"],
    signedOff: false,
  },
  {
    id: "bc-2088",
    reference: "BC-2088",
    managingAgent: "Best Choice Housing",
    documentDeadline: "2026-10-18",
    teamsCall: null,
    status: "Files Requested",
    likelihood: 4,
    severity: 3,
    scoreOnForm: 12,
    riskManagementPlan: false,
    lastRiskReview: null,
    activeGoals: 2,
    weeklySupportMinutes: 20,
    residentVoice: false,
    nonEngagement: true,
    warningTrackComplete: false,
    followUpRecorded: false,
    relevancy: "poor",
    arrearsWeeks: 10,
    seaEligibilityRecorded: false,
    received: withGaps(receivedMap(true), ["WR-09", "WR-11", "WR-13", "WR-16", "WR-17", "WR-18"]),
    ocrText: `Local OCR extract for resident file BC-2088
Client: ${CLIENT_TOKEN}
Managing agent: Best Choice Housing

Sessions on file last about 20 minutes. No Risk Management Plan is attached to WR-09.
Non-engagement is noted. WR-16, WR-17, and WR-18 are not in the extract.`,
    supportDelivered: "Had a chat in the corridor.",
    feedbackOnSupport: "",
    feedbackCategories: ["Previous Audit Feedback"],
    signedOff: false,
  },
]
