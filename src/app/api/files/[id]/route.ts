import { connection } from "next/server"
import { deleteUploadedFile, fileRecord, readUpload } from "@/server/db"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await connection()
  const { id } = await context.params
  if (!UUID.test(id)) return new Response("Not found", { status: 404 })
  const record = fileRecord(id)
  const bytes = readUpload(id)
  if (!record || !bytes) return new Response("Not found", { status: 404 })
  const filename = record.fileName.replace(/["\r\n]/g, "")
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": record.mimeType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  })
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await connection()
  const { id } = await context.params
  if (!UUID.test(id)) return new Response("Not found", { status: 404 })
  deleteUploadedFile(id)
  return Response.json({ ok: true })
}
