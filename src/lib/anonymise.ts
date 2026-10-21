const STOP_WORDS = new Set([
  "WR",
  "PDF",
  "DOC",
  "DOCX",
  "PNG",
  "JPG",
  "JPEG",
  "THE",
  "AND",
  "FILE",
  "AUDIT",
  "RESIDENT",
  "SCAN",
  "FINAL",
  "DRAFT",
])

export function nameTokensFromFile(fileName: string) {
  const stem = fileName.replace(/\.[^.]+$/, "")
  return stem
    .split(/[^A-Za-z]+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 3 && !STOP_WORDS.has(part.toUpperCase()))
}

export function anonymiseExtract(text: string, fileName = "") {
  let out = text
  out = out.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
  out = out.replace(/(?:\+44\s?7\d{3}|\b07\d{3})\s?\d{3}\s?\d{3}\b/g, "[phone]")
  out = out.replace(/\b(?:\+44|0)\d{9,12}\b/g, "[phone]")
  out = out.replace(/\b[A-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-Z]\b/gi, "[NI number]")
  const tokens = nameTokensFromFile(fileName).sort((a, b) => b.length - a.length)
  for (const token of tokens) {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    out = out.replace(new RegExp(`\\b${escaped}\\b`, "gi"), "[Resident]")
  }
  return out
}
