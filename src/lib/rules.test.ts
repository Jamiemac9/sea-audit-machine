import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { anonymiseExtract } from "./anonymise"
import { emptyAudit, newResidentFile } from "./audit-factory"
import { buildFileDocument, documentToBuffer } from "./docx-report"
import { VALID_MATRIX_SCORES, isValidMatrixScore, matrixIssues } from "./matrix"
import { rollupScore } from "./score"
import { EMPTY_PROFILE } from "./snapshot"

test("new uploads stay unscored", () => {
  const file = newResidentFile({
    id: "file-1",
    agentId: "agent-1",
    fileName: "ANTHONY-1.pdf",
    mimeType: "application/pdf",
    byteSize: 10,
    extractText: "Weekly support hour met.",
    extractEngine: "pdf-parse",
    extractError: "",
    previewHtml: "",
  })
  assert.equal(file.score, "unscored")
  assert.equal(file.scoredAt, "")
  assert.equal(file.audit.ratingRationale, "")
})

test("matrix accepts only 5x5 products and flags 7, 11, 13 and 14", () => {
  const products = new Set<number>()
  for (let likelihood = 1; likelihood <= 5; likelihood += 1) {
    for (let severity = 1; severity <= 5; severity += 1) {
      products.add(likelihood * severity)
    }
  }
  assert.deepEqual(
    [...products].sort((a, b) => a - b),
    [...VALID_MATRIX_SCORES],
  )
  for (const score of [7, 11, 13, 14, 17, 18, 19, 21, 22, 23, 24]) {
    assert.equal(isValidMatrixScore(score), false)
  }
  const audit = emptyAudit()
  audit.risks[0].writtenScore = "7"
  const issues = matrixIssues(audit)
  assert.ok(issues.some((issue) => issue.message.includes("7 is a matrix violation")))
})

test("amber and red outrank gold when files are rolled up", () => {
  assert.equal(rollupScore(["unscored", "unscored"]), "unscored")
  assert.equal(rollupScore(["gold", "green"]), "green")
  assert.equal(rollupScore(["gold", "red", "amber"]), "red")
})

test("anonymised extract hides contact details and the file-name token", () => {
  const text = anonymiseExtract(
    "Anthony emailed anthony@example.com on 07123456789. NI AB123456C.",
    "ANTHONY-1.pdf",
  )
  assert.match(text, /\[Resident\]/)
  assert.match(text, /\[email\]/)
  assert.match(text, /\[phone\]/)
  assert.match(text, /\[NI number\]/)
  assert.doesNotMatch(text, /anthony@example.com/i)
})

test("word report contains the four tables, a green header, and the filled example", async () => {
  const audit = emptyAudit()
  audit.goals[0].title = "Budgeting"
  audit.goals[0].supportBullets = "Supported resident to contact Talk to Frank about the service charge."
  audit.strengths = "Sessions stayed on the active goals."
  audit.nextSteps = "Agree the re-request date."
  audit.narratives.wr01 = "Benefits and amounts are detailed: Universal Credit of £340."
  audit.generalNotes = "Signature missing on WR-03."
  audit.rentCorrections = "Licence charge should be £18.50."
  audit.risks[0].writtenScore = "7"
  audit.ratingRationale = "Improvement is required before this file can be treated as audit-complete."
  const file = newResidentFile({
    id: "file-1",
    agentId: "agent-1",
    fileName: "ANTHONY-1.pdf",
    mimeType: "application/pdf",
    byteSize: 10,
    extractText: "",
    extractEngine: "pdf-parse",
    extractError: "",
    previewHtml: "",
  })
  file.score = "amber"
  file.audit = audit
  const buffer = await documentToBuffer(
    buildFileDocument({
      profile: { ...EMPTY_PROFILE, name: "Jamie", defaultClientRpName: "Harbour RP" },
      agent: {
        id: "agent-1",
        name: "Northwharf Support",
        group: "active",
        propertiesUnits: "12 units",
        docsDeadline: "2026-11-01",
        docsReceived: "2026-10-20",
        crmStatus: "Audit in Progress",
        overallScore: "amber",
        reRequestDeadline: "2026-11-08",
        teamsCallDate: "2026-11-09",
      },
      file,
      rentSchedules: [],
    }),
  )
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "seaaudit-"))
  const docxPath = path.join(dir, "report.docx")
  fs.writeFileSync(docxPath, buffer)
  const xml = execFileSync("unzip", ["-p", docxPath, "word/document.xml"], { encoding: "utf8" })
  assert.match(xml, /Table 1/)
  assert.match(xml, /Table 2/)
  assert.match(xml, /Table 3/)
  assert.match(xml, /Table 4/)
  assert.match(xml, /OVERALL AUDIT RATING/)
  assert.match(xml, /AMBER/)
  assert.match(xml, /0E7A43/)
  assert.match(xml, /Supported resident to contact Talk to Frank/)
  assert.match(xml, /Universal Credit of/)
  assert.match(xml, /matrix violation/i)
  assert.match(xml, /Harbour RP/)
})
