import path from "node:path"
import { pathToFileURL } from "node:url"
import mammoth from "mammoth"
import { PDFParse } from "pdf-parse"
import { createWorker, type Worker } from "tesseract.js"

export type ExtractResult = {
  text: string
  engine: string
  html: string
  error: string
}

let workerReady = false
let ocrWorker: Promise<Worker> | null = null

function ensurePdfWorker() {
  if (workerReady) return
  const workerPath = path.join(
    process.cwd(),
    "node_modules/pdf-parse/dist/pdf-parse/esm/pdf.worker.mjs",
  )
  PDFParse.setWorker(pathToFileURL(workerPath).href)
  workerReady = true
}

async function recogniseImage(image: Buffer) {
  if (!ocrWorker) {
    ocrWorker = createWorker("eng", 1, {
      cachePath: path.join(process.cwd(), "data", "tessdata"),
    })
  }
  const worker = await ocrWorker
  const result = await worker.recognize(image)
  return result.data.text ?? ""
}

async function extractPdf(buffer: Buffer): Promise<ExtractResult> {
  ensurePdfWorker()
  const parser = new PDFParse({ data: buffer })
  try {
    const result = await parser.getText()
    const text = (result.text ?? "").trim()
    if (text.length >= 20) {
      return { text, engine: "pdf-parse", html: "", error: "" }
    }
    return {
      text,
      engine: "pdf-parse",
      html: "",
      error: text
        ? ""
        : "No text layer found in this PDF. The original stays in the preview. Upload a page as PNG or JPG if it is a scan and tesseract.js will read it.",
    }
  } finally {
    await parser.destroy()
  }
}

function extension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? ""
}

export async function extractDocument(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<ExtractResult> {
  const ext = extension(fileName)
  try {
    if (mimeType === "application/pdf" || ext === "pdf") {
      return await extractPdf(buffer)
    }
    if (
      ext === "docx" ||
      mimeType.includes("wordprocessingml") ||
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const raw = await mammoth.extractRawText({ buffer })
      const html = await mammoth.convertToHtml({ buffer })
      return {
        text: raw.value ?? "",
        engine: "mammoth",
        html: html.value ?? "",
        error: "",
      }
    }
    if (
      mimeType.startsWith("image/") ||
      ["png", "jpg", "jpeg", "webp", "bmp", "tif", "tiff"].includes(ext)
    ) {
      const text = (await recogniseImage(buffer)).trim()
      return {
        text,
        engine: "tesseract.js",
        html: "",
        error: text ? "" : "OCR finished without readable text. The image stays in the preview.",
      }
    }
    if (mimeType.startsWith("text/") || ext === "txt") {
      return { text: buffer.toString("utf8"), engine: "text", html: "", error: "" }
    }
    return {
      text: "",
      engine: "unsupported",
      html: "",
      error: `This file type (${mimeType || ext || "unknown"}) is stored for preview. pdf-parse reads PDFs, mammoth reads .docx, and tesseract.js reads images.`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Extraction failed"
    return { text: "", engine: "failed", html: "", error: message }
  }
}

export function mimeFor(fileName: string, given: string) {
  if (given && given !== "application/octet-stream") return given
  const ext = extension(fileName)
  if (ext === "pdf") return "application/pdf"
  if (ext === "docx") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  }
  if (ext === "png") return "image/png"
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg"
  if (ext === "webp") return "image/webp"
  if (ext === "txt") return "text/plain"
  return given || "application/octet-stream"
}
