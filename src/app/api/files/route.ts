import { connection } from "next/server"
import { agentExists, createPendingFile, writeUpload } from "@/server/db"
import { extractDocument, mimeFor } from "@/server/extract"
import fs from "node:fs"
import path from "node:path"

export async function POST(request: Request) {
  await connection()
  const form = await request.formData()
  const agentId = String(form.get("agentId") ?? "")
  const file = form.get("file")
  if (!agentId || !agentExists(agentId)) {
    return Response.json(
      { error: "Save the managing agent before uploading a resident file." },
      { status: 400 },
    )
  }
  if (!(file instanceof File)) {
    return Response.json({ error: "Choose a resident file to upload." }, { status: 400 })
  }
  const buffer = Buffer.from(await file.arrayBuffer())
  if (buffer.length === 0) {
    return Response.json({ error: "That file is empty." }, { status: 400 })
  }
  if (buffer.length > 25 * 1024 * 1024) {
    return Response.json({ error: "Files need to be 25 MB or smaller." }, { status: 413 })
  }
  const id = crypto.randomUUID()
  const mimeType = mimeFor(file.name, file.type)
  const extracted = await extractDocument(buffer, file.name, mimeType)
  const storage = path.join(process.cwd(), "data", "uploads", id)
  try {
    writeUpload(id, buffer)
    const stored = createPendingFile({
      id,
      agentId,
      fileName: file.name,
      mimeType,
      byteSize: buffer.length,
      extractText: extracted.text,
      extractEngine: extracted.engine,
      extractError: extracted.error,
      previewHtml: extracted.html,
    })
    return Response.json({ file: stored })
  } catch (error) {
    if (fs.existsSync(storage)) fs.unlinkSync(storage)
    const message = error instanceof Error ? error.message : "Could not store the file."
    return Response.json({ error: message }, { status: 500 })
  }
}
