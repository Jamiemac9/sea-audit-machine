import { connection } from "next/server"
import { extractDocument, mimeFor } from "@/server/extract"

export async function POST(request: Request) {
  await connection()
  const form = await request.formData()
  const file = form.get("file")
  if (!(file instanceof File)) {
    return Response.json({ error: "Choose a PDF, Word, or image file." }, { status: 400 })
  }
  const buffer = Buffer.from(await file.arrayBuffer())
  if (buffer.length > 25 * 1024 * 1024) {
    return Response.json({ error: "Files need to be 25 MB or smaller." }, { status: 413 })
  }
  const mimeType = mimeFor(file.name, file.type)
  const extracted = await extractDocument(buffer, file.name, mimeType)
  return Response.json({
    fileName: file.name,
    mimeType,
    engine: extracted.engine,
    text: extracted.text,
    error: extracted.error,
    score: "unscored",
    status: "Pending Review / Unscored",
  })
}
