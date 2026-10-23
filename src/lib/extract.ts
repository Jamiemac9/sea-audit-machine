/**
 * Document extraction.
 *
 * Pulls text, page count and the document's own embedded metadata out of a
 * stored file. The metadata matters as much as the text: `lastModifiedBy` and
 * the created/modified timestamps inside a .docx are evidence in their own
 * right, and they are gone the moment a client re-exports the file to PDF.
 */

import { readFile } from "node:fs/promises"
import { createHash } from "node:crypto"

export type ExtractResult = {
  text: string
  pageCount: number | null
  docCreatedAt: Date | null
  docModifiedAt: Date | null
  lastModifiedBy: string | null
  /** True when a PDF carries no usable text layer, i.e. it is a scan. */
  needsOcr: boolean
  images: { pageNumber: number | null; sha256: string }[]
}

const empty: ExtractResult = {
  text: "",
  pageCount: null,
  docCreatedAt: null,
  docModifiedAt: null,
  lastModifiedBy: null,
  needsOcr: false,
  images: [],
}

export function isPdf(mimeType: string, name: string) {
  return mimeType === "application/pdf" || name.toLowerCase().endsWith(".pdf")
}

export function isDocx(mimeType: string, name: string) {
  return (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.toLowerCase().endsWith(".docx")
  )
}

export async function extractDocument(
  absolutePath: string,
  mimeType: string,
  originalName: string
): Promise<ExtractResult> {
  if (isPdf(mimeType, originalName)) return extractPdf(absolutePath)
  if (isDocx(mimeType, originalName)) return extractDocx(absolutePath)
  if (mimeType.startsWith("text/")) {
    return { ...empty, text: await readFile(absolutePath, "utf8") }
  }
  return empty
}

async function extractPdf(absolutePath: string): Promise<ExtractResult> {
  const { extractText, getDocumentProxy } = await import("unpdf")
  const bytes = new Uint8Array(await readFile(absolutePath))
  const pdf = await getDocumentProxy(bytes)
  const { text, totalPages } = await extractText(pdf, { mergePages: true })
  const body = Array.isArray(text) ? text.join("\n") : text

  let docCreatedAt: Date | null = null
  let docModifiedAt: Date | null = null
  try {
    const meta = await pdf.getMetadata()
    const info = meta?.info as
      | { CreationDate?: string; ModDate?: string }
      | undefined
    docCreatedAt = parsePdfDate(info?.CreationDate)
    docModifiedAt = parsePdfDate(info?.ModDate)
  } catch {
    // Metadata is optional; an unreadable Info dictionary is not a failure.
  }

  // Fewer than ~100 characters per page means there is effectively no text
  // layer. Every text-based check would silently pass on this document, which
  // is worse than failing, so it is flagged rather than treated as clean.
  const needsOcr = body.replace(/\s+/g, "").length < totalPages * 100

  return {
    text: body,
    pageCount: totalPages,
    docCreatedAt,
    docModifiedAt,
    lastModifiedBy: null,
    needsOcr,
    images: [],
  }
}

/** PDF dates look like D:20261009142530+01'00'. */
function parsePdfDate(raw: string | undefined): Date | null {
  if (!raw) return null
  const m = /^D?:?(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?/.exec(raw)
  if (!m) return null
  const [, y, mo, d, h = "00", mi = "00", s = "00"] = m
  const date = new Date(
    Date.UTC(+y, +mo - 1, +d, +h, +mi, +s)
  )
  return Number.isNaN(date.getTime()) ? null : date
}

async function extractDocx(absolutePath: string): Promise<ExtractResult> {
  const mammoth = (await import("mammoth")).default
  const buffer = await readFile(absolutePath)
  const { value: text } = await mammoth.extractRawText({ buffer })
  const core = await readDocxCoreProperties(buffer)
  const images = await readDocxImageHashes(buffer)

  return {
    text,
    pageCount: null, // .docx has no fixed pagination until it is rendered
    docCreatedAt: core.created,
    docModifiedAt: core.modified,
    lastModifiedBy: core.lastModifiedBy,
    needsOcr: false,
    images,
  }
}

/**
 * docProps/core.xml inside the .docx zip. `lastModifiedBy` is the valuable
 * field — it is what evidences two residents' files being prepared together.
 * Read with a minimal zip reader so no extra dependency is needed.
 */
async function readDocxCoreProperties(buffer: Buffer) {
  const result = {
    created: null as Date | null,
    modified: null as Date | null,
    lastModifiedBy: null as string | null,
  }
  const xml = await readZipEntryAsText(buffer, "docProps/core.xml")
  if (!xml) return result

  const pick = (tag: string) => {
    const m = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`).exec(xml)
    return m?.[1]?.trim() || null
  }
  const created = pick("dcterms:created")
  const modified = pick("dcterms:modified")
  result.created = created ? new Date(created) : null
  result.modified = modified ? new Date(modified) : null
  result.lastModifiedBy = pick("cp:lastModifiedBy")
  if (result.created && Number.isNaN(result.created.getTime())) result.created = null
  if (result.modified && Number.isNaN(result.modified.getTime())) result.modified = null
  return result
}

/**
 * Hashes of everything in word/media/. An identical hash appearing on two
 * residents' documents is a reused signature or a reused evidence screenshot.
 */
async function readDocxImageHashes(buffer: Buffer) {
  const entries = await readZipEntries(buffer, (name) =>
    name.startsWith("word/media/")
  )
  return entries.map((entry) => ({
    pageNumber: null,
    sha256: createHash("sha256").update(entry.data).digest("hex"),
  }))
}

// --- minimal zip reading -------------------------------------------------
// A .docx is a zip. Node's zlib can inflate the entries, so the few bytes of
// central-directory parsing below avoid pulling in a zip dependency.

type ZipEntry = { name: string; data: Buffer }

async function readZipEntries(
  buffer: Buffer,
  match: (name: string) => boolean
): Promise<ZipEntry[]> {
  const { inflateRawSync } = await import("node:zlib")
  const out: ZipEntry[] = []

  const eocd = findEndOfCentralDirectory(buffer)
  if (eocd < 0) return out
  const entryCount = buffer.readUInt16LE(eocd + 10)
  let p = buffer.readUInt32LE(eocd + 16)

  for (let i = 0; i < entryCount; i += 1) {
    if (buffer.readUInt32LE(p) !== 0x02014b50) break
    const method = buffer.readUInt16LE(p + 10)
    const compressedSize = buffer.readUInt32LE(p + 20)
    const nameLength = buffer.readUInt16LE(p + 28)
    const extraLength = buffer.readUInt16LE(p + 30)
    const commentLength = buffer.readUInt16LE(p + 32)
    const localOffset = buffer.readUInt32LE(p + 42)
    const name = buffer.toString("utf8", p + 46, p + 46 + nameLength)
    p += 46 + nameLength + extraLength + commentLength

    if (!match(name)) continue

    const localNameLength = buffer.readUInt16LE(localOffset + 26)
    const localExtraLength = buffer.readUInt16LE(localOffset + 28)
    const start = localOffset + 30 + localNameLength + localExtraLength
    const raw = buffer.subarray(start, start + compressedSize)
    try {
      out.push({ name, data: method === 0 ? raw : inflateRawSync(raw) })
    } catch {
      // A single unreadable entry should not fail the whole extraction.
    }
  }
  return out
}

async function readZipEntryAsText(buffer: Buffer, name: string) {
  const [entry] = await readZipEntries(buffer, (n) => n === name)
  return entry ? entry.data.toString("utf8") : null
}

function findEndOfCentralDirectory(buffer: Buffer) {
  const minimum = 22
  const start = Math.max(0, buffer.length - 0xffff - minimum)
  for (let i = buffer.length - minimum; i >= start; i -= 1) {
    if (buffer.readUInt32LE(i) === 0x06054b50) return i
  }
  return -1
}
