export type AuditorProfile = {
  name: string
  role: string
  email: string
  phone: string
  organisation: string
}

export type MasterlistSection = {
  id: string
  label: string
  content: string
}

export const DEFAULT_AUDITOR: AuditorProfile = {
  name: "Amara Okonkwo",
  role: "Lead Auditor",
  email: "amara.okonkwo@audit.local",
  phone: "020 5550 0100",
  organisation: "Seaaudit Internal Assurance",
}

export const DEFAULT_MASTERLIST: MasterlistSection[] = [
  {
    id: "relevancy",
    label: "Relevancy",
    content:
      "Support interventions must map clearly to assessed needs on WR-01 and active WR-11 goals.",
  },
  {
    id: "follow-up",
    label: "Follow-up",
    content:
      "Every WR-13 session should record a dated follow-up action and owner.",
  },
  {
    id: "resources",
    label: "Resources",
    content:
      "Prefer named external resources (benefits, health, employment) over generic advice.",
  },
  {
    id: "evidence",
    label: "Evidence",
    content:
      "Attach screenshots, letters, or referral confirmations that corroborate session claims.",
  },
  {
    id: "practical-support",
    label: "Practical Support",
    content:
      "Record practical steps taken with the resident, not only discussion of options.",
  },
  {
    id: "progress",
    label: "Progress",
    content:
      "WR-12 reviews should describe movement against each active goal since the last review.",
  },
  {
    id: "duplication",
    label: "Duplication",
    content:
      "Avoid copy-pasted session notes across weeks; each entry should be distinct.",
  },
  {
    id: "general-notes",
    label: "General Notes",
    content:
      "Capture contextual factors that affect engagement without repeating the risk matrix.",
  },
]
