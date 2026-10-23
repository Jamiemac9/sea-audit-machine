import assert from "node:assert/strict"
import test from "node:test"
import { anonymiseExtract, nameTokensFromFile } from "./anonymise"

test("direct identifiers are redacted", () => {
  const out = anonymiseExtract(
    "Contact avery@example.com or 07123 456789. NI AB123456C. Lives at B29 7RQ.",
    { names: ["Avery Mountjoy"] }
  )
  assert.ok(out.includes("[email]"))
  assert.ok(out.includes("[phone]"))
  assert.ok(out.includes("[NI number]"))
  assert.ok(out.includes("[postcode]"))
  assert.ok(!out.includes("avery@example.com"))
  assert.ok(!out.includes("AB123456C"))
})

test("every resident name in the round is redacted, not just the file's own", () => {
  // Another resident's name in this file is the case that matters most.
  const out = anonymiseExtract(
    "Avery and Bernard Quillfeather attended together.",
    { names: ["Avery Mountjoy", "Bernard Quillfeather"] }
  )
  assert.ok(!out.includes("Avery"))
  assert.ok(!out.includes("Bernard"))
  assert.ok(!out.includes("Quillfeather"))
})

test("a labelled date of birth is redacted but ordinary dates survive", () => {
  const out = anonymiseExtract("DOB: 14/02/1991. Session held 07/09/2026.")
  assert.ok(out.includes("[date of birth]"))
  // Session dates are evidence and must not be destroyed.
  assert.ok(out.includes("07/09/2026"))
})

test("filename tokens are used only when no names are supplied", () => {
  const out = anonymiseExtract("Mountjoy signed the form.", {
    fileName: "WR-01 Mountjoy scan.pdf",
  })
  assert.ok(!out.includes("Mountjoy"))
  assert.deepEqual(nameTokensFromFile("WR-01 Mountjoy scan.pdf"), ["Mountjoy"])
})

test("redaction leaves the text otherwise intact", () => {
  const text = "The weekly budget was reviewed and a plan agreed."
  assert.equal(anonymiseExtract(text), text)
})
