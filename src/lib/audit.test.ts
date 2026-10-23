import assert from "node:assert/strict"
import test from "node:test"
import {
  MINIMUM_ACTIVE_GOALS,
  RMP_THRESHOLD,
  isPossibleRiskScore,
  reviewsDue,
  riskBand,
} from "./audit"

test("only products of 1-5 x 1-5 are possible on the matrix", () => {
  const products = new Set<number>()
  for (let likelihood = 1; likelihood <= 5; likelihood += 1) {
    for (let severity = 1; severity <= 5; severity += 1) {
      products.add(likelihood * severity)
    }
  }
  for (const score of products) {
    assert.equal(isPossibleRiskScore(score), true, `${score} should be possible`)
  }
  // The scores that actually turned up in audits done by hand.
  for (const score of [7, 11, 13, 14, 17, 18, 19, 21, 22, 23, 24]) {
    assert.equal(isPossibleRiskScore(score), false, `${score} should be impossible`)
  }
})

test("risk bands follow the numbers, not the matrix colours", () => {
  assert.equal(riskBand(1), "Low")
  assert.equal(riskBand(4), "Low")
  assert.equal(riskBand(5), "Medium")
  assert.equal(riskBand(9), "Medium")
  assert.equal(riskBand(10), "High")
  assert.equal(riskBand(16), "High")
  assert.equal(riskBand(20), "Extremely High / Critical")
  assert.equal(riskBand(25), "Extremely High / Critical")
  assert.equal(riskBand(null), null)
})

test("a Risk Management Plan is required from 5 upwards", () => {
  assert.equal(RMP_THRESHOLD, 5)
  assert.equal(riskBand(RMP_THRESHOLD), "Medium")
})

test("eligibility needs five active goals", () => {
  assert.equal(MINIMUM_ACTIVE_GOALS, 5)
})

test("reviews are only due once the resident has been in long enough", () => {
  const movedIn = new Date("2026-01-15T00:00:00.000Z")
  // Six weeks in: nothing is due, and that is N/A rather than overdue.
  assert.deepEqual(reviewsDue(movedIn, new Date("2026-02-26T00:00:00.000Z")), [])
  assert.deepEqual(reviewsDue(movedIn, new Date("2026-04-16T00:00:00.000Z")), [3])
  assert.deepEqual(reviewsDue(movedIn, new Date("2026-07-16T00:00:00.000Z")), [3, 6])
  assert.deepEqual(reviewsDue(movedIn, new Date("2026-10-16T00:00:00.000Z")), [3, 6, 9])
  assert.deepEqual(reviewsDue(null), [])
})
