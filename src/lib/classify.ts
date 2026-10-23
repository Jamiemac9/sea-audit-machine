/**
 * Classification: which document is this, whose file is it, what date does it
 * carry.
 *
 * This will get a proportion wrong, and that is designed for rather than
 * fought. A classifier that is right most of the time with fast correction
 * beats one that is right more often and silently wrong the rest — so every
 * guess carries a confidence, anything below the threshold lands in a review
 * queue, and correcting one writes the folder spelling back to the resident's
 * aliases so the same misfiling classifies itself next round.
 */

import { WR_CODE_SET } from "./audit"

/** Above this, a guess is accepted without a human looking at it. */
export const AUTO_ACCEPT_CONFIDENCE = 0.8

/**
 * Words that turn up in folder names and filenames rather than in names.
 * Never allowed to identify a resident on their own, however unique to one
 * resident they happen to be within a given round.
 */
const FILING_WORDS = new Set([
  "scan",
  "scanned",
  "scans",
  "copy",
  "final",
  "draft",
  "updated",
  "new",
  "old",
  "signed",
  "doc",
  "docs",
  "file",
  "files",
  "folder",
  "sup",
  "support",
  "session",
  "sessions",
  "audit",
  "resident",
  "room",
  "form",
  "forms",
  "review",
  "plan",
  "risk",
  "pdf",
  "docx",
])

export type ClassificationInput = {
  originalName: string
  text: string
  /** Candidate residents in the round, with their known folder spellings. */
  residents: { id: string; residentName: string; aliases: string | null }[]
}

export type Classification = {
  wrCode: string | null
  residentFileId: string | null
  documentDate: Date | null
  confidence: number
  /** Why it decided what it did, shown in the review queue. */
  reasons: string[]
}

export function classifyDocument(input: ClassificationInput): Classification {
  const reasons: string[] = []
  const name = input.originalName
  const head = input.text.slice(0, 1500)

  const wr = detectWrCode(name, head, reasons)
  const resident = detectResident(name, head, input.residents, reasons)
  const date = detectDate(name, head, reasons)

  // Confidence is the weighted average of the three parts. The WR code carries
  // most of it: a document whose type is unknown cannot be checked at all.
  const confidence =
    wr.confidence * 0.5 + resident.confidence * 0.35 + date.confidence * 0.15

  return {
    wrCode: wr.value,
    residentFileId: resident.value,
    documentDate: date.value,
    confidence: Math.round(confidence * 100) / 100,
    reasons,
  }
}

function detectWrCode(name: string, head: string, reasons: string[]) {
  // "WR-09", "WR 09", "WR09" in the filename is the strongest signal.
  const fromName = /\bWR[\s_-]?(\d{1,2})\b/i.exec(name)
  if (fromName) {
    const code = `WR-${fromName[1].padStart(2, "0")}`
    if (WR_CODE_SET.has(code)) {
      reasons.push(`Document code ${code} taken from the filename.`)
      return { value: code, confidence: 0.95 }
    }
  }

  const fromText = /\bWR[\s_-]?(\d{1,2})\b/i.exec(head)
  if (fromText) {
    const code = `WR-${fromText[1].padStart(2, "0")}`
    if (WR_CODE_SET.has(code)) {
      reasons.push(`Document code ${code} found in the first page.`)
      return { value: code, confidence: 0.75 }
    }
  }

  // Fall back to the document's own heading wording.
  const haystack = `${name} ${head}`.toLowerCase()
  for (const [pattern, code, label] of HEADING_HINTS) {
    if (pattern.test(haystack)) {
      reasons.push(`Matched "${label}" wording; no document code present.`)
      return { value: code, confidence: 0.55 }
    }
  }

  reasons.push("No document code or recognised heading found.")
  return { value: null, confidence: 0 }
}

const HEADING_HINTS: [RegExp, string, string][] = [
  [/support session record|session record/, "WR-13", "support session record"],
  [/contact (and|&) support log/, "WR-14", "contact and support log"],
  [/support plan/, "WR-11", "support plan"],
  [/risk management plan/, "WR-10", "risk management plan"],
  [/risk assessment/, "WR-09", "risk assessment"],
  [/licence agreement|license agreement/, "WR-02", "licence agreement"],
  [/missing person/, "WR-05", "missing person form"],
  [/initial assessment/, "WR-01", "initial assessment"],
  [/warning (notice|letter)/, "WR-17", "warning notice"],
  [/exit form/, "WR-20", "exit form"],
  [/\breview\b/, "WR-12", "review"],
]

function detectResident(
  name: string,
  head: string,
  residents: ClassificationInput["residents"],
  reasons: string[]
) {
  const haystackName = normalise(name)
  const haystackText = normalise(head)

  const candidatesFor = (resident: ClassificationInput["residents"][number]) =>
    [resident.residentName, ...(resident.aliases?.split("\n") ?? [])]
      .map((value) => value.trim())
      .filter(Boolean)

  // A single name part only identifies a resident if no one else in the round
  // shares it. Two residents called Mohammed, or a caseload where every folder
  // carries the same suffix, would otherwise both match on the shared word and
  // cancel each other out as ambiguous.
  //
  // Distinctiveness alone is not enough, though: an alias learned from a folder
  // name carries filing words as well as the name — "yusuf_sup", "Kelvin 2",
  // "avery_m_scan" — and those words are unique to one resident purely by
  // accident. Matching on them files unrelated documents, so they are excluded.
  const partOwners = new Map<string, Set<string>>()
  for (const resident of residents) {
    for (const candidate of candidatesFor(resident)) {
      for (const part of normalise(candidate).split(" ")) {
        if (part.length <= 2) continue
        const owners = partOwners.get(part) ?? new Set<string>()
        owners.add(resident.id)
        partOwners.set(part, owners)
      }
    }
  }
  const isDistinctive = (part: string) =>
    partOwners.get(part)?.size === 1 && !FILING_WORDS.has(part)

  const scored = residents.map((resident) => {
    const candidates = candidatesFor(resident)

    let best = 0
    let matched = ""
    for (const candidate of candidates) {
      const needle = normalise(candidate)
      if (!needle) continue
      // A match in the filename or folder path beats one in the body, because
      // a body mention may be another resident named in a joint session note.
      if (haystackName.includes(needle)) {
        if (best < 0.9) {
          best = 0.9
          matched = candidate
        }
        continue
      }
      // Surname or forename alone in the path is weaker but still useful,
      // provided that part belongs to this resident alone.
      const parts = needle
        .split(" ")
        .filter((part) => part.length > 2 && isDistinctive(part))
      if (parts.some((part) => haystackName.includes(part))) {
        if (best < 0.7) {
          best = 0.7
          matched = candidate
        }
        continue
      }
      if (haystackText.includes(needle) && best < 0.6) {
        best = 0.6
        matched = candidate
      }
    }
    return { resident, score: best, matched }
  })

  scored.sort((a, b) => b.score - a.score)
  const top = scored[0]
  if (!top || top.score === 0) {
    reasons.push("No resident name or known folder spelling matched.")
    return { value: null, confidence: 0 }
  }

  // Two residents matching equally well is ambiguous, not a close call —
  // joint and mirrored notes are common, so this goes to a human.
  const runnerUp = scored[1]
  if (runnerUp && runnerUp.score === top.score) {
    reasons.push(
      `Matched more than one resident equally well (${top.resident.residentName}, ${runnerUp.resident.residentName}).`
    )
    return { value: null, confidence: 0 }
  }

  reasons.push(
    `Matched resident ${top.resident.residentName} on "${top.matched}".`
  )
  return { value: top.resident.id, confidence: top.score }
}

function detectDate(name: string, head: string, reasons: string[]) {
  const fromName = findDate(name)
  if (fromName) {
    reasons.push(`Date ${fromName.toISOString().slice(0, 10)} read from the filename.`)
    return { value: fromName, confidence: 0.85 }
  }
  const fromText = findDate(head)
  if (fromText) {
    reasons.push(
      `Date ${fromText.toISOString().slice(0, 10)} read from the document body.`
    )
    return { value: fromText, confidence: 0.6 }
  }
  reasons.push("No date found on the document.")
  return { value: null, confidence: 0 }
}

/** UK order throughout: dd/mm/yyyy, dd-mm-yy, yyyy-mm-dd. */
function findDate(value: string): Date | null {
  const iso = /\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/.exec(value)
  if (iso) return build(+iso[1], +iso[2], +iso[3])

  const uk = /\b(\d{1,2})[./-](\d{1,2})[./-](20\d{2}|\d{2})\b/.exec(value)
  if (uk) {
    const year = uk[3].length === 2 ? 2000 + +uk[3] : +uk[3]
    return build(year, +uk[2], +uk[1])
  }
  return null
}

function build(year: number, month: number, day: number) {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const date = new Date(Date.UTC(year, month - 1, day))
  return Number.isNaN(date.getTime()) ? null : date
}

function normalise(value: string) {
  return value
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}
