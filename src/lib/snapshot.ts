import { coerceScore, mergeAudit } from "@/lib/audit-factory"
import type {
  AuditScore,
  CaseloadGroup,
  CrmStatus,
  ManagingAgent,
  Profile,
  RentSchedule,
  ResidentFile,
  Snapshot,
} from "@/lib/types"

const GROUPS = new Set<CaseloadGroup>(["active", "first-time"])
const STATUSES = new Set<CrmStatus>([
  "Files Requested",
  "Docs Received",
  "Awaiting More Info",
  "Audit in Progress",
  "Audit Complete",
  "Teams Call Scheduled",
])

export const EMPTY_PROFILE: Profile = {
  name: "",
  role: "",
  email: "",
  defaultClientRpName: "",
}

export const EMPTY_SNAPSHOT: Snapshot = {
  profile: EMPTY_PROFILE,
  agents: [],
  rentSchedules: [],
  files: [],
  selectedFileId: "",
}

function text(value: unknown, max = 4000) {
  return typeof value === "string" ? value.slice(0, max) : ""
}

function record(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null
}

export function sanitizeProfile(value: unknown): Profile {
  const raw = record(value)
  if (!raw) return { ...EMPTY_PROFILE }
  return {
    name: text(raw.name, 120),
    role: text(raw.role, 120),
    email: text(raw.email, 180),
    defaultClientRpName: text(raw.defaultClientRpName, 180),
  }
}

export function sanitizeAgent(value: unknown): ManagingAgent | null {
  const raw = record(value)
  if (!raw) return null
  const id = text(raw.id, 80)
  if (!id) return null
  const group = raw.group
  const status = raw.status ?? raw.crmStatus
  const score = coerceScore(raw.overallScore)
  return {
    id,
    name: text(raw.name, 180),
    group: typeof group === "string" && GROUPS.has(group as CaseloadGroup)
      ? (group as CaseloadGroup)
      : "active",
    propertiesUnits: text(raw.propertiesUnits, 120),
    docsDeadline: text(raw.docsDeadline, 20),
    docsReceived: text(raw.docsReceived, 20),
    crmStatus:
      typeof status === "string" && STATUSES.has(status as CrmStatus)
        ? (status as CrmStatus)
        : "Files Requested",
    overallScore: score,
    reRequestDeadline: text(raw.reRequestDeadline, 20),
    teamsCallDate: text(raw.teamsCallDate, 20),
  }
}

export function sanitizeRent(value: unknown): RentSchedule | null {
  const raw = record(value)
  if (!raw) return null
  const id = text(raw.id, 80)
  if (!id) return null
  return {
    id,
    propertyName: text(raw.propertyName, 180),
    legalEntity: text(raw.legalEntity, 180),
    address: text(raw.address, 300),
    weeklyRent: text(raw.weeklyRent, 40),
    licenceCharge: text(raw.licenceCharge, 40),
    serviceCharge: text(raw.serviceCharge, 40),
    notes: text(raw.notes, 2000),
  }
}

export function sanitizeFile(value: unknown): ResidentFile | null {
  const raw = record(value)
  if (!raw) return null
  const id = text(raw.id, 80)
  const agentId = text(raw.agentId, 80)
  if (!id || !agentId) return null
  const score = coerceScore(raw.score) satisfies AuditScore
  return {
    id,
    agentId,
    fileName: text(raw.fileName, 240) || "Resident file",
    mimeType: text(raw.mimeType, 120),
    byteSize:
      typeof raw.byteSize === "bigint"
        ? Number(raw.byteSize)
        : typeof raw.byteSize === "number" && raw.byteSize >= 0
          ? raw.byteSize
          : 0,
    uploadedAt: text(raw.uploadedAt, 40),
    scoredAt: score === "unscored" ? "" : text(raw.scoredAt, 40),
    extractText: text(raw.extractText, 2_000_000),
    extractEngine: text(raw.extractEngine, 80),
    extractError: text(raw.extractError, 2000),
    previewHtml: text(raw.previewHtml, 2_000_000),
    score,
    audit: mergeAudit(raw.audit),
  }
}

export function sanitizeSnapshot(value: unknown): Snapshot {
  const raw = record(value)
  if (!raw) return structuredClone(EMPTY_SNAPSHOT)
  const agents = (Array.isArray(raw.agents) ? raw.agents : [])
    .map(sanitizeAgent)
    .filter((agent): agent is ManagingAgent => agent !== null)
    .slice(0, 300)
  const agentIds = new Set(agents.map((agent) => agent.id))
  const files = (Array.isArray(raw.files) ? raw.files : [])
    .map(sanitizeFile)
    .filter((file): file is ResidentFile => file !== null && agentIds.has(file.agentId))
    .slice(0, 400)
  const selected = text(raw.selectedFileId, 80)
  return {
    profile: sanitizeProfile(raw.profile),
    agents,
    rentSchedules: (Array.isArray(raw.rentSchedules) ? raw.rentSchedules : [])
      .map(sanitizeRent)
      .filter((row): row is RentSchedule => row !== null)
      .slice(0, 200),
    files,
    selectedFileId: files.some((file) => file.id === selected) ? selected : "",
  }
}
