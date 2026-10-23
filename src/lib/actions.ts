"use server"

import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { documents, managingAgents, residentFiles, rounds } from "@/db/schema"
import { processDocument } from "./ingest"
import type { Rating } from "./audit"

export async function createManagingAgent(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim()
  if (!name) return
  await db
    .insert(managingAgents)
    .values({
      name,
      contract: String(formData.get("contract") ?? "").trim() || null,
      region: String(formData.get("region") ?? "").trim() || null,
    })
    .onConflictDoNothing()
  revalidatePath("/")
}

export async function createRound(formData: FormData) {
  const managingAgentId = String(formData.get("managingAgentId") ?? "")
  const label = String(formData.get("label") ?? "").trim()
  if (!managingAgentId || !label) return
  const auditDate = String(formData.get("auditDate") ?? "")
  const [round] = await db
    .insert(rounds)
    .values({
      managingAgentId,
      label,
      auditDate: auditDate ? new Date(auditDate) : null,
      // Confirmed at the start of every round; the report format depends on it.
      format:
        String(formData.get("format") ?? "FIRST_AUDIT") === "REPEAT"
          ? "REPEAT"
          : "FIRST_AUDIT",
    })
    .returning()
  revalidatePath("/")
  revalidatePath(`/rounds/${round.id}`)
}

export async function createResidentFile(formData: FormData) {
  const roundId = String(formData.get("roundId") ?? "")
  const residentName = String(formData.get("residentName") ?? "").trim()
  if (!roundId || !residentName) return
  const moveInDate = String(formData.get("moveInDate") ?? "")
  await db.insert(residentFiles).values({
    roundId,
    residentName,
    propertyLine1: String(formData.get("propertyLine1") ?? "").trim() || null,
    roomRef: String(formData.get("roomRef") ?? "").trim() || null,
    moveInDate: moveInDate ? new Date(moveInDate) : null,
  })
  revalidatePath(`/rounds/${roundId}`)
}

/**
 * Correct one classification. Where the correction came from a folder spelling
 * the classifier did not know, the spelling is written back to the resident's
 * aliases so the same misfiling classifies itself next round.
 */
export async function reclassifyDocument(formData: FormData) {
  const documentId = String(formData.get("documentId") ?? "")
  const roundId = String(formData.get("roundId") ?? "")
  const residentFileId = String(formData.get("residentFileId") ?? "")
  const wrCode = String(formData.get("wrCode") ?? "").trim()
  const learnAlias = formData.get("learnAlias") === "on"
  if (!documentId) return

  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1)
  if (!doc) return

  await db
    .update(documents)
    .set({
      residentFileId: residentFileId || null,
      wrCode: wrCode || null,
      classifiedBy: "human",
      confidence: 1,
    })
    .where(eq(documents.id, documentId))

  if (learnAlias && residentFileId) {
    const [file] = await db
      .select()
      .from(residentFiles)
      .where(eq(residentFiles.id, residentFileId))
      .limit(1)
    if (file) {
      const spelling = doc.originalName.replace(/\.[^.]+$/, "")
      const current = file.aliases?.split("\n").filter(Boolean) ?? []
      if (!current.includes(spelling)) {
        await db
          .update(residentFiles)
          .set({ aliases: [...current, spelling].join("\n") })
          .where(eq(residentFiles.id, residentFileId))
      }
    }
  }

  revalidatePath(`/rounds/${roundId}`)
}

/** Re-run extraction and classification without re-uploading anything. */
export async function reprocessRound(formData: FormData) {
  const roundId = String(formData.get("roundId") ?? "")
  if (!roundId) return
  const docs = await db
    .select({ id: documents.id })
    .from(documents)
    .where(eq(documents.roundId, roundId))
  for (const doc of docs) await processDocument(doc.id)
  revalidatePath(`/rounds/${roundId}`)
}

/**
 * The rating is entered here by a human, with a reason, and is never derived
 * from a score or a count of findings. See docs/audit-rules.md.
 */
export async function setRating(formData: FormData) {
  const residentFileId = String(formData.get("residentFileId") ?? "")
  const rating = String(formData.get("rating") ?? "") as Rating | ""
  const ratingReason = String(formData.get("ratingReason") ?? "").trim()
  if (!residentFileId || !rating) return
  await db
    .update(residentFiles)
    .set({ rating, ratingReason: ratingReason || null })
    .where(eq(residentFiles.id, residentFileId))
  revalidatePath(`/resident-files/${residentFileId}`)
}
