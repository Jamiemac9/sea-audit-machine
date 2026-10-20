export type AssuranceRating =
  | "Substantial"
  | "Reasonable"
  | "Limited"
  | "No Assurance"

export type ProjectStatus = "Fieldwork" | "In review" | "Reporting" | "Closed"

export type AuditClient = {
  id: string
  name: string
  schemes: { id: string; name: string }[]
}

export type ManagingAgent = {
  id: string
  name: string
  contract: string
  region: string
}

export type AuditProject = {
  id: string
  name: string
  clientId: string
  schemeId: string
  managingAgentId: string
  filesAudited: number
  complianceScore: number
  assurance: AssuranceRating
  status: ProjectStatus
  updatedAt: string
}

export type AuditActivity = {
  id: string
  clientId: string
  schemeId: string
  projectId: string
  title: string
  detail: string
  at: string
}

export type RemediationCall = {
  id: string
  clientId: string
  schemeId: string
  managingAgentId: string
  projectId: string
  title: string
  due: string
  priority: "High" | "Medium" | "Low"
  status: "Open" | "Closed"
}

export type IssuedReport = {
  id: string
  clientId: string
  title: string
  scope: string
  issued: string
  author: string
  opinion: AssuranceRating
}

export const ASSURANCE_LINE = 80

export const ASSURANCE_RATINGS: AssuranceRating[] = [
  "Substantial",
  "Reasonable",
  "Limited",
  "No Assurance",
]

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
})

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
  hourCycle: "h23",
})

const numberFormatter = new Intl.NumberFormat("en-GB")

const scoreFormatter = new Intl.NumberFormat("en-GB", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

export function formatAuditDate(iso: string) {
  return dateFormatter.format(new Date(iso))
}

export function formatAuditDateTime(iso: string) {
  return dateTimeFormatter.format(new Date(iso))
}

export function formatCount(value: number) {
  return numberFormatter.format(value)
}

export function formatScore(value: number) {
  return scoreFormatter.format(value)
}

export function assuranceForScore(score: number): AssuranceRating {
  if (score >= 90) return "Substantial"
  if (score >= ASSURANCE_LINE) return "Reasonable"
  if (score >= 60) return "Limited"
  return "No Assurance"
}

export const clients: AuditClient[] = [
  {
    id: "harbour",
    name: "Harbour & Vale Housing",
    schemes: [
      { id: "rq", name: "Riverside Quarter" },
      { id: "de", name: "Docklands Estate" },
      { id: "om", name: "Old Mill Court" },
    ],
  },
  {
    id: "northshore",
    name: "Northshore Community Homes",
    schemes: [
      { id: "bp", name: "Beacon Park" },
      { id: "hw", name: "Harbour Walk" },
    ],
  },
  {
    id: "meridian",
    name: "Meridian Living",
    schemes: [
      { id: "cw", name: "Canal Wharf" },
      { id: "sg", name: "South Gate" },
    ],
  },
]

export const managingAgents: ManagingAgent[] = [
  {
    id: "apex",
    name: "Apex Property Services",
    contract: "Responsive repairs and compliance",
    region: "South East",
  },
  {
    id: "keystone",
    name: "Keystone Housing Management",
    contract: "Block management",
    region: "London and East",
  },
  {
    id: "lumen",
    name: "Lumen Estates",
    contract: "Planned maintenance",
    region: "Midlands",
  },
  {
    id: "bridgeway",
    name: "Bridgeway FM",
    contract: "Mechanical and electrical",
    region: "National",
  },
  {
    id: "oak",
    name: "Oak & Wren Lettings",
    contract: "Lettings and resident services",
    region: "South East",
  },
]

export const seedProjects: AuditProject[] = [
  {
    id: "p1",
    name: "Fire door survey",
    clientId: "harbour",
    schemeId: "rq",
    managingAgentId: "apex",
    filesAudited: 128,
    complianceScore: 96,
    assurance: "Substantial",
    status: "In review",
    updatedAt: "2026-10-12T09:15:00.000Z",
  },
  {
    id: "p2",
    name: "Gas servicing compliance",
    clientId: "harbour",
    schemeId: "de",
    managingAgentId: "keystone",
    filesAudited: 86,
    complianceScore: 71,
    assurance: "Limited",
    status: "Fieldwork",
    updatedAt: "2026-10-18T14:40:00.000Z",
  },
  {
    id: "p3",
    name: "Legionella risk controls",
    clientId: "harbour",
    schemeId: "om",
    managingAgentId: "lumen",
    filesAudited: 54,
    complianceScore: 84,
    assurance: "Reasonable",
    status: "Reporting",
    updatedAt: "2026-10-09T11:05:00.000Z",
  },
  {
    id: "p4",
    name: "Electrical installation condition",
    clientId: "harbour",
    schemeId: "rq",
    managingAgentId: "bridgeway",
    filesAudited: 41,
    complianceScore: 48,
    assurance: "No Assurance",
    status: "Fieldwork",
    updatedAt: "2026-10-16T16:20:00.000Z",
  },
  {
    id: "p5",
    name: "Asbestos management plan",
    clientId: "harbour",
    schemeId: "de",
    managingAgentId: "oak",
    filesAudited: 63,
    complianceScore: 88,
    assurance: "Reasonable",
    status: "Closed",
    updatedAt: "2026-10-04T10:00:00.000Z",
  },
  {
    id: "p6",
    name: "Lift thorough examination",
    clientId: "harbour",
    schemeId: "om",
    managingAgentId: "apex",
    filesAudited: 22,
    complianceScore: 94,
    assurance: "Substantial",
    status: "Reporting",
    updatedAt: "2026-09-28T13:10:00.000Z",
  },
  {
    id: "p7",
    name: "Water hygiene log review",
    clientId: "harbour",
    schemeId: "rq",
    managingAgentId: "keystone",
    filesAudited: 39,
    complianceScore: 67,
    assurance: "Limited",
    status: "Fieldwork",
    updatedAt: "2026-10-19T08:50:00.000Z",
  },
  {
    id: "p8",
    name: "Fire risk assessment",
    clientId: "northshore",
    schemeId: "bp",
    managingAgentId: "apex",
    filesAudited: 47,
    complianceScore: 82,
    assurance: "Reasonable",
    status: "In review",
    updatedAt: "2026-10-11T09:00:00.000Z",
  },
  {
    id: "p9",
    name: "Gas safety sample",
    clientId: "northshore",
    schemeId: "bp",
    managingAgentId: "keystone",
    filesAudited: 60,
    complianceScore: 91,
    assurance: "Substantial",
    status: "Reporting",
    updatedAt: "2026-10-08T15:25:00.000Z",
  },
  {
    id: "p10",
    name: "Electrical observations",
    clientId: "northshore",
    schemeId: "hw",
    managingAgentId: "bridgeway",
    filesAudited: 33,
    complianceScore: 62,
    assurance: "Limited",
    status: "Fieldwork",
    updatedAt: "2026-10-17T12:15:00.000Z",
  },
  {
    id: "p11",
    name: "Asbestos register check",
    clientId: "northshore",
    schemeId: "hw",
    managingAgentId: "lumen",
    filesAudited: 28,
    complianceScore: 86,
    assurance: "Reasonable",
    status: "In review",
    updatedAt: "2026-10-06T10:45:00.000Z",
  },
  {
    id: "p12",
    name: "Communal fire precautions",
    clientId: "meridian",
    schemeId: "cw",
    managingAgentId: "apex",
    filesAudited: 70,
    complianceScore: 93,
    assurance: "Substantial",
    status: "Reporting",
    updatedAt: "2026-10-14T09:30:00.000Z",
  },
  {
    id: "p13",
    name: "Water hygiene controls",
    clientId: "meridian",
    schemeId: "cw",
    managingAgentId: "keystone",
    filesAudited: 19,
    complianceScore: 44,
    assurance: "No Assurance",
    status: "Fieldwork",
    updatedAt: "2026-10-18T11:55:00.000Z",
  },
  {
    id: "p14",
    name: "Lift servicing records",
    clientId: "meridian",
    schemeId: "sg",
    managingAgentId: "oak",
    filesAudited: 15,
    complianceScore: 85,
    assurance: "Reasonable",
    status: "In review",
    updatedAt: "2026-10-02T14:05:00.000Z",
  },
  {
    id: "p15",
    name: "Gas access failures",
    clientId: "meridian",
    schemeId: "sg",
    managingAgentId: "bridgeway",
    filesAudited: 40,
    complianceScore: 69,
    assurance: "Limited",
    status: "Fieldwork",
    updatedAt: "2026-10-15T16:40:00.000Z",
  },
]

export const seedActivities: AuditActivity[] = [
  {
    id: "a1",
    clientId: "harbour",
    schemeId: "rq",
    projectId: "p7",
    title: "Temperature logs requested",
    detail: "Keystone asked to produce October outlet readings for Riverside Quarter.",
    at: "2026-10-19T08:50:00.000Z",
  },
  {
    id: "a2",
    clientId: "harbour",
    schemeId: "de",
    projectId: "p2",
    title: "LGSR sample extended",
    detail: "Twelve dwellings added after three certificates could not be traced.",
    at: "2026-10-18T14:40:00.000Z",
  },
  {
    id: "a3",
    clientId: "harbour",
    schemeId: "rq",
    projectId: "p4",
    title: "C1 observations escalated",
    detail: "Bridgeway FM notified of live electrical defects on two blocks.",
    at: "2026-10-16T16:20:00.000Z",
  },
  {
    id: "a4",
    clientId: "harbour",
    schemeId: "rq",
    projectId: "p1",
    title: "Fire door file accepted",
    detail: "Apex uploaded the surveyed door schedule and closer certificates.",
    at: "2026-10-12T09:15:00.000Z",
  },
  {
    id: "a5",
    clientId: "harbour",
    schemeId: "om",
    projectId: "p3",
    title: "Scheme risk assessment reviewed",
    detail: "Lumen Estates legionella assessment dated within the last two years.",
    at: "2026-10-09T11:05:00.000Z",
  },
  {
    id: "a6",
    clientId: "harbour",
    schemeId: "de",
    projectId: "p5",
    title: "Asbestos opinion closed",
    detail: "Oak & Wren register and re-inspection dates agreed as reasonable.",
    at: "2026-10-04T10:00:00.000Z",
  },
  {
    id: "a7",
    clientId: "northshore",
    schemeId: "hw",
    projectId: "p10",
    title: "EICR batch received",
    detail: "Bridgeway FM sent 33 reports. Four contain unresolved C1 codes.",
    at: "2026-10-17T12:15:00.000Z",
  },
  {
    id: "a8",
    clientId: "northshore",
    schemeId: "bp",
    projectId: "p8",
    title: "Fire risk actions checked",
    detail: "Apex closed 18 of 22 actions from the Beacon Park assessment.",
    at: "2026-10-11T09:00:00.000Z",
  },
  {
    id: "a9",
    clientId: "meridian",
    schemeId: "cw",
    projectId: "p13",
    title: "No current water log",
    detail: "Keystone could not produce a temperature log for Canal Wharf.",
    at: "2026-10-18T11:55:00.000Z",
  },
  {
    id: "a10",
    clientId: "meridian",
    schemeId: "sg",
    projectId: "p15",
    title: "Access failures logged",
    detail: "Bridgeway FM recorded 11 missed gas appointments at South Gate.",
    at: "2026-10-15T16:40:00.000Z",
  },
]

export const seedRemediations: RemediationCall[] = [
  {
    id: "c1",
    clientId: "harbour",
    schemeId: "rq",
    managingAgentId: "bridgeway",
    projectId: "p4",
    title: "Call Bridgeway on live electrical defects",
    due: "2026-10-22",
    priority: "High",
    status: "Open",
  },
  {
    id: "c2",
    clientId: "harbour",
    schemeId: "de",
    managingAgentId: "keystone",
    projectId: "p2",
    title: "Call Keystone on missing gas certificates",
    due: "2026-10-23",
    priority: "High",
    status: "Open",
  },
  {
    id: "c3",
    clientId: "harbour",
    schemeId: "rq",
    managingAgentId: "keystone",
    projectId: "p7",
    title: "Call Keystone on incomplete temperature logs",
    due: "2026-10-24",
    priority: "Medium",
    status: "Open",
  },
  {
    id: "c4",
    clientId: "harbour",
    schemeId: "om",
    managingAgentId: "lumen",
    projectId: "p3",
    title: "Confirm sentinel outlet list with Lumen",
    due: "2026-09-30",
    priority: "Low",
    status: "Closed",
  },
  {
    id: "c5",
    clientId: "northshore",
    schemeId: "hw",
    managingAgentId: "bridgeway",
    projectId: "p10",
    title: "Call Bridgeway on unresolved C1 codes",
    due: "2026-10-21",
    priority: "High",
    status: "Open",
  },
  {
    id: "c6",
    clientId: "meridian",
    schemeId: "cw",
    managingAgentId: "keystone",
    projectId: "p13",
    title: "Call Keystone on absent water hygiene records",
    due: "2026-10-21",
    priority: "High",
    status: "Open",
  },
  {
    id: "c7",
    clientId: "meridian",
    schemeId: "sg",
    managingAgentId: "bridgeway",
    projectId: "p15",
    title: "Call Bridgeway on repeated no-access gas visits",
    due: "2026-10-25",
    priority: "Medium",
    status: "Open",
  },
]

export const issuedReports: IssuedReport[] = [
  {
    id: "r1",
    clientId: "harbour",
    title: "Q2 2026 statutory compliance opinion",
    scope: "All Harbour & Vale schemes",
    issued: "2026-07-18",
    author: "Amara Okonkwo",
    opinion: "Limited",
  },
  {
    id: "r2",
    clientId: "harbour",
    title: "Fire door thematic",
    scope: "Riverside Quarter",
    issued: "2026-05-02",
    author: "Amara Okonkwo",
    opinion: "Reasonable",
  },
  {
    id: "r3",
    clientId: "northshore",
    title: "Q2 2026 block compliance",
    scope: "Beacon Park and Harbour Walk",
    issued: "2026-07-09",
    author: "Amara Okonkwo",
    opinion: "Reasonable",
  },
  {
    id: "r4",
    clientId: "meridian",
    title: "Q1 2026 water hygiene follow-up",
    scope: "Canal Wharf",
    issued: "2026-04-16",
    author: "Amara Okonkwo",
    opinion: "No Assurance",
  },
]

export const rubricDomains = [
  {
    id: "fire",
    name: "Fire safety",
    basis: "Regulatory Reform (Fire Safety) Order 2005 and the Building Safety Act 2022",
    criteria: [
      {
        name: "Current fire risk assessment",
        evidence: "Assessment in date, with a named responsible person and an action log.",
        weight: "High",
      },
      {
        name: "Fire door condition",
        evidence: "Survey schedule, closer certificates, and remedial completion dates.",
        weight: "High",
      },
    ],
  },
  {
    id: "gas",
    name: "Gas safety",
    basis: "Gas Safety (Installation and Use) Regulations 1998",
    criteria: [
      {
        name: "Annual safety checks",
        evidence: "Landlord gas safety records within 12 months for the sampled homes.",
        weight: "High",
      },
      {
        name: "No-access process",
        evidence: "Recorded appointments, legal warnings, and capped supplies where required.",
        weight: "Medium",
      },
    ],
  },
  {
    id: "water",
    name: "Water hygiene",
    basis: "HSE Approved Code of Practice L8 and HSG274",
    criteria: [
      {
        name: "Legionella risk assessment",
        evidence: "Scheme assessment reviewed within the provider's stated cycle.",
        weight: "High",
      },
      {
        name: "Temperature monitoring",
        evidence: "Sentinel outlet logs with out-of-range results acted on.",
        weight: "High",
      },
    ],
  },
  {
    id: "electrical",
    name: "Electrical safety",
    basis: "BS 7671 electrical installation condition reporting",
    criteria: [
      {
        name: "In-date condition reports",
        evidence: "EICR for communal systems, with C1 and C2 observations cleared.",
        weight: "High",
      },
    ],
  },
  {
    id: "asbestos",
    name: "Asbestos",
    basis: "Control of Asbestos Regulations 2012",
    criteria: [
      {
        name: "Register and re-inspection",
        evidence: "Accessible register and re-inspection dates for known materials.",
        weight: "Medium",
      },
    ],
  },
  {
    id: "lifts",
    name: "Lifting equipment",
    basis: "Lifting Operations and Lifting Equipment Regulations 1998",
    criteria: [
      {
        name: "Thorough examination",
        evidence: "Examination reports within the required interval and defects closed.",
        weight: "High",
      },
    ],
  },
] as const

export function inScope<T extends { clientId: string; schemeId: string }>(
  items: T[],
  clientId: string,
  schemeId: string
) {
  return items.filter(
    (item) =>
      item.clientId === clientId &&
      (schemeId === "all" || item.schemeId === schemeId)
  )
}

export function averageScore(projects: AuditProject[]) {
  if (projects.length === 0) return null
  const total = projects.reduce((sum, project) => sum + project.complianceScore, 0)
  return total / projects.length
}

export type AgentPerformance = {
  agent: ManagingAgent
  projects: AuditProject[]
  filesAudited: number
  averageScore: number
  openCalls: number
  assuranceCounts: Record<AssuranceRating, number>
}

export function performanceByAgent(
  projects: AuditProject[],
  calls: RemediationCall[]
): AgentPerformance[] {
  const grouped = new Map<string, AuditProject[]>()
  for (const project of projects) {
    const current = grouped.get(project.managingAgentId) ?? []
    current.push(project)
    grouped.set(project.managingAgentId, current)
  }

  return managingAgents
    .filter((agent) => grouped.has(agent.id))
    .map((agent) => {
      const agentProjects = grouped.get(agent.id) ?? []
      const assuranceCounts = {
        Substantial: 0,
        Reasonable: 0,
        Limited: 0,
        "No Assurance": 0,
      } satisfies Record<AssuranceRating, number>
      for (const project of agentProjects) {
        assuranceCounts[project.assurance] += 1
      }
      return {
        agent,
        projects: [...agentProjects].sort(
          (a, b) => a.complianceScore - b.complianceScore
        ),
        filesAudited: agentProjects.reduce(
          (sum, project) => sum + project.filesAudited,
          0
        ),
        averageScore: averageScore(agentProjects) ?? 0,
        openCalls: calls.filter(
          (call) =>
            call.managingAgentId === agent.id && call.status === "Open"
        ).length,
        assuranceCounts,
      }
    })
    .sort((a, b) => a.averageScore - b.averageScore)
}
