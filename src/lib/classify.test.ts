import assert from "node:assert/strict"
import test from "node:test"
import { AUTO_ACCEPT_CONFIDENCE, classifyDocument } from "./classify"

const residents = [
  { id: "r1", residentName: "Avery Mountjoy", aliases: "avery_m_scan" },
  { id: "r2", residentName: "Bernard Quillfeather", aliases: null },
  { id: "r3", residentName: "Carys Ledanois", aliases: null },
]

test("a document code in the filename is accepted without review", () => {
  const result = classifyDocument({
    originalName: "WR-13 Avery Mountjoy 07-09-2026.docx",
    text: "Support session record.",
    residents,
  })
  assert.equal(result.wrCode, "WR-13")
  assert.equal(result.residentFileId, "r1")
  assert.equal(result.documentDate?.toISOString().slice(0, 10), "2026-09-07")
  assert.ok(result.confidence >= AUTO_ACCEPT_CONFIDENCE)
})

test("dates are read in UK order, not US", () => {
  const result = classifyDocument({
    originalName: "WR-09 Avery Mountjoy 06/07/2026.pdf",
    text: "",
    residents,
  })
  // 06/07 is the sixth of July, not the seventh of June.
  assert.equal(result.documentDate?.toISOString().slice(0, 10), "2026-07-06")
})

test("a known folder spelling matches the resident it was taught against", () => {
  const result = classifyDocument({
    originalName: "avery_m_scan WR-01.pdf",
    text: "",
    residents,
  })
  assert.equal(result.residentFileId, "r1")
})

test("heading wording is used when there is no document code", () => {
  const result = classifyDocument({
    originalName: "session notes avery mountjoy.docx",
    text: "Support Session Record\nDate: 12/08/2026",
    residents,
  })
  assert.equal(result.wrCode, "WR-13")
})

test("a shared name part does not identify a resident on its own", () => {
  // Two residents called Mohammed: the shared forename must not decide it,
  // and must not make both match equally and cancel out as ambiguous either.
  const shared = [
    { id: "a", residentName: "Mohammed Ashraf", aliases: null },
    { id: "b", residentName: "Mohammed Idris", aliases: null },
  ]
  const ambiguous = classifyDocument({
    originalName: "WR-13 Mohammed 01-09-2026.pdf",
    text: "",
    residents: shared,
  })
  assert.equal(ambiguous.residentFileId, null, "a shared forename decides nothing")

  const distinct = classifyDocument({
    originalName: "WR-13 Idris 01-09-2026.pdf",
    text: "",
    residents: shared,
  })
  assert.equal(distinct.residentFileId, "b", "a distinctive surname decides it")
})

test("an unknown document goes to review rather than being guessed at", () => {
  const result = classifyDocument({
    originalName: "scan0012.pdf",
    text: "",
    residents,
  })
  assert.equal(result.wrCode, null)
  assert.equal(result.residentFileId, null)
  assert.ok(result.confidence < AUTO_ACCEPT_CONFIDENCE)
  assert.ok(result.reasons.length > 0, "the queue needs a reason to show")
})

test("a name in the body is weaker evidence than one in the filename", () => {
  // A joint session note mentions both residents; the filename is the one
  // that says whose file it is.
  const result = classifyDocument({
    originalName: "WR-13 Bernard Quillfeather 15-09-2026.docx",
    text: "Bernard and Carys Ledanois both attended the budgeting session.",
    residents,
  })
  assert.equal(result.residentFileId, "r2")
})
