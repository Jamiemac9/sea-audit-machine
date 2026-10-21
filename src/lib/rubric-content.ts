export type MasterStatement = {
  id: string
  template: string
}

export type RubricCheck = {
  id: string
  label: string
}

export type RubricSection = {
  id: string
  title: string
  summary: string
  checks: RubricCheck[]
  statements: MasterStatement[]
}

export const WR_FORMS = [
  { code: "WR-01", title: "Initial Needs Assessment" },
  { code: "WR-02", title: "Excluded Licence Agreement" },
  { code: "WR-03", title: "Fire Safety" },
  { code: "WR-04", title: "Housing Benefit Authorisation" },
  { code: "WR-05", title: "Missing Person" },
  { code: "WR-06", title: "Nil Income" },
  { code: "WR-07", title: "Service Charge" },
  { code: "WR-08", title: "Risk Assessment Review" },
  { code: "WR-09", title: "Risk Assessment and Management" },
  { code: "WR-10", title: "Staff Eyes Only" },
  { code: "WR-11", title: "Support Plan" },
  { code: "WR-12", title: "Resident Review Form" },
  { code: "WR-13", title: "Support Session Records" },
  { code: "WR-14", title: "Contact Log" },
  { code: "WR-15", title: "Incident Form" },
  { code: "WR-16", title: "Warning Letter — first" },
  { code: "WR-17", title: "Warning Letter — second" },
  { code: "WR-18", title: "Warning Letter — final" },
  { code: "WR-19", title: "Knowing Rights" },
  { code: "WR-20", title: "Exit Form" },
  { code: "WR-21", title: "Inventory" },
  { code: "WR-22", title: "ID Check" },
] as const

export const RISK_AREAS = [
  { id: "harm-self", label: "Harm to self" },
  { id: "harm-others", label: "Harm to others" },
  { id: "harm-from-others", label: "Harm from others" },
  { id: "substance", label: "Substance use" },
  { id: "physical", label: "Physical health" },
  { id: "mental", label: "Mental health" },
  { id: "self-neglect", label: "Self-neglect" },
  { id: "financial", label: "Financial exploitation" },
  { id: "fire", label: "Fire" },
  { id: "missing", label: "Missing / absconding" },
  { id: "offending", label: "Offending" },
  { id: "safeguarding", label: "Safeguarding" },
] as const

export const RUBRIC_SECTIONS: RubricSection[] = [
  {
    id: "basic",
    title: "Basic Individual Feedback",
    summary: "Strengths, improvement required, and general advisories.",
    checks: [
      { id: "basic-hour", label: "Weekly 1-hour support requirement met?" },
      { id: "basic-voice", label: "Resident voice and participation clear?" },
      { id: "basic-tasks", label: "Tasks specific and monitored?" },
      { id: "basic-signatures", label: "Resident signatures present?" },
      { id: "basic-household", label: "Couples / family housed together check" },
    ],
    statements: [
      {
        id: "basic-hour-met",
        template:
          "The weekly one-hour support requirement is met. Example: [insert example].",
      },
      {
        id: "basic-voice-clear",
        template:
          "The resident's voice is clear in the record. They said [insert example], which shows they took part in the plan.",
      },
      {
        id: "basic-tasks-specific",
        template:
          "Tasks are specific and were checked the following week. The agreed task was [insert example].",
      },
      {
        id: "basic-signatures-present",
        template: "Resident signatures are present on [insert example].",
      },
      {
        id: "basic-household-ok",
        template:
          "The couples / family housed together check is satisfied. Noted at [insert example].",
      },
      {
        id: "basic-hour-gap",
        template:
          "Improvement required: the weekly hour is not evidenced for [insert example].",
      },
    ],
  },
  {
    id: "wr01",
    title: "WR-01 (Initial Needs Assessment)",
    summary: "Context, benefits, section 11 risks, and SEA eligibility.",
    checks: [
      { id: "wr01-sections", label: "Every section completed with context?" },
      { id: "wr01-benefits", label: "Benefits and amounts detailed?" },
      {
        id: "wr01-risks",
        label: "Section 11 initial risks explained and corroborated later?",
      },
      { id: "wr01-sea", label: "SEA eligibility clearly justified?" },
    ],
    statements: [
      {
        id: "wr01-complete",
        template:
          "Every section of the initial needs assessment is completed with context, including [insert example].",
      },
      {
        id: "wr01-benefits-detail",
        template: "Benefits and amounts are detailed: [insert example].",
      },
      {
        id: "wr01-section11",
        template:
          "Section 11 initial risks are explained and corroborated later in the file at [insert example].",
      },
      {
        id: "wr01-eligibility",
        template: "SEA eligibility is clearly justified because [insert example].",
      },
      {
        id: "wr01-gap",
        template: "Improvement required: [insert example] is incomplete on WR-01.",
      },
    ],
  },
  {
    id: "wr02",
    title: "WR-02 (Excluded Licence Agreement) & WR-07 (Service Charge)",
    summary: "Rent setting match, legal entity address, and arrears monitoring.",
    checks: [
      {
        id: "wr02-rent",
        label: "Do licence charge and rent values match the property Rent Setting table?",
      },
      { id: "wr02-address", label: "Is the legal entity address accurate?" },
      { id: "wr02-arrears", label: "Are 8-week service charge arrears monitored?" },
    ],
    statements: [
      {
        id: "wr02-match",
        template:
          "The licence charge and rent on WR-02 match the rent setting for [insert example].",
      },
      {
        id: "wr02-entity",
        template: "The legal entity address is accurate: [insert example].",
      },
      {
        id: "wr02-arrears-ok",
        template:
          "Service charge arrears are monitored against the eight-week threshold. Current position: [insert example].",
      },
      {
        id: "wr02-mismatch",
        template:
          "Concern: the licence does not match the rent setting table. The file shows [insert example].",
      },
    ],
  },
  {
    id: "wr03",
    title: "WR-03 (Fire Safety), WR-04 (HB Auth), WR-05 (Missing Person), WR-06 (Nil Income)",
    summary: "Move-in signatures, authorisation, observable characteristics, and nil income.",
    checks: [
      {
        id: "wr03-fire",
        label: "Every individual box on the fire risk form signed by the resident on move-in day?",
      },
      { id: "wr04-hb", label: "Housing benefit authorisation complete?" },
      {
        id: "wr05-missing",
        label: "Missing person observable characteristics detailed?",
      },
      {
        id: "wr06-nil",
        label: "Nil income dates and survival sources explained?",
      },
    ],
    statements: [
      {
        id: "wr03-signed",
        template:
          "Every fire-risk box on WR-03 is signed by the resident on the move-in day ([insert example]).",
      },
      {
        id: "wr04-complete",
        template: "Housing benefit authorisation (WR-04) is complete for [insert example].",
      },
      {
        id: "wr05-detail",
        template:
          "The missing person form records observable characteristics: [insert example].",
      },
      {
        id: "wr06-explained",
        template:
          "Nil income dates and the sources the resident survived on are explained: [insert example].",
      },
      {
        id: "wr03-gap",
        template:
          "Improvement required: [insert example] was not signed on the move-in day.",
      },
    ],
  },
  {
    id: "wr09",
    title: "WR-09 & WR-10 (Risk Assessment & 5x5 Matrix)",
    summary:
      "Twelve risk areas, valid matrix products, plans for scores of 5 or above, and staff eyes only.",
    checks: [
      {
        id: "wr09-twelve",
        label: "All 12 risk areas scored with written justification and triggers?",
      },
      {
        id: "wr09-plans",
        label: "Every risk scored 5 or above has a completed Risk Management Plan?",
      },
      { id: "wr09-cycle", label: "Updated at 3, 6, 9 and 12 months?" },
      {
        id: "wr09-emerging",
        label: "New risks emerging in session notes added to WR-09?",
      },
      {
        id: "wr10-eyes",
        label: "Staff Eyes Only (WR-10) used if the resident under-scores a risk?",
      },
      { id: "wr09-valid", label: "Matrix numbers are valid 5×5 products only?" },
    ],
    statements: [
      {
        id: "wr09-justified",
        template:
          "All 12 risk areas are scored with a written justification. Example: [insert example].",
      },
      {
        id: "wr09-triggers",
        template: "Triggers are recorded for [insert example].",
      },
      {
        id: "wr09-plan",
        template:
          "Every risk scored 5 or above has a completed Risk Management Plan, including [insert example].",
      },
      {
        id: "wr09-reviews",
        template:
          "Reviews are present at 3, 6, 9 and 12 months. Latest review: [insert example].",
      },
      {
        id: "wr09-new",
        template:
          "A new risk from the session notes was added to WR-09: [insert example].",
      },
      {
        id: "wr10-used",
        template:
          "Staff Eyes Only (WR-10) is used because the resident under-scored [insert example].",
      },
      {
        id: "wr09-violation",
        template:
          "Matrix violation: the form records [insert example], which is not a valid 5×5 product.",
      },
    ],
  },
  {
    id: "wr11",
    title: "WR-11 (Support Plan) & WR-12 (Resident Review Form)",
    summary: "Five active goals, action plans, target dates, and three-monthly reviews.",
    checks: [
      { id: "wr11-five", label: "At least 5 active goals at all times?" },
      {
        id: "wr11-replaced",
        label: "If a goal was completed, was a new one added?",
      },
      { id: "wr11-match", label: "Goals match WR-01 and WR-09 needs?" },
      {
        id: "wr11-actions",
        label: "Action plans (“How will this be achieved?”) detailed?",
      },
      {
        id: "wr11-movein",
        label: "Move-in date mistakenly used as the target achievement date?",
      },
      {
        id: "wr12-reviews",
        label: "WR-12 reviews completed every 3 months with resident reflections?",
      },
    ],
    statements: [
      {
        id: "wr11-open",
        template: "At least five active goals are open. The set is [insert example].",
      },
      {
        id: "wr11-aligned",
        template:
          "Goals match the needs in WR-01 and WR-09, particularly [insert example].",
      },
      {
        id: "wr11-how",
        template:
          "The action plan explains how the goal will be achieved: [insert example].",
      },
      {
        id: "wr11-replaced-line",
        template:
          "A completed goal was replaced with a new active goal: [insert example].",
      },
      {
        id: "wr11-date-error",
        template:
          "Concern: the move-in date has been entered as the target achievement date for [insert example].",
      },
      {
        id: "wr12-reflection",
        template:
          "WR-12 reviews are completed every three months. Resident reflection: [insert example].",
      },
    ],
  },
  {
    id: "wr13",
    title: "WR-13 (Support Session Records) & Qualitative Deep-Dive",
    summary:
      "Selected goals, support the worker delivered, and feedback on quality.",
    checks: [
      {
        id: "wr13-goals-list",
        label: "Section A lists the active goals without extra commentary?",
      },
      {
        id: "wr13-worker",
        label: "Section B states what the support worker did, grouped by goal?",
      },
      {
        id: "wr13-relevancy",
        label: "Relevancy: sessions align with WR-01, WR-09 and WR-11?",
      },
      {
        id: "wr13-follow",
        label: "Follow-up: previous tasks revisited and the WR-13 follow-up box used?",
      },
      {
        id: "wr13-resources",
        label: "Resources and signposting to reputable agencies?",
      },
      { id: "wr13-evidence", label: "Evidence attached?" },
      {
        id: "wr13-practical",
        label: "Practical (“do with”) support balanced against pure advice?",
      },
      {
        id: "wr13-duplication",
        label: "Duplication and authenticity checked (copy-paste, wrong name, conflicting info)?",
      },
    ],
    statements: [
      {
        id: "wr13-relevant",
        template:
          "Relevancy: weekly sessions align with WR-01, WR-09 and WR-11. Example: [insert example].",
      },
      {
        id: "wr13-followed",
        template:
          "Follow-up: the previous task was revisited and the WR-13 follow-up box records [insert example].",
      },
      {
        id: "wr13-signpost",
        template:
          "Resources and signposting: the worker referred the resident to [insert example].",
      },
      {
        id: "wr13-proof",
        template: "Evidence is attached: [insert example].",
      },
      {
        id: "wr13-dowith",
        template:
          "The balance of support is practical (“do with”) rather than advice only. Example: [insert example].",
      },
      {
        id: "wr13-authentic",
        template: "Duplication and authenticity check: [insert example].",
      },
      {
        id: "wr13-strength",
        template: "Point of strength: [insert example].",
      },
      {
        id: "wr13-next",
        template: "Next step: [insert example].",
      },
    ],
  },
  {
    id: "general",
    title: "General Notes & Previous Audit Follow-up",
    summary:
      "Administrative errors, rent table corrections, missing signatures, and previous advisories.",
    checks: [
      { id: "general-admin", label: "Administrative errors recorded?" },
      { id: "general-rent", label: "Rent setting corrections recorded?" },
      { id: "general-signatures", label: "Missing signatures recorded?" },
      {
        id: "general-previous",
        label: "Managing agent acted on previous audit advisories?",
      },
    ],
    statements: [
      {
        id: "general-error",
        template: "Administrative error on [insert example].",
      },
      {
        id: "general-rent-line",
        template: "Rent table correction: [insert example].",
      },
      {
        id: "general-signature",
        template: "Missing signature on [insert example].",
      },
      {
        id: "general-followed",
        template:
          "Previous audit advisory: the managing agent [insert example].",
      },
    ],
  },
]

export function sectionById(id: string) {
  return RUBRIC_SECTIONS.find((section) => section.id === id) ?? null
}
