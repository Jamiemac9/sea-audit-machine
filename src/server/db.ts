import fs from "node:fs"
import path from "node:path"
import { DatabaseSync, type SqlValue } from "node:sqlite"
import { newResidentFile } from "@/lib/audit-factory"
import { sanitizeSnapshot } from "@/lib/snapshot"
import type { ResidentFile, Snapshot } from "@/lib/types"

const DATA_DIR = path.join(process.cwd(), "data")
const DB_PATH = path.join(DATA_DIR, "seaaudit.db")
const UPLOAD_DIR = path.join(DATA_DIR, "uploads")

const globalForDb = globalThis as unknown as { seaauditDb?: DatabaseSync }

function migrate(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      default_client_rp_name TEXT NOT NULL DEFAULT ''
    );
    INSERT OR IGNORE INTO profile (id, name, role, email, default_client_rp_name)
      VALUES (1, '', '', '', '');
    CREATE TABLE IF NOT EXISTS managing_agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      caseload_group TEXT NOT NULL,
      properties_units TEXT NOT NULL,
      docs_deadline TEXT NOT NULL,
      docs_received TEXT NOT NULL,
      crm_status TEXT NOT NULL,
      overall_score TEXT NOT NULL,
      re_request_deadline TEXT NOT NULL,
      teams_call_date TEXT NOT NULL,
      sort_order INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS rent_schedules (
      id TEXT PRIMARY KEY,
      property_name TEXT NOT NULL,
      legal_entity TEXT NOT NULL,
      address TEXT NOT NULL,
      weekly_rent TEXT NOT NULL,
      licence_charge TEXT NOT NULL,
      service_charge TEXT NOT NULL,
      notes TEXT NOT NULL,
      sort_order INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS resident_files (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      byte_size INTEGER NOT NULL,
      uploaded_at TEXT NOT NULL,
      scored_at TEXT NOT NULL,
      extract_text TEXT NOT NULL,
      extract_engine TEXT NOT NULL,
      extract_error TEXT NOT NULL,
      preview_html TEXT NOT NULL,
      score TEXT NOT NULL,
      audit_json TEXT NOT NULL,
      storage_name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)
}

export function getDb() {
  if (!globalForDb.seaauditDb) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true })
    const db = new DatabaseSync(DB_PATH)
    db.exec("PRAGMA journal_mode = WAL")
    migrate(db)
    globalForDb.seaauditDb = db
  }
  return globalForDb.seaauditDb
}

function rows(sql: string, ...params: SqlValue[]) {
  return getDb().prepare(sql).all(...params) as Record<string, unknown>[]
}

function one(sql: string, ...params: SqlValue[]) {
  return getDb().prepare(sql).get(...params) as Record<string, unknown> | undefined
}

export function uploadPath(id: string) {
  return path.join(UPLOAD_DIR, id)
}

export function loadSnapshot(): Snapshot {
  const profileRow = one("SELECT * FROM profile WHERE id = 1")
  const agents = rows("SELECT * FROM managing_agents ORDER BY sort_order, name")
  const rents = rows("SELECT * FROM rent_schedules ORDER BY sort_order, property_name")
  const files = rows("SELECT * FROM resident_files ORDER BY uploaded_at DESC")
  const selected = one("SELECT value FROM meta WHERE key = 'selected_file_id'")
  return sanitizeSnapshot({
    profile: {
      name: profileRow?.name,
      role: profileRow?.role,
      email: profileRow?.email,
      defaultClientRpName: profileRow?.default_client_rp_name,
    },
    agents: agents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      group: agent.caseload_group,
      propertiesUnits: agent.properties_units,
      docsDeadline: agent.docs_deadline,
      docsReceived: agent.docs_received,
      crmStatus: agent.crm_status,
      overallScore: agent.overall_score,
      reRequestDeadline: agent.re_request_deadline,
      teamsCallDate: agent.teams_call_date,
    })),
    rentSchedules: rents.map((rent) => ({
      id: rent.id,
      propertyName: rent.property_name,
      legalEntity: rent.legal_entity,
      address: rent.address,
      weeklyRent: rent.weekly_rent,
      licenceCharge: rent.licence_charge,
      serviceCharge: rent.service_charge,
      notes: rent.notes,
    })),
    files: files.map((file) => ({
      id: file.id,
      agentId: file.agent_id,
      fileName: file.file_name,
      mimeType: file.mime_type,
      byteSize: file.byte_size,
      uploadedAt: file.uploaded_at,
      scoredAt: file.scored_at,
      extractText: file.extract_text,
      extractEngine: file.extract_engine,
      extractError: file.extract_error,
      previewHtml: file.preview_html,
      score: file.score,
      audit: parseJson(file.audit_json),
    })),
    selectedFileId: selected?.value,
  })
}

function parseJson(value: unknown) {
  if (typeof value !== "string" || !value) return {}
  try {
    return JSON.parse(value) as unknown
  } catch {
    return {}
  }
}

function unlinkUpload(id: string) {
  const target = uploadPath(id)
  if (fs.existsSync(target)) fs.unlinkSync(target)
}

export function saveSnapshot(input: Snapshot) {
  const snapshot = sanitizeSnapshot(input)
  const db = getDb()
  const existing = rows("SELECT id FROM resident_files").map((row) => String(row.id))
  const keep = new Set(snapshot.files.map((file) => file.id))
  db.exec("BEGIN")
  try {
    db.prepare(
      `UPDATE profile
       SET name = ?, role = ?, email = ?, default_client_rp_name = ?
       WHERE id = 1`,
    ).run(
      snapshot.profile.name,
      snapshot.profile.role,
      snapshot.profile.email,
      snapshot.profile.defaultClientRpName,
    )
    db.prepare("DELETE FROM managing_agents").run()
    const insertAgent = db.prepare(
      `INSERT INTO managing_agents (
        id, name, caseload_group, properties_units, docs_deadline, docs_received,
        crm_status, overall_score, re_request_deadline, teams_call_date, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    snapshot.agents.forEach((agent, index) => {
      insertAgent.run(
        agent.id,
        agent.name,
        agent.group,
        agent.propertiesUnits,
        agent.docsDeadline,
        agent.docsReceived,
        agent.crmStatus,
        agent.overallScore,
        agent.reRequestDeadline,
        agent.teamsCallDate,
        index,
      )
    })
    db.prepare("DELETE FROM rent_schedules").run()
    const insertRent = db.prepare(
      `INSERT INTO rent_schedules (
        id, property_name, legal_entity, address, weekly_rent, licence_charge,
        service_charge, notes, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    snapshot.rentSchedules.forEach((rent, index) => {
      insertRent.run(
        rent.id,
        rent.propertyName,
        rent.legalEntity,
        rent.address,
        rent.weeklyRent,
        rent.licenceCharge,
        rent.serviceCharge,
        rent.notes,
        index,
      )
    })
    for (const id of existing) {
      if (!keep.has(id)) {
        db.prepare("DELETE FROM resident_files WHERE id = ?").run(id)
        unlinkUpload(id)
      }
    }
    const upsert = db.prepare(
      `INSERT INTO resident_files (
        id, agent_id, file_name, mime_type, byte_size, uploaded_at, scored_at,
        extract_text, extract_engine, extract_error, preview_html, score, audit_json, storage_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        agent_id = excluded.agent_id,
        file_name = excluded.file_name,
        mime_type = excluded.mime_type,
        byte_size = excluded.byte_size,
        uploaded_at = excluded.uploaded_at,
        scored_at = excluded.scored_at,
        extract_text = excluded.extract_text,
        extract_engine = excluded.extract_engine,
        extract_error = excluded.extract_error,
        preview_html = excluded.preview_html,
        score = excluded.score,
        audit_json = excluded.audit_json`,
    )
    for (const file of snapshot.files) {
      upsert.run(
        file.id,
        file.agentId,
        file.fileName,
        file.mimeType,
        file.byteSize,
        file.uploadedAt,
        file.scoredAt,
        file.extractText,
        file.extractEngine,
        file.extractError,
        file.previewHtml,
        file.score,
        JSON.stringify(file.audit),
        file.id,
      )
    }
    db.prepare(
      `INSERT INTO meta (key, value) VALUES ('selected_file_id', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    ).run(snapshot.selectedFileId)
    db.exec("COMMIT")
  } catch (error) {
    db.exec("ROLLBACK")
    throw error
  }
  return snapshot
}

export function insertUploadedFile(file: ResidentFile) {
  const safe = sanitizeSnapshot({
    profile: loadSnapshot().profile,
    agents: loadSnapshot().agents,
    rentSchedules: [],
    files: [file],
    selectedFileId: "",
  }).files[0]
  if (!safe) throw new Error("Could not store that resident file.")
  getDb()
    .prepare(
      `INSERT INTO resident_files (
        id, agent_id, file_name, mime_type, byte_size, uploaded_at, scored_at,
        extract_text, extract_engine, extract_error, preview_html, score, audit_json, storage_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      safe.id,
      safe.agentId,
      safe.fileName,
      safe.mimeType,
      safe.byteSize,
      safe.uploadedAt,
      "",
      safe.extractText,
      safe.extractEngine,
      safe.extractError,
      safe.previewHtml,
      "unscored",
      JSON.stringify(safe.audit),
      safe.id,
    )
  return safe
}

export function writeUpload(id: string, bytes: Buffer) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
  fs.writeFileSync(uploadPath(id), bytes)
}

export function readUpload(id: string) {
  const target = uploadPath(id)
  if (!fs.existsSync(target)) return null
  return fs.readFileSync(target)
}

export function fileRecord(id: string) {
  const row = one("SELECT * FROM resident_files WHERE id = ?", id)
  if (!row) return null
  return sanitizeSnapshot({
    files: [
      {
        id: row.id,
        agentId: row.agent_id,
        fileName: row.file_name,
        mimeType: row.mime_type,
        byteSize: row.byte_size,
        uploadedAt: row.uploaded_at,
        scoredAt: row.scored_at,
        extractText: row.extract_text,
        extractEngine: row.extract_engine,
        extractError: row.extract_error,
        previewHtml: row.preview_html,
        score: row.score,
        audit: parseJson(row.audit_json),
      },
    ],
    agents: [{ id: row.agent_id, name: "holder", group: "active", crmStatus: "Files Requested", overallScore: "unscored" }],
  }).files[0] ?? null
}

export function deleteUploadedFile(id: string) {
  getDb().prepare("DELETE FROM resident_files WHERE id = ?").run(id)
  unlinkUpload(id)
}

export function agentExists(id: string) {
  return Boolean(one("SELECT id FROM managing_agents WHERE id = ?", id))
}

export function createPendingFile(input: {
  id: string
  agentId: string
  fileName: string
  mimeType: string
  byteSize: number
  extractText: string
  extractEngine: string
  extractError: string
  previewHtml: string
}) {
  const file = newResidentFile(input)
  if (file.score !== "unscored") {
    throw new Error("New uploads must stay unscored.")
  }
  return insertUploadedFile(file)
}
