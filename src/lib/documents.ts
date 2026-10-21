export const WR_CODES = [
  "WR-01",
  "WR-02",
  "WR-03",
  "WR-04",
  "WR-05",
  "WR-06",
  "WR-07",
  "WR-08",
  "WR-09",
  "WR-10",
  "WR-11",
  "WR-12",
  "WR-13",
  "WR-14",
  "WR-15",
  "WR-16",
  "WR-17",
  "WR-18",
  "WR-19",
  "WR-20",
  "WR-21",
  "WR-22",
] as const

export type WrCode = (typeof WR_CODES)[number]

export type ResidentDocument = {
  code: WrCode
  title: string
  checks: string[]
}

export const CLIENT_TOKEN = "[Client_RP_Name]"
export const AGENT_TOKEN = "[Managing_Agent_Name]"

export const residentDocuments: ResidentDocument[] = [
  {
    code: "WR-01",
    title: "Initial Needs Assessment",
    checks: [
      "Benefit details are recorded.",
      "Initial risk flags are recorded.",
      "SEA eligibility justification is recorded.",
    ],
  },
  {
    code: "WR-02",
    title: "Excluded Licence Agreement",
    checks: [
      "Rent settings match the rent schedule.",
      "Legal entity names match the registered parties.",
    ],
  },
  {
    code: "WR-03",
    title: "Fire Safety Induction Checklist",
    checks: ["Move-in day signatures are present."],
  },
  {
    code: "WR-04",
    title: "Housing Benefit Authorisation Form",
    checks: ["Authorisation is complete for the current claim."],
  },
  {
    code: "WR-05",
    title: "Missing Person Form",
    checks: ["Observable characteristics are completed."],
  },
  {
    code: "WR-06",
    title: "Nil Income Form",
    checks: [
      "Periods without income are explained.",
      "Support sources during those periods are named.",
    ],
  },
  {
    code: "WR-07",
    title: "Weekly Service Charge",
    checks: ["Arrears are monitored against the 8-week threshold."],
  },
  {
    code: "WR-08",
    title: "Risk Assessment (matrix worksheet)",
    checks: [
      "Likelihood and severity use the 5x5 matrix.",
      "The written score equals likelihood × severity.",
      "The assessment is inside its 3-month review cycle.",
    ],
  },
  {
    code: "WR-09",
    title: "Risk Assessment & Management Plan",
    checks: [
      "All risk category scores are valid 5×5 products.",
      "A Risk Management Plan with triggers is present whenever the score is 5 or above.",
      "3 / 6 / 9 / 12-month review columns are completed where required.",
    ],
  },
  {
    code: "WR-10",
    title: "Risk Assessment For Staff Eyes Only",
    checks: [
      "Used only where staff disagree with the resident score or the topic is sensitive.",
    ],
  },
  {
    code: "WR-11",
    title: "Support Plan",
    checks: [
      "At least 5 active goals are open for SEA eligibility.",
      "Each goal has a target achievement date.",
      "Review milestones are recorded.",
    ],
  },
  {
    code: "WR-12",
    title: "Resident Review Form",
    checks: ["3-monthly review of progress against the 5 support goals."],
  },
  {
    code: "WR-13",
    title: "Support Session Records",
    checks: [
      "Weekly support of at least 1 hour is evidenced.",
      "Follow-up actions are recorded.",
      "Notes link to a support goal.",
      "Support delivered and feedback on support are formatted separately.",
    ],
  },
  {
    code: "WR-14",
    title: "Contact Log",
    checks: ["Contacts are logged with a date and the person contacted."],
  },
  {
    code: "WR-15",
    title: "Incident Form",
    checks: ["Incidents record what happened and the immediate action."],
  },
  {
    code: "WR-16",
    title: "Warning Letter — first non-engagement",
    checks: ["First warning is on file when non-engagement starts."],
  },
  {
    code: "WR-17",
    title: "Warning Letter — second non-engagement",
    checks: ["Second warning follows the non-engagement track."],
  },
  {
    code: "WR-18",
    title: "Warning Letter — final non-engagement",
    checks: ["Final warning completes the non-engagement track."],
  },
  {
    code: "WR-19",
    title: "Knowing Rights",
    checks: ["The resident has a record of being told their rights."],
  },
  {
    code: "WR-20",
    title: "Exit Form",
    checks: ["Exit details are ready if the licence is ending."],
  },
  {
    code: "WR-21",
    title: "Inventory",
    checks: ["Room inventory is completed and dated."],
  },
  {
    code: "WR-22",
    title: "ID Check",
    checks: ["Identity documents seen are recorded."],
  },
]

export function receivedMap(present: boolean): Record<WrCode, boolean> {
  return Object.fromEntries(WR_CODES.map((code) => [code, present])) as Record<
    WrCode,
    boolean
  >
}

export function countReceived(received: Record<WrCode, boolean>) {
  return WR_CODES.filter((code) => received[code]).length
}
