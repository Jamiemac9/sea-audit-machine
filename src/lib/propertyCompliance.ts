export type CertStatus =
  | "Valid"
  | "Not Required"
  | "Expiring Soon"
  | "Expired"
  | "Missing"
  | "Completed"
  | "Action Required"

export type Big8CertKey =
  | "gas"
  | "fireAlarm"
  | "eml"
  | "fra"
  | "legionella"
  | "pat"
  | "asbestos"
  | "dampMould"

export type CertificateBlock = {
  required: boolean
  status: CertStatus
  expiryDate: string | null
  uploadName: string | null
}

export type PropertyComplianceRow = {
  id: string
  address: string
  region: string
  notes: string
  managingAgentId: string
  accessContact: string
  gas: CertificateBlock
  fireAlarm: CertificateBlock
  eml: CertificateBlock
  fra: CertificateBlock
  legionella: CertificateBlock
  pat: CertificateBlock
  asbestos: CertificateBlock
  dampMould: CertificateBlock
  documentCount: number
  insuranceExpiry: string | null
  insuranceUpload: string | null
  insuranceStatus: CertStatus
  reInspectionUpload: string | null
  nextInspectionDate: string | null
  leaseSlaDate: string | null
  leaseSlaUpload: string | null
}

export const BIG8_LABELS: Record<Big8CertKey, string> = {
  gas: "Gas Safety",
  fireAlarm: "Fire Alarm",
  eml: "Emergency Lighting",
  fra: "Fire Risk Assessment",
  legionella: "Legionella (LRA)",
  pat: "PAT Testing",
  asbestos: "Asbestos",
  dampMould: "Damp and Mould",
}

function cert(
  partial: Partial<CertificateBlock> & Pick<CertificateBlock, "status">,
): CertificateBlock {
  return {
    required: partial.required ?? true,
    status: partial.status,
    expiryDate: partial.expiryDate ?? null,
    uploadName: partial.uploadName ?? null,
  }
}

export const seedProperties: PropertyComplianceRow[] = [
  {
    id: "prop-1",
    address: "226 Wright Road, Birmingham",
    region: "Birmingham",
    notes: "HMO 5 beds — EML and PAT required.",
    managingAgentId: "ma-chantry",
    accessContact: "Site desk — access@chantry.example",
    gas: cert({
      status: "Valid",
      expiryDate: "2027-03-12",
      uploadName: "gas-226-wright.pdf",
    }),
    fireAlarm: cert({
      status: "Valid",
      expiryDate: "2027-01-08",
      uploadName: "fire-alarm-226.pdf",
    }),
    eml: cert({
      required: true,
      status: "Expiring Soon",
      expiryDate: "2026-11-02",
      uploadName: "eml-226.pdf",
    }),
    fra: cert({
      required: true,
      status: "Valid",
      expiryDate: "2027-06-01",
      uploadName: "fra-226.pdf",
    }),
    legionella: cert({
      status: "Valid",
      expiryDate: "2027-02-20",
      uploadName: "lra-226.pdf",
    }),
    pat: cert({
      required: true,
      status: "Valid",
      expiryDate: "2027-04-15",
      uploadName: "pat-226.pdf",
    }),
    asbestos: cert({
      status: "Completed",
      uploadName: "asbestos-226.pdf",
    }),
    dampMould: cert({
      status: "Valid",
      expiryDate: "2027-05-01",
      uploadName: "dm-226.pdf",
    }),
    documentCount: 9,
    insuranceExpiry: "2027-01-31",
    insuranceUpload: "insurance-226.pdf",
    insuranceStatus: "Valid",
    reInspectionUpload: "reinspect-226.pdf",
    nextInspectionDate: "2026-12-15",
    leaseSlaDate: "2025-04-01",
    leaseSlaUpload: "lease-sla-226.pdf",
  },
  {
    id: "prop-2",
    address: "18 Canal Side, Birmingham",
    region: "Birmingham",
    notes: "Awaiting FRA renewal pack.",
    managingAgentId: "ma-chantry",
    accessContact: "Natalie Brooks",
    gas: cert({
      status: "Valid",
      expiryDate: "2027-05-01",
      uploadName: "gas-18-canal.pdf",
    }),
    fireAlarm: cert({
      status: "Expired",
      expiryDate: "2026-09-01",
      uploadName: "fire-alarm-18.pdf",
    }),
    eml: cert({
      required: true,
      status: "Missing",
    }),
    fra: cert({
      required: true,
      status: "Expired",
      expiryDate: "2026-08-12",
    }),
    legionella: cert({
      status: "Valid",
      expiryDate: "2027-01-10",
      uploadName: "lra-18.pdf",
    }),
    pat: cert({
      required: true,
      status: "Missing",
    }),
    asbestos: cert({ status: "Missing" }),
    dampMould: cert({
      status: "Action Required",
      expiryDate: "2026-10-01",
    }),
    documentCount: 4,
    insuranceExpiry: "2026-12-01",
    insuranceUpload: "insurance-18.pdf",
    insuranceStatus: "Expiring Soon",
    reInspectionUpload: null,
    nextInspectionDate: "2026-11-01",
    leaseSlaDate: "2024-09-01",
    leaseSlaUpload: "lease-sla-18.pdf",
  },
  {
    id: "prop-3",
    address: "9 Mill Lane, Midlands",
    region: "Midlands",
    notes: "Self-contained — PAT not required.",
    managingAgentId: "ma-best",
    accessContact: "Marcus Webb",
    gas: cert({
      status: "Valid",
      expiryDate: "2027-07-20",
      uploadName: "gas-9-mill.pdf",
    }),
    fireAlarm: cert({
      status: "Valid",
      expiryDate: "2027-03-01",
      uploadName: "fire-9-mill.pdf",
    }),
    eml: cert({ required: false, status: "Not Required" }),
    fra: cert({
      required: true,
      status: "Valid",
      expiryDate: "2027-08-01",
      uploadName: "fra-9-mill.pdf",
    }),
    legionella: cert({
      status: "Valid",
      expiryDate: "2027-04-01",
      uploadName: "lra-9-mill.pdf",
    }),
    pat: cert({ required: false, status: "Not Required" }),
    asbestos: cert({
      status: "Completed",
      uploadName: "asbestos-9-mill.pdf",
    }),
    dampMould: cert({
      status: "Valid",
      expiryDate: "2027-06-01",
      uploadName: "dm-9-mill.pdf",
    }),
    documentCount: 7,
    insuranceExpiry: "2027-02-28",
    insuranceUpload: "insurance-9-mill.pdf",
    insuranceStatus: "Valid",
    reInspectionUpload: "reinspect-9-mill.pdf",
    nextInspectionDate: "2027-01-20",
    leaseSlaDate: "2025-01-15",
    leaseSlaUpload: "lease-sla-9-mill.pdf",
  },
  {
    id: "prop-4",
    address: "Beacon Park Block A, Manchester",
    region: "Manchester",
    notes: "Block FRA covers communal systems.",
    managingAgentId: "ma-chantry",
    accessContact: "Site desk — access@chantry.example",
    gas: cert({
      status: "Valid",
      expiryDate: "2027-02-01",
      uploadName: "gas-beacon-a.pdf",
    }),
    fireAlarm: cert({
      status: "Valid",
      expiryDate: "2027-02-15",
      uploadName: "fire-beacon-a.pdf",
    }),
    eml: cert({
      required: true,
      status: "Valid",
      expiryDate: "2027-02-15",
      uploadName: "eml-beacon-a.pdf",
    }),
    fra: cert({
      required: true,
      status: "Valid",
      expiryDate: "2027-05-20",
      uploadName: "fra-beacon-a.pdf",
    }),
    legionella: cert({
      status: "Expiring Soon",
      expiryDate: "2026-11-10",
      uploadName: "lra-beacon-a.pdf",
    }),
    pat: cert({
      required: true,
      status: "Valid",
      expiryDate: "2027-01-01",
      uploadName: "pat-beacon-a.pdf",
    }),
    asbestos: cert({
      status: "Completed",
      uploadName: "asbestos-beacon-a.pdf",
    }),
    dampMould: cert({
      status: "Valid",
      expiryDate: "2027-03-01",
      uploadName: "dm-beacon-a.pdf",
    }),
    documentCount: 11,
    insuranceExpiry: "2027-06-30",
    insuranceUpload: "insurance-beacon.pdf",
    insuranceStatus: "Valid",
    reInspectionUpload: null,
    nextInspectionDate: "2026-12-01",
    leaseSlaDate: "2025-06-01",
    leaseSlaUpload: "lease-sla-beacon.pdf",
  },
  {
    id: "prop-5",
    address: "South Gate Unit 4, National",
    region: "National",
    notes: "Gas certificate missing after contractor change.",
    managingAgentId: "ma-best",
    accessContact: "Marcus Webb",
    gas: cert({ status: "Missing" }),
    fireAlarm: cert({
      status: "Valid",
      expiryDate: "2027-04-01",
      uploadName: "fire-southgate.pdf",
    }),
    eml: cert({ required: false, status: "Not Required" }),
    fra: cert({
      required: true,
      status: "Missing",
    }),
    legionella: cert({
      status: "Valid",
      expiryDate: "2027-01-01",
      uploadName: "lra-southgate.pdf",
    }),
    pat: cert({ required: false, status: "Not Required" }),
    asbestos: cert({ status: "Missing" }),
    dampMould: cert({ status: "Action Required" }),
    documentCount: 3,
    insuranceExpiry: null,
    insuranceUpload: null,
    insuranceStatus: "Missing",
    reInspectionUpload: null,
    nextInspectionDate: "2026-11-20",
    leaseSlaDate: "2024-11-01",
    leaseSlaUpload: "lease-sla-southgate.pdf",
  },
]

const FAIL_STATUSES: CertStatus[] = [
  "Expired",
  "Missing",
  "Action Required",
]

export function big8Keys(): Big8CertKey[] {
  return [
    "gas",
    "fireAlarm",
    "eml",
    "fra",
    "legionella",
    "pat",
    "asbestos",
    "dampMould",
  ]
}

export function certForKey(
  property: PropertyComplianceRow,
  key: Big8CertKey,
): CertificateBlock {
  return property[key]
}

export function overallCompliance(property: PropertyComplianceRow) {
  const keys = big8Keys()
  let applicable = 0
  let passed = 0
  let failed = false

  for (const key of keys) {
    const block = certForKey(property, key)
    if (!block.required || block.status === "Not Required") continue
    applicable += 1
    if (FAIL_STATUSES.includes(block.status)) {
      failed = true
    } else if (
      block.status === "Valid" ||
      block.status === "Completed" ||
      block.status === "Expiring Soon"
    ) {
      passed += 1
    }
  }

  const percentage =
    applicable === 0 ? 100 : Math.round((passed / applicable) * 100)
  return {
    percentage: failed ? Math.min(percentage, 89) : percentage,
    status: failed ? ("NON-COMPLIANT" as const) : ("COMPLIANT" as const),
    failed,
  }
}

export function statusTone(status: CertStatus | "COMPLIANT" | "NON-COMPLIANT") {
  if (
    status === "Valid" ||
    status === "Not Required" ||
    status === "Completed" ||
    status === "COMPLIANT"
  ) {
    return "green" as const
  }
  if (status === "Expiring Soon") return "amber" as const
  return "red" as const
}

export function groupPropertiesByRegion(properties: PropertyComplianceRow[]) {
  const groups = new Map<string, PropertyComplianceRow[]>()
  for (const property of properties) {
    const list = groups.get(property.region) ?? []
    list.push(property)
    groups.set(property.region, list)
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
}
