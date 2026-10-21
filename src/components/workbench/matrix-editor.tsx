"use client"

import {
  LIKELIHOOD_LEVELS,
  SEVERITY_LEVELS,
  VALID_MATRIX_SCORES,
  matrixIssues,
  matrixProduct,
  riskNeedsPlan,
  writtenScoreIssue,
} from "@/lib/matrix"
import { RISK_AREAS } from "@/lib/rubric-content"
import type { AuditEvaluation, RiskScore } from "@/lib/types"

const selectClass =
  "h-8 min-w-[180px] shrink-0 rounded-md border border-slate-200 bg-white px-2 text-sm"

export function MatrixEditor({
  audit,
  onChange,
}: {
  audit: AuditEvaluation
  onChange: (recipe: (audit: AuditEvaluation) => AuditEvaluation) => void
}) {
  const issues = matrixIssues(audit)

  function patchRisk(id: string, patch: Partial<RiskScore>) {
    onChange((current) => ({
      ...current,
      risks: current.risks.map((risk) => (risk.id === id ? { ...risk, ...patch } : risk)),
    }))
  }

  return (
    <div className="space-y-3 rounded-xl border border-orange-200 bg-orange-50/40 p-3">
      <div>
        <h4 className="font-bold text-[#c2410c]">5×5 matrix calculator</h4>
        <p className="mt-1 text-sm text-slate-600">
          Likelihood (Unlikely 1, Remote 2, Occasional 3, Likely 4, Frequent 5) × severity (Negligible 1, Marginal 2, Serious 3, Major 4, Catastrophic 5). Valid scores only: {VALID_MATRIX_SCORES.join(", ")}. Numbers such as 7, 11, 13, and 14 are matrix violations.
        </p>
      </div>
      {issues.length > 0 ? (
        <ul className="space-y-1 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white">
          {issues.map((issue) => (
            <li key={`${issue.riskId}-${issue.message}`}>{issue.message}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm font-semibold text-emerald-800">No matrix violations on the numbers entered so far.</p>
      )}
      <div className="space-y-3">
        {audit.risks.map((risk) => {
          const label = RISK_AREAS.find((area) => area.id === risk.id)?.label ?? risk.id
          const product = matrixProduct(risk.likelihood, risk.severity)
          const written = writtenScoreIssue(risk.writtenScore)
          return (
            <article key={risk.id} className="rounded-xl border border-white bg-white p-3 shadow-sm">
              <h5 className="font-bold text-[#1c1f4a]">{label}</h5>
              <div className="mt-2 flex flex-wrap items-center gap-4">
                <select
                  aria-label={`Likelihood for ${label}`}
                  className={selectClass}
                  value={risk.likelihood ?? ""}
                  onChange={(event) =>
                    patchRisk(risk.id, {
                      likelihood: event.target.value ? Number(event.target.value) : null,
                    })
                  }
                >
                  <option value="">Likelihood</option>
                  {LIKELIHOOD_LEVELS.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.value} · {level.label}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={`Severity for ${label}`}
                  className={selectClass}
                  value={risk.severity ?? ""}
                  onChange={(event) =>
                    patchRisk(risk.id, {
                      severity: event.target.value ? Number(event.target.value) : null,
                    })
                  }
                >
                  <option value="">Severity</option>
                  {SEVERITY_LEVELS.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.value} · {level.label}
                    </option>
                  ))}
                </select>
                <span
                  className={`inline-flex h-8 min-w-[180px] items-center justify-center rounded-full px-3 text-xs font-bold whitespace-nowrap ${
                    product === null
                      ? "bg-slate-200 text-slate-700"
                      : "bg-emerald-600 text-white"
                  }`}
                >
                  {product === null ? "Score not calculated" : `Calculated score ${product}`}
                </span>
              </div>
              <label className="mt-3 block text-xs font-bold tracking-wide text-slate-500 uppercase">
                Score written on the form
                <input
                  aria-label={`Score written on the form for ${label}`}
                  value={risk.writtenScore}
                  inputMode="numeric"
                  placeholder="e.g. 6"
                  onChange={(event) => patchRisk(risk.id, { writtenScore: event.target.value })}
                  className="mt-1 h-8 w-full min-w-[180px] rounded-md border border-slate-200 px-2 text-sm font-normal normal-case"
                />
              </label>
              {written ? (
                <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                  Matrix violation: {written}
                </p>
              ) : null}
              <label className="mt-3 block text-xs font-bold tracking-wide text-slate-500 uppercase">
                Written justification
                <textarea
                  aria-label={`Justification for ${label}`}
                  value={risk.justification}
                  onChange={(event) => patchRisk(risk.id, { justification: event.target.value })}
                  className="mt-1 min-h-16 w-full rounded-md border border-slate-200 px-2 py-1 text-sm font-normal normal-case"
                />
              </label>
              <label className="mt-3 block text-xs font-bold tracking-wide text-slate-500 uppercase">
                Triggers
                <textarea
                  aria-label={`Triggers for ${label}`}
                  value={risk.triggers}
                  onChange={(event) => patchRisk(risk.id, { triggers: event.target.value })}
                  className="mt-1 min-h-16 w-full rounded-md border border-slate-200 px-2 py-1 text-sm font-normal normal-case"
                />
              </label>
              <div className="mt-3 flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={risk.planComplete}
                    onChange={(event) => patchRisk(risk.id, { planComplete: event.target.checked })}
                  />
                  Risk Management Plan completed
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={risk.staffEyesOnly}
                    onChange={(event) =>
                      patchRisk(risk.id, { staffEyesOnly: event.target.checked })
                    }
                  />
                  Staff Eyes Only (WR-10)
                </label>
              </div>
              {riskNeedsPlan(risk) && !risk.planComplete ? (
                <p className="mt-2 text-sm font-semibold text-amber-800">
                  This score is 5 or above, so the Risk Management Plan needs to be completed.
                </p>
              ) : null}
            </article>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        {([
          ["m3", "3 months"],
          ["m6", "6 months"],
          ["m9", "9 months"],
          ["m12", "12 months"],
        ] as const).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 whitespace-nowrap">
            <input
              type="checkbox"
              checked={audit.reviewMonths[key]}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  reviewMonths: { ...current.reviewMonths, [key]: event.target.checked },
                }))
              }
            />
            Updated at {label}
          </label>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={audit.newRisksAdded}
          onChange={(event) =>
            onChange((current) => ({ ...current, newRisksAdded: event.target.checked }))
          }
        />
        New risks from session notes have been added to WR-09
      </label>
    </div>
  )
}
