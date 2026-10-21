import {
  classifyWrFromName,
  type ClassifiedUpload,
} from "@/lib/deepAuditExtractor"

async function extractDocx(file: File) {
  try {
    const mammoth = await import("mammoth")
    const buffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer: buffer })
    return result.value || `Word document: ${file.name}`
  } catch {
    return `Word document uploaded: ${file.name}\n(Text extraction unavailable — paste extract if needed.)`
  }
}

async function extractPdf(file: File) {
  // Browser-safe stub: classify by filename; auditors can paste OCR.
  // Full pdf-parse is Node-oriented; keep workstation-local paste path.
  return [
    `PDF uploaded: ${file.name}`,
    "Local PDF text layer was not auto-parsed in the browser.",
    "Paste OCR text below or ensure the filename includes the WR code (e.g. WR-01.pdf).",
  ].join("\n")
}

async function extractImage(file: File) {
  // tesseract.js is optional/heavy; provide a workstation-local placeholder
  // that still classifies by filename for the Missing WR Gate.
  return [
    `Evidence image uploaded: ${file.name}`,
    "OCR via tesseract can be pasted manually if required.",
    "Classified as photographic / screenshot evidence for the bundle.",
  ].join("\n")
}

export async function extractFileText(file: File): Promise<string> {
  const name = file.name
  const type = file.type || ""

  if (
    type.startsWith("text/") ||
    /\.(txt|md|csv|json|log)$/i.test(name)
  ) {
    return file.text()
  }

  if (
    type.includes("word") ||
    /\.(docx|doc)$/i.test(name)
  ) {
    if (/\.docx$/i.test(name) || type.includes("openxml")) {
      return extractDocx(file)
    }
    return `Legacy Word document: ${name}\nConvert to .docx or paste the extract.`
  }

  if (type === "application/pdf" || /\.pdf$/i.test(name)) {
    return extractPdf(file)
  }

  if (type.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif)$/i.test(name)) {
    return extractImage(file)
  }

  try {
    const text = await file.text()
    if (text && /[\w]{20,}/.test(text)) return text
  } catch {
    // fall through
  }

  return `Uploaded: ${name}\nBinary extract unavailable — paste text if this is a WR form.`
}

export async function classifyUploads(
  files: File[],
): Promise<ClassifiedUpload[]> {
  return Promise.all(
    files.map(async (file) => {
      const text = await extractFileText(file)
      const classified = classifyWrFromName(file.name) ?? classifyWrFromName(text)
      return {
        name: file.name,
        text,
        classifiedAs: classified ?? "unclassified",
      }
    }),
  )
}
