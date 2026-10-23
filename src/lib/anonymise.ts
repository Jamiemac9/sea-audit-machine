/**
 * Redaction for extracted text.
 *
 * Extracted text is the most portable thing in the system — it is what ends up
 * quoted in a finding, pasted into a report, or shown in a demonstration. This
 * strips the direct identifiers out of a copy of it, so there is a safe version
 * to hand before anyone asks for one.
 *
 * This is redaction of known patterns, not anonymisation in the UKGDPR sense.
 * Text that has been through this is still personal data: free text can
 * identify someone without containing an email address. Treat the output as
 * lower-risk, never as safe to publish.
 */

/** Words that look like name tokens in a filename but are not names. */
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
  "FILES",
  "AUDIT",
  "RESIDENT",
  "SUPPORT",
  "SESSION",
  "SCAN",
  "SCANNED",
  "FINAL",
  "DRAFT",
  "COPY",
  "SIGNED",
  "ROOM",
  "PLAN",
  "RISK",
  "REVIEW",
  "FORM",
  "UPDATED",
])

/** Name-looking tokens in a filename, used when no resident name is known. */
export function nameTokensFromFile(fileName: string) {
  return fileName
    .replace(/\.[^.]+$/, "")
    .split(/[^A-Za-z]+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 3 && !STOP_WORDS.has(part.toUpperCase()))
}

export type AnonymiseOptions = {
  /** The filename, used to infer name tokens when no names are given. */
  fileName?: string
  /**
   * Known resident names for this round. Far more reliable than guessing from
   * the filename, and it catches the case that matters most — another
   * resident's name appearing in this resident's file.
   */
  names?: string[]
}

export function anonymiseExtract(text: string, options: AnonymiseOptions = {}) {
  let out = text

  out = out.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
  // UK mobile and landline, with or without the +44 country code.
  out = out.replace(/(?:\+44\s?7\d{3}|\b07\d{3})\s?\d{3}\s?\d{3}\b/g, "[phone]")
  out = out.replace(/\b(?:\+44|0)\d{9,12}\b/g, "[phone]")
  // National Insurance number: two letters, six digits, one suffix letter.
  out = out.replace(/\b[A-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-D]\b/gi, "[NI number]")
  // UK postcode.
  out = out.replace(
    /\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/gi,
    "[postcode]"
  )
  // NHS number, as three groups.
  out = out.replace(/\b\d{3}\s?\d{3}\s?\d{4}\b/g, "[NHS number]")
  // Dates of birth, where labelled as such.
  out = out.replace(
    /\b(D\.?O\.?B\.?|date of birth)\s*:?\s*\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/gi,
    "$1: [date of birth]"
  )

  const tokens = (
    options.names?.length
      ? options.names.flatMap((name) => [name, ...name.split(/\s+/)])
      : nameTokensFromFile(options.fileName ?? "")
  )
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token.toUpperCase()))
    // Longest first, so "Avery Mountjoy" is replaced before "Avery" is.
    .sort((a, b) => b.length - a.length)

  for (const token of tokens) {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    out = out.replace(new RegExp(`\\b${escaped}\\b`, "gi"), "[name]")
  }

  return out
}
