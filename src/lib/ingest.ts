/**
 * Ingest: store the bytes, extract, classify.
 *
 * Bytes are written under AUDIT_DATA_DIR, which is outside the repository, and
 * are addressed by their sha256 so re-dropping the same folder does not create
 * duplicates. The database holds metadata and findings, never document bytes.
 */

import { createHash } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { and, eq } from "drizzle-orm"
import { auditDataDir, db } from "@/db"
import { documentImages, documents, residentFiles } from "@/db/schema"
import { AUTO_ACCEPT_CONFIDENCE, classifyDocument } from "./classify"
import { extractDocument } from "./extract"

export type IngestOutcome = {
  originalName: string
  status: "stored" | "duplicate" | "failed"
  documentId?: string
  wrCode?: string | null
  confidence?: number
  needsReview?: boolean
  error?: string
}

export function documentAbsolutePath(storedPath: string) {
  return join(auditDataDir(), storedPath)
}

export async function ingestFile(
  roundId: string,
  file: File
): Promise<IngestOutcome> {
  const originalName = file.name
  try {
    const bytes = Buffer.from(await file.arrayBuffer())
    const sha256 = createHash("sha256").update(bytes).digest("hex")

    const existing = await db
      .select({ id: documents.id })
      .from(documents)
      .where(and(eq(documents.roundId, roundId), eq(documents.sha256, sha256)))
      .limit(1)

    if (existing.length > 0) {
      return { originalName, status: "duplicate", documentId: existing[0].id }
    }

    // Content-addressed, two-character fan-out so a round folder with a few
    // thousand documents stays navigable.
    const storedPath = join(roundId, sha256.slice(0, 2), sha256)
    const absolute = join(auditDataDir(), storedPath)
    await mkdir(join(auditDataDir(), roundId, sha256.slice(0, 2)), {
      recursive: true,
    })
    await writeFile(absolute, bytes)

    const [row] = await db
      .insert(documents)
      .values({
        roundId,
        originalName,
        storedPath,
        sha256,
        mimeType: file.type || "application/octet-stream",
        byteSize: bytes.byteLength,
      })
      .returning()

    const processed = await processDocument(row.id)
    return {
      originalName,
      status: "stored",
      documentId: row.id,
      wrCode: processed.wrCode,
      confidence: processed.confidence,
      needsReview: processed.needsReview,
    }
  } catch (error) {
    return {
      originalName,
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Extract and classify one stored document. Separated from storage so it can be
 * re-run — reclassifying a whole round after an alias is corrected should not
 * mean re-uploading anything.
 */
export async function processDocument(documentId: string) {
  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1)

  if (!doc) throw new Error(`Document ${documentId} not found`)

  try {
    const extracted = await extractDocument(
      documentAbsolutePath(doc.storedPath),
      doc.mimeType,
      doc.originalName
    )

    const residents = await db
      .select({
        id: residentFiles.id,
        residentName: residentFiles.residentName,
        aliases: residentFiles.aliases,
      })
      .from(residentFiles)
      .where(eq(residentFiles.roundId, doc.roundId))

    const classification = classifyDocument({
      originalName: doc.originalName,
      text: extracted.text,
      residents,
    })

    const autoAccepted = classification.confidence >= AUTO_ACCEPT_CONFIDENCE

    await db
      .update(documents)
      .set({
        extractionState: "DONE",
        extractionError: null,
        extractedText: extracted.text,
        pageCount: extracted.pageCount,
        docCreatedAt: extracted.docCreatedAt,
        docModifiedAt: extracted.docModifiedAt,
        lastModifiedBy: extracted.lastModifiedBy,
        needsOcr: extracted.needsOcr,
        wrCode: classification.wrCode,
        documentDate: classification.documentDate,
        confidence: classification.confidence,
        // Only claim a document is classified when the guess was strong enough
        // to stand without review. Everything else stays unclassified and
        // visible in the review queue.
        residentFileId: autoAccepted ? classification.residentFileId : null,
        classifiedBy: autoAccepted ? "auto" : null,
      })
      .where(eq(documents.id, documentId))

    if (extracted.images.length > 0) {
      await db.delete(documentImages).where(eq(documentImages.documentId, documentId))
      await db.insert(documentImages).values(
        extracted.images.map((image) => ({
          documentId,
          pageNumber: image.pageNumber,
          sha256: image.sha256,
        }))
      )
    }

    return {
      wrCode: classification.wrCode,
      confidence: classification.confidence,
      needsReview: !autoAccepted,
      reasons: classification.reasons,
    }
  } catch (error) {
    await db
      .update(documents)
      .set({
        extractionState: "FAILED",
        extractionError:
          error instanceof Error ? error.message : "Unknown extraction error",
      })
      .where(eq(documents.id, documentId))

    return {
      wrCode: null,
      confidence: 0,
      needsReview: true,
      reasons: ["Extraction failed."],
    }
  }
}
