import { RISK_AREAS } from "@/lib/rubric-content"
import type { AuditEvaluation, RiskScore } from "@/lib/types"

export const LIKELIHOOD_LEVELS = [
  { value: 1, label: "Unlikely" },
  { value: 2, label: "Remote" },
  { value: 3, label: "Occasional" },
  { value: 4, label: "Likely" },
  { value: 5, label: "Frequent" },
] as const

export const SEVERITY_LEVELS = [
  { value: 1, label: "Negligible" },
  { value: 2, label: "Marginal" },
  { value: 3, label: "Serious" },
  { value: 4, label: "Major" },
  { value: 5, label: "Catastrophic" },
] as const

export const VALID_MATRIX_SCORES = [
  1, 2, 3, 4, 5, 6, 8, 9, 10, 12, 15, 16, 20, 25,
] as const

const VALID_SET = new Set<number>(VALID_MATRIX_SCORES)

export function isValidMatrixScore(value: number) {
  return Number.isInteger(value) && VALID_SET.has(value)
}

export function matrixProduct(likelihood: number | null, severity: number | null) {
  if (!likelihood || !severity) return null
  return likelihood * severity
}

export function writtenScoreIssue(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (!/^\d+$/.test(trimmed)) {
    return `${trimmed} is not a whole number, so it is a matrix violation.`
  }
  const score = Number(trimmed)
  if (!isValidMatrixScore(score)) {
    return `${score} is a matrix violation. Valid 5×5 scores are ${VALID_MATRIX_SCORES.join(", ")}.`
  }
  return null
}

export type MatrixIssue = {
  riskId: string
  label: string
  message: string
}

export function matrixIssues(audit: AuditEvaluation): MatrixIssue[] {
  const issues: MatrixIssue[] = []
  for (const risk of audit.risks) {
    const label = RISK_AREAS.find((area) => area.id === risk.id)?.label ?? risk.id
    const written = writtenScoreIssue(risk.writtenScore)
    if (written) issues.push({ riskId: risk.id, label, message: written })
    const product = matrixProduct(risk.likelihood, risk.severity)
    if (product !== null && !isValidMatrixScore(product)) {
      issues.push({
        riskId: risk.id,
        label,
        message: `${label}: ${risk.likelihood} × ${risk.severity} = ${product} is a matrix violation.`,
      })
    }
    const writtenNumber = /^\d+$/.test(risk.writtenScore.trim())
      ? Number(risk.writtenScore.trim())
      : null
    if (product !== null && writtenNumber !== null && writtenNumber !== product && isValidMatrixScore(writtenNumber)) {
      issues.push({
        riskId: risk.id,
        label,
        message: `${label}: the form says ${writtenNumber}, but likelihood × severity is ${product}.`,
      })
    }
    if (product !== null && product >= 5 && !risk.planComplete) {
      issues.push({
        riskId: risk.id,
        label,
        message: `${label} scores ${product}. A Risk Management Plan is required for every risk scored 5 or above.`,
      })
    }
  }
  return issues
}

export function riskNeedsPlan(risk: RiskScore) {
  const product = matrixProduct(risk.likelihood, risk.severity)
  return product !== null && product >= 5
}
