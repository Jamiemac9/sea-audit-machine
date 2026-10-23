/**
 * Support Audit — data model.
 *
 * Spine: managingAgent -> round -> residentFile. The resident file is the unit of
 * assurance; the round is the deliverable. See docs/audit-rules.md.
 *
 * Ratings: `residentFile.rating` is entered by a human and always carries a reason.
 * Nothing here stores a compliance score, and nothing computes a rating from one.
 */

import { sql } from "drizzle-orm"
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core"

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID())

const now = () =>
  integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`)

export const managingAgents = sqliteTable("managing_agents", {
  id: id(),
  name: text("name").notNull().unique(),
  contract: text("contract"),
  region: text("region"),
  notes: text("notes"),
  createdAt: now(),
})

export const rounds = sqliteTable(
  "rounds",
  {
    id: id(),
    managingAgentId: text("managing_agent_id")
      .notNull()
      .references(() => managingAgents.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    auditDate: integer("audit_date", { mode: "timestamp" }),
    feedbackIssued: integer("feedback_issued", { mode: "timestamp" }),
    /** FIRST_AUDIT | REPEAT — confirmed at the start of every round. */
    format: text("format").notNull().default("FIRST_AUDIT"),
    previousRoundId: text("previous_round_id"),
    /** INTAKE | CHECKING | REVIEW | ISSUED */
    status: text("status").notNull().default("INTAKE"),
    createdAt: now(),
  },
  (t) => [index("rounds_agent_idx").on(t.managingAgentId)]
)

export const residentFiles = sqliteTable(
  "resident_files",
  {
    id: id(),
    roundId: text("round_id")
      .notNull()
      .references(() => rounds.id, { onDelete: "cascade" }),
    residentName: text("resident_name").notNull(),
    /**
     * Folder spellings and misfilings seen for this resident, newline separated.
     * Correcting a classification offers to add the spelling here, so the same
     * misfiling classifies itself next round.
     */
    aliases: text("aliases"),
    propertyLine1: text("property_line1"),
    roomRef: text("room_ref"),
    moveInDate: integer("move_in_date", { mode: "timestamp" }),
    moveOutDate: integer("move_out_date", { mode: "timestamp" }),
    /** GOLD | GREEN | AMBER | RED — set by a human, never computed. */
    rating: text("rating"),
    ratingReason: text("rating_reason"),
    createdAt: now(),
  },
  (t) => [index("resident_files_round_idx").on(t.roundId)]
)

export const documents = sqliteTable(
  "documents",
  {
    id: id(),
    roundId: text("round_id")
      .notNull()
      .references(() => rounds.id, { onDelete: "cascade" }),
    /** Null until classified. */
    residentFileId: text("resident_file_id").references(() => residentFiles.id),

    originalName: text("original_name").notNull(),
    /** Path relative to AUDIT_DATA_DIR. Bytes never live in this repo. */
    storedPath: text("stored_path").notNull(),
    sha256: text("sha256").notNull(),
    mimeType: text("mime_type").notNull(),
    byteSize: integer("byte_size").notNull(),

    // Classification
    wrCode: text("wr_code"),
    documentDate: integer("document_date", { mode: "timestamp" }),
    confidence: real("confidence"),
    /** "auto" | "human" */
    classifiedBy: text("classified_by"),

    // Extraction
    /** PENDING | DONE | FAILED */
    extractionState: text("extraction_state").notNull().default("PENDING"),
    extractionError: text("extraction_error"),
    extractedText: text("extracted_text"),
    pageCount: integer("page_count"),
    /**
     * From the document's own metadata, not the filesystem. Evidence in its own
     * right, and unrecoverable once a client re-exports to PDF.
     */
    docCreatedAt: integer("doc_created_at", { mode: "timestamp" }),
    docModifiedAt: integer("doc_modified_at", { mode: "timestamp" }),
    lastModifiedBy: text("last_modified_by"),
    /**
     * A PDF page with no text layer is a scan. Text checks silently pass on it,
     * so it is flagged and shown as not machine-checked rather than as clean.
     */
    needsOcr: integer("needs_ocr", { mode: "boolean" }).notNull().default(false),

    createdAt: now(),
  },
  (t) => [
    uniqueIndex("documents_round_sha_idx").on(t.roundId, t.sha256),
    index("documents_resident_idx").on(t.residentFileId),
    index("documents_wr_idx").on(t.wrCode),
  ]
)

export const documentImages = sqliteTable(
  "document_images",
  {
    id: id(),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    pageNumber: integer("page_number"),
    sha256: text("sha256").notNull(),
    /**
     * Perceptual hash, for signature and evidence reuse within a file and across
     * two residents. An exact sha256 match misses a re-encoded copy.
     */
    dHash: text("d_hash"),
  },
  (t) => [
    index("document_images_doc_idx").on(t.documentId),
    index("document_images_dhash_idx").on(t.dHash),
  ]
)

export const risks = sqliteTable(
  "risks",
  {
    id: id(),
    residentFileId: text("resident_file_id")
      .notNull()
      .references(() => residentFiles.id, { onDelete: "cascade" }),
    sourceDocumentId: text("source_document_id"),
    name: text("name").notNull(),
    likelihood: integer("likelihood"),
    severity: integer("severity"),
    score: integer("score"),
    hasPlan: integer("has_plan", { mode: "boolean" }).notNull().default(false),
    planText: text("plan_text"),
    reviewed3m: integer("reviewed_3m", { mode: "boolean" }).notNull().default(false),
    reviewed6m: integer("reviewed_6m", { mode: "boolean" }).notNull().default(false),
    reviewed9m: integer("reviewed_9m", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [index("risks_resident_idx").on(t.residentFileId)]
)

export const goals = sqliteTable(
  "goals",
  {
    id: id(),
    residentFileId: text("resident_file_id")
      .notNull()
      .references(() => residentFiles.id, { onDelete: "cascade" }),
    sourceDocumentId: text("source_document_id"),
    title: text("title").notNull(),
    hasActionPlan: integer("has_action_plan", { mode: "boolean" })
      .notNull()
      .default(false),
    actionPlanText: text("action_plan_text"),
    targetDate: integer("target_date", { mode: "timestamp" }),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
  },
  (t) => [index("goals_resident_idx").on(t.residentFileId)]
)

export const sessions = sqliteTable(
  "sessions",
  {
    id: id(),
    residentFileId: text("resident_file_id")
      .notNull()
      .references(() => residentFiles.id, { onDelete: "cascade" }),
    sourceDocumentId: text("source_document_id"),
    sessionDate: integer("session_date", { mode: "timestamp" }),
    durationMins: integer("duration_mins"),
    attended: integer("attended", { mode: "boolean" }).notNull().default(true),
    missedReason: text("missed_reason"),
    warningIssued: integer("warning_issued", { mode: "boolean" })
      .notNull()
      .default(false),
    residentSigned: integer("resident_signed", { mode: "boolean" })
      .notNull()
      .default(false),
    workerSigned: integer("worker_signed", { mode: "boolean" })
      .notNull()
      .default(false),
    /** Welfare check — excluded from the one-hour minimum. */
    isRoomCheck: integer("is_room_check", { mode: "boolean" })
      .notNull()
      .default(false),
    evidenceNoted: integer("evidence_noted", { mode: "boolean" })
      .notNull()
      .default(false),
    bodyText: text("body_text"),
  },
  (t) => [index("sessions_resident_idx").on(t.residentFileId)]
)

export const findings = sqliteTable(
  "findings",
  {
    id: id(),
    residentFileId: text("resident_file_id")
      .notNull()
      .references(() => residentFiles.id, { onDelete: "cascade" }),
    ruleId: text("rule_id").notNull(),
    /** DOCUMENTATION | SUPPORT — never merged, never double-counted. */
    stream: text("stream").notNull(),
    /** INFORMATIONAL | ISSUE | SERIOUS */
    severity: text("severity").notNull(),
    /** "WR-09, 11/08/2026" */
    documentRef: text("document_ref").notNull(),
    whatIsWrong: text("what_is_wrong").notNull(),
    whatGoodLooksLike: text("what_good_looks_like"),
    /** Page numbers, offsets, matched text, compared record ids. JSON. */
    evidenceJson: text("evidence_json"),
    /** PROPOSED | CONFIRMED | DISMISSED */
    status: text("status").notNull().default("PROPOSED"),
    dismissReason: text("dismiss_reason"),
    createdAt: now(),
  },
  (t) => [
    uniqueIndex("findings_unique_idx").on(
      t.residentFileId,
      t.ruleId,
      t.documentRef
    ),
    index("findings_resident_idx").on(t.residentFileId),
  ]
)

export type ManagingAgent = typeof managingAgents.$inferSelect
export type Round = typeof rounds.$inferSelect
export type ResidentFile = typeof residentFiles.$inferSelect
export type DocumentRow = typeof documents.$inferSelect
export type Risk = typeof risks.$inferSelect
export type Goal = typeof goals.$inferSelect
export type SessionRow = typeof sessions.$inferSelect
export type Finding = typeof findings.$inferSelect
