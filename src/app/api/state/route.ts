import { connection } from "next/server"
import { loadSnapshot, saveSnapshot } from "@/server/db"
import { sanitizeSnapshot } from "@/lib/snapshot"

export async function GET() {
  await connection()
  return Response.json(loadSnapshot())
}

export async function PUT(request: Request) {
  await connection()
  const body: unknown = await request.json()
  const saved = saveSnapshot(sanitizeSnapshot(body))
  return Response.json(saved)
}
