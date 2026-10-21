import {
  CLIENT_TOKEN,
  receivedMap,
  type WrCode,
} from "@/lib/documents"
import type { ResidentFile } from "@/lib/rating"
import {
  standardQuestions,
  type RubricMark,
  type RubricQuestion,
} from "@/lib/rubric"

export type AuditProject = {
  id: string
  name: string
  clientLabel: string
  registeredProviderId?: string
}

export const seedProjects: AuditProject[] = [
  {
    id: "q4-sample",
    name: "Q4 resident file sample",
    clientLabel: "Harbour & Vale Housing",
    registeredProviderId: "rp-harbour",
  },
  {
    id: "bespoke-sample",
    name: "Bespoke RP check",
    clientLabel: CLIENT_TOKEN,
    registeredProviderId: "rp-northshore",
  },
]

const bespokePrompt =
  "RP bespoke check: the rent letter names the legal entity on WR-02."

export const seedQuestions: RubricQuestion[] = [
  ...standardQuestions("q4-sample"),
  ...standardQuestions("bespoke-sample"),
  {
    id: "bespoke-sample:rent-entity",
    projectId: "bespoke-sample",
    prompt: bespokePrompt,
    defaultPrompt: bespokePrompt,
    source: "custom",
    wrCode: "WR-02",
  },
]

export function referenceFromName(name: string) {
  const stem = name.replace(/\.[^.]+$/, "")
  const cleaned = stem
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24)
  return cleaned || "UPLOAD"
}

const emptyBundleDefaults = {
  bundleFiles: [] as ResidentFile["bundleFiles"],
  markedDownItems: [] as string[],
  proceedAfterMarkDown: false,
  extractedGoals: [] as string[],
  extractedSupportByGoal: "",
  pointsOfStrength: [] as string[],
  nextSteps: [] as string[],
  reRequestDeadline: null as string | null,
  gateEmailDraft: "",
}

export function createResidentFile(input: {
  projectId: string
  reference: string
  ocrText: string
  managingAgent?: string
  managingAgentId?: string
  registeredProviderId?: string
}): ResidentFile {
  return {
    id: `upload-${crypto.randomUUID()}`,
    projectId: input.projectId,
    reference: input.reference,
    managingAgent: input.managingAgent ?? "",
    managingAgentId: input.managingAgentId,
    registeredProviderId: input.registeredProviderId,
    documentDeadline: new Date().toISOString().slice(0, 10),
    teamsCall: null,
    status: "Docs Received",
    likelihood: 1,
    severity: 1,
    scoreOnForm: 1,
    riskManagementPlan: false,
    lastRiskReview: null,
    activeGoals: 0,
    weeklySupportMinutes: 0,
    residentVoice: false,
    nonEngagement: false,
    warningTrackComplete: false,
    followUpRecorded: false,
    relevancy: "general",
    arrearsWeeks: 0,
    seaEligibilityRecorded: false,
    received: receivedMap(false),
    ocrText: input.ocrText,
    supportDelivered: "",
    feedbackOnSupport: "",
    feedbackCategories: [],
    observation: "",
    marks: {},
    signedOff: false,
    ...emptyBundleDefaults,
  }
}

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

const seedFileRecords: Omit<
  ResidentFile,
  | "projectId"
  | "marks"
  | "observation"
  | "bundleFiles"
  | "markedDownItems"
  | "proceedAfterMarkDown"
  | "extractedGoals"
  | "extractedSupportByGoal"
  | "pointsOfStrength"
  | "nextSteps"
  | "gateEmailDraft"
>[] = [
  {
    id: "ch-1042",
    reference: "CH-1042",
    managingAgent: "Chantry Housing",
    managingAgentId: "ma-chantry",
    registeredProviderId: "rp-harbour",
    propertyAddress: "226 Wright Road, Birmingham",
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
Client: Harbour & Vale Housing
Managing agent: Chantry Housing
Registered address: 14 Corporation Street, Birmingham, B4 6TB
Property address: 226 Wright Road, Birmingham
Move-in date: 2026-01-15

WR-01 Initial Needs Assessment
Support needs: budgeting, benefits maximisation, mental health routine, tenancy sustainment, social inclusion
Section 11 initial risk disclosures: low mood; historical substance misuse (stable)
Benefits: Universal Credit £320.00; Housing Benefit £185.50
SEA eligibility justification: five active support goals with weekly keywork.

WR-02 Excluded Licence Agreement
Weekly rent / licence charge: £185.50
Weekly service charge: £42.00
Signature: resident signed 2026-01-15

WR-03 Fire Safety Induction Checklist — resident signed on move-in day.

WR-09 Risk Assessment & Management Plan
Self-harm / suicide 2 — controls reviewed
Violence / aggression 1
Substance misuse 4
Neglect of self 2
Exploitation 3
Fire safety 2
Anti-social behaviour 1
Mental health crisis 4
Absconding / missing 2
Financial vulnerability 6 — Risk Management Plan: budgeting sessions; triggers: missed UC payment
Physical health 2
Safeguarding others 1
3-month review completed 2026-09-01

WR-11 Support Plan — resident signature present
Goal 1: Budgeting and rent arrears prevention — Target achievement date: 2026-06-30
Goal 2: Benefits maximisation — Target achievement date: 2026-05-15
Goal 3: Mental health routine — Target achievement date: 2026-07-01
Goal 4: Tenancy sustainment — Target achievement date: 2026-08-01
Goal 5: Social inclusion — Target achievement date: 2026-09-01
5 active goals selected on the support plan.

WR-12 Resident Review Form — 3-month review of progress against the 5 support goals.

WR-13 Support Session Records
- Supported resident to contact the housing benefit team about the service charge letter.
- Supported resident to practise the next step on the budgeting goal.
- Completed a referral to the local wellbeing hub.
Resident said: "I know the next step for my budgeting goal."
Weekly support 60 minutes. Follow-up recorded.`,
    supportDelivered: goldSupport,
    feedbackOnSupport: goldFeedback,
    feedbackCategories: ["WR-13 (Support Delivered vs Feedback on Support formatting rules)"],
    signedOff: false,
  },
  {
    id: "ch-1108",
    reference: "CH-1108",
    managingAgent: "Chantry Housing",
    managingAgentId: "ma-chantry",
    registeredProviderId: "rp-harbour",
    propertyAddress: "18 Canal Side, Birmingham",
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
Client: Harbour & Vale Housing
Managing agent: Chantry Housing

The inventory at WR-21 is not in the extract. The remaining WR forms are present.
WR-11 lists five active goals with target dates.
Session notes meet the hour and follow the formatting guide, with limited resident voice.
Financial vulnerability 6 — Risk Management Plan present with triggers.`,
    supportDelivered: goldSupport,
    feedbackOnSupport: goldFeedback,
    feedbackCategories: [],
    signedOff: false,
  },
  {
    id: "bc-2201",
    reference: "BC-2201",
    managingAgent: "Best Choice Housing",
    managingAgentId: "ma-best",
    registeredProviderId: "rp-harbour",
    propertyAddress: "9 Mill Lane, Midlands",
    documentDeadline: "2026-10-22",
    teamsCall: "2026-10-24",
    status: "Awaiting More Info",
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
    received: withGaps(receivedMap(true), ["WR-06", "WR-12"]),
    reRequestDeadline: "2026-10-29",
    ocrText: `Local OCR extract for resident file BC-2201
Client: Harbour & Vale Housing
Managing agent: Best Choice Housing

The form records a risk score of 4. Likelihood and severity on the matrix read as 3 and 3.
WR-11 shows three open goals. WR-06 nil income form is absent.
WR-12 3-month review is missing from the bundle.
Weekly rent / licence charge: £170.00
Weekly service charge: £38.00`,
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
    managingAgentId: "ma-best",
    registeredProviderId: "rp-meridian",
    propertyAddress: "South Gate Unit 4, National",
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
    received: withGaps(receivedMap(true), [
      "WR-09",
      "WR-11",
      "WR-13",
      "WR-16",
      "WR-17",
      "WR-18",
    ]),
    ocrText: `Local OCR extract for resident file BC-2088
Client: Meridian Living
Managing agent: Best Choice Housing

Sessions on file last about 20 minutes. No Risk Management Plan is attached to WR-09.
Non-engagement is noted. WR-16, WR-17, and WR-18 are not in the extract.`,
    supportDelivered: "Had a chat in the corridor.",
    feedbackOnSupport: "",
    feedbackCategories: ["Previous Audit Feedback"],
    signedOff: false,
  },
]

export const seedFiles: ResidentFile[] = seedFileRecords.map((file) => ({
  ...emptyBundleDefaults,
  ...file,
  reRequestDeadline: file.reRequestDeadline ?? null,
  projectId: "q4-sample",
  observation:
    file.id === "ch-1042"
      ? "Resident voice is clear in the session note."
      : "",
  marks:
    file.id === "ch-1042"
      ? {
          "q4-sample:WR-13": {
            score: "Pass",
            note: "The hour is evidenced and the resident describes the next step.",
          },
        }
      : ({} as Record<string, RubricMark>),
  extractedGoals:
    file.id === "ch-1042"
      ? [
          "Budgeting and rent arrears prevention",
          "Benefits maximisation",
          "Mental health routine",
          "Tenancy sustainment",
          "Social inclusion",
        ]
      : [],
  pointsOfStrength:
    file.id === "ch-1042"
      ? [
          "WR-11 records 5 active goals, meeting the SEA eligibility threshold.",
          "WR-13 evidences the weekly one-hour support requirement.",
        ]
      : [],
}))
