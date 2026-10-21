export function linesOf(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

export function asBullets(value: string) {
  return linesOf(value).map((line) => line.replace(/^[-•*]\s*/, ""))
}

export function supportVoiceWarnings(text: string) {
  const warnings: string[] = []
  if (/\bresident (did|completed|contacted|went|attended|sorted)\b/i.test(text)) {
    warnings.push(
      "Phrase the note as what the support worker did with the resident, for example “Supported resident to contact Talk to Frank…”.",
    )
  }
  const seen = new Set<string>()
  for (const line of linesOf(text)) {
    const key = line.toLowerCase()
    if (seen.has(key)) {
      warnings.push("A support line is repeated. Check for copy-and-paste before it goes into the report.")
      break
    }
    seen.add(key)
  }
  return warnings
}

export function clientLabel(name: string) {
  return name.trim() || "[Client_RP_Name]"
}

export function agentLabel(name: string) {
  return name.trim() || "Unnamed managing agent"
}

export function downloadStem(value: string) {
  const clean = value.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-|-$/g, "")
  return clean || "audit"
}

export function localDay(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function dayOf(iso: string) {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10)
  return localDay(date)
}
