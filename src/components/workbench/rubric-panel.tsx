"use client"

import { useState } from "react"
import { MatrixEditor } from "@/components/workbench/matrix-editor"
import { MasterlistDrawer } from "@/components/workbench/masterlist-drawer"
import { PillSelect } from "@/components/workbench/pill-select"
import { SCORE_OPTIONS, TIER_OPTIONS, pillForScore } from "@/lib/pills"
import { RUBRIC_SECTIONS } from "@/lib/rubric-content"
import { useWorkbench } from "@/lib/store"
import { asBullets, supportVoiceWarnings } from "@/lib/text"
import type {
  AuditEvaluation,
  AuditScore,
  CheckAnswer,
  FormStatus,
  ManagingAgent,
  ResidentFile,
} from "@/lib/types"
import { downloadFileReport } from "@/lib/download-report"

const noteClass =
  "h-8 min-w-[180px] flex-1 rounded-md border border-slate-200 px-2 text-sm"
const areaClass =
  "min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"

export function RubricPanel({
  file,
  agent,
}: {
  file: ResidentFile
  agent: ManagingAgent
}) {
  const store = useWorkbench()
  const [masterSection, setMasterSection] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const tone = pillForScore(file.score)
  const titledGoals = file.audit.goals.filter((goal) => goal.active && goal.title.trim())

  function onChange(recipe: (audit: AuditEvaluation) => AuditEvaluation) {
    store.updateAudit(file.id, recipe)
  }

  return (
    <div className="h-full overflow-y-auto bg-[#f7f8fd]">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <p className="text-[11px] font-bold tracking-[0.14em] text-[#0073ea] uppercase">
          {agent.name.trim() || "Managing agent"} · {file.fileName}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-4">
          <span
            className="inline-flex h-9 items-center rounded-full px-4 text-sm font-black whitespace-nowrap"
            style={{ backgroundColor: tone.bg, color: tone.fg }}
          >
            {file.score === "unscored" ? "Pending Review / Unscored" : tone.label}
          </span>
          <PillSelect
            label="Overall audit score"
            value={file.score}
            options={SCORE_OPTIONS}
            onChange={(score: AuditScore) => store.setFileScore(file.id, score)}
          />
          <button
            type="button"
            disabled={busy}
            className="inline-flex h-8 items-center rounded-full bg-[#0e7a43] px-3 text-xs font-bold whitespace-nowrap text-white disabled:opacity-60"
            onClick={() => {
              setBusy(true)
              void downloadFileReport({
                profile: store.profile,
                agent,
                file,
                rentSchedules: store.rentSchedules,
              }).finally(() => setBusy(false))
            }}
          >
            {busy ? "Preparing…" : "Generate Audit Report (.docx)"}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Choose the rating yourself. Uploading a file never sets it to Red.
        </p>
      </div>

      <div className="space-y-4 px-4 py-4">
        <label className="block text-xs font-bold tracking-wide text-slate-500 uppercase">
          Rating rationale
          <textarea
            aria-label="Rating rationale"
            value={file.audit.ratingRationale}
            onChange={(event) =>
              onChange((current) => ({ ...current, ratingRationale: event.target.value }))
            }
            className={`${areaClass} mt-1 font-normal normal-case`}
          />
        </label>

        <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Rubric sections">
          {RUBRIC_SECTIONS.map((section, index) => (
            <a
              key={section.id}
              href={`#section-${section.id}`}
              className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-bold whitespace-nowrap text-[#1c1f4a] ring-1 ring-slate-200"
            >
              {index + 1}. {section.title.split("(")[0].trim()}
            </a>
          ))}
        </nav>

        {RUBRIC_SECTIONS.map((section) => (
          <section
            key={section.id}
            id={`section-${section.id}`}
            className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <header className="border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-white px-4 py-3">
              <h2 className="font-bold text-[#0e7a43]">{section.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{section.summary}</p>
              <p className="mt-2 text-xs font-semibold text-slate-500">
                Feedback tier for this section. This does not set Gold, Green, Amber, or Red.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {TIER_OPTIONS.map((option) => {
                  const selected = file.audit.tiers[section.id] === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={selected}
                      className="rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap"
                      style={
                        selected
                          ? { backgroundColor: option.bg, color: option.fg }
                          : { backgroundColor: "#eef1f6", color: "#3b4256" }
                      }
                      onClick={() =>
                        onChange((current) => ({
                          ...current,
                          tiers: {
                            ...current.tiers,
                            [section.id]: selected ? "" : option.value,
                          },
                        }))
                      }
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </header>
            <div className="space-y-3 px-4 py-4">
              {section.checks.map((check) => {
                const state = file.audit.checks[check.id] ?? { answer: "", note: "" }
                return (
                  <div key={check.id} className="flex flex-wrap items-center gap-4">
                    <p className="min-w-[180px] flex-1 text-sm font-medium text-slate-800">
                      {check.label}
                    </p>
                    <select
                      aria-label={check.label}
                      value={state.answer}
                      onChange={(event) => {
                        const answer = event.target.value as CheckAnswer
                        onChange((current) => {
                          const existing = current.checks[check.id] ?? { answer: "", note: "" }
                          return {
                            ...current,
                            checks: {
                              ...current.checks,
                              [check.id]: { ...existing, answer },
                            },
                          }
                        })
                      }}
                      className="h-8 min-w-[180px] shrink-0 rounded-md border border-slate-200 bg-white px-2 text-sm"
                    >
                      <option value="">Not reviewed</option>
                      <option value="yes">Yes</option>
                      <option value="partial">Partial</option>
                      <option value="no">No</option>
                    </select>
                    <input
                      aria-label={`Note for ${check.label}`}
                      value={state.note}
                      placeholder="Note"
                      onChange={(event) => {
                        const note = event.target.value
                        onChange((current) => {
                          const existing = current.checks[check.id] ?? { answer: "", note: "" }
                          return {
                            ...current,
                            checks: {
                              ...current.checks,
                              [check.id]: { ...existing, note },
                            },
                          }
                        })
                      }}
                      className={noteClass}
                    />
                  </div>
                )
              })}

              <button
                type="button"
                className="inline-flex h-8 items-center rounded-full bg-[#1c1f4a] px-3 text-xs font-bold whitespace-nowrap text-white"
                onClick={() => setMasterSection(section.id)}
              >
                Click-to-insert masterlist statement
              </button>
              <label className="block text-xs font-bold tracking-wide text-slate-500 uppercase">
                Section narrative
                <textarea
                  aria-label={`${section.title} narrative`}
                  value={file.audit.narratives[section.id] ?? ""}
                  onChange={(event) => {
                    const value = event.target.value
                    onChange((current) => ({
                      ...current,
                      narratives: { ...current.narratives, [section.id]: value },
                    }))
                  }}
                  className={`${areaClass} mt-1 font-normal normal-case`}
                />
              </label>

              {section.id === "wr02" ? <RentReference /> : null}
              {section.id === "wr09" ? (
                <MatrixEditor audit={file.audit} onChange={onChange} />
              ) : null}
              {section.id === "wr11" ? (
                <GoalsEditor audit={file.audit} onChange={onChange} titledCount={titledGoals.length} />
              ) : null}
              {section.id === "wr13" ? (
                <QualitativeEditor audit={file.audit} onChange={onChange} />
              ) : null}
              {section.id === "general" ? (
                <GeneralEditor audit={file.audit} onChange={onChange} />
              ) : null}
            </div>
          </section>
        ))}
      </div>

      <MasterlistDrawer
        sectionId={masterSection}
        open={masterSection !== null}
        onOpenChange={(next) => {
          if (!next) setMasterSection(null)
        }}
        onInsert={(sectionId, text) => {
          onChange((current) => {
            const existing = current.narratives[sectionId]?.trim() ?? ""
            return {
              ...current,
              narratives: {
                ...current.narratives,
                [sectionId]: existing ? `${existing}\n\n${text}` : text,
              },
            }
          })
          setMasterSection(null)
        }}
      />
    </div>
  )
}

function RentReference() {
  const { rentSchedules } = useWorkbench()
  if (rentSchedules.length === 0) {
    return (
      <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
        No rent setting rows yet. Add them in Workspace Settings, then compare the licence charge and rent.
      </p>
    )
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-max min-w-full text-sm">
        <thead className="bg-emerald-50 text-left text-xs font-bold tracking-wide text-[#0e7a43] uppercase">
          <tr>
            {["Property", "Legal entity", "Address", "Weekly rent", "Licence charge", "Service charge"].map(
              (heading) => (
                <th key={heading} className="min-w-[180px] px-3 py-2 whitespace-nowrap">
                  {heading}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {rentSchedules.map((row) => (
            <tr key={row.id} className="border-t border-slate-100">
              <td className="min-w-[180px] px-3 py-2 whitespace-nowrap">{row.propertyName || "—"}</td>
              <td className="min-w-[180px] px-3 py-2 whitespace-nowrap">{row.legalEntity || "—"}</td>
              <td className="min-w-[180px] px-3 py-2 whitespace-nowrap">{row.address || "—"}</td>
              <td className="min-w-[180px] px-3 py-2 whitespace-nowrap">{row.weeklyRent || "—"}</td>
              <td className="min-w-[180px] px-3 py-2 whitespace-nowrap">{row.licenceCharge || "—"}</td>
              <td className="min-w-[180px] px-3 py-2 whitespace-nowrap">{row.serviceCharge || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function GoalsEditor({
  audit,
  onChange,
  titledCount,
}: {
  audit: AuditEvaluation
  onChange: (recipe: (audit: AuditEvaluation) => AuditEvaluation) => void
  titledCount: number
}) {
  return (
    <div className="space-y-3 rounded-xl border border-sky-200 bg-sky-50/50 p-3">
      <h4 className="font-bold text-[#0073ea]">WR-11 goals</h4>
      <p className={`text-sm font-semibold ${titledCount >= 5 ? "text-emerald-800" : "text-amber-800"}`}>
        {titledCount} active goals titled. Keep at least 5 active goals at all times.
      </p>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={audit.moveInDateUsedAsTarget}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              moveInDateUsedAsTarget: event.target.checked,
            }))
          }
        />
        The move-in date has been put in Target Achievement Date
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={audit.reviewsEvery3Months}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              reviewsEvery3Months: event.target.checked,
            }))
          }
        />
        WR-12 reviews are completed every 3 months
      </label>
      <label className="block text-xs font-bold tracking-wide text-slate-500 uppercase">
        Resident reflections
        <textarea
          aria-label="Resident reflections"
          value={audit.residentReflections}
          onChange={(event) =>
            onChange((current) => ({ ...current, residentReflections: event.target.value }))
          }
          className={`${areaClass} mt-1 font-normal normal-case`}
        />
      </label>
      {audit.goals.map((goal, index) => (
        <article key={goal.id} className="rounded-xl bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm whitespace-nowrap">
              <input
                type="checkbox"
                checked={goal.active}
                onChange={(event) => {
                  const active = event.target.checked
                  onChange((current) => ({
                    ...current,
                    goals: current.goals.map((item) =>
                      item.id === goal.id ? { ...item, active } : item,
                    ),
                  }))
                }}
              />
              Active
            </label>
            <input
              aria-label={`Goal ${index + 1} title`}
              value={goal.title}
              placeholder={`Goal ${index + 1}`}
              onChange={(event) => {
                const title = event.target.value
                onChange((current) => ({
                  ...current,
                  goals: current.goals.map((item) =>
                    item.id === goal.id ? { ...item, title } : item,
                  ),
                }))
              }}
              className="h-8 min-w-[180px] flex-1 rounded-md border border-slate-200 px-2 text-sm font-semibold"
            />
            <input
              type="date"
              aria-label={`Target achievement date for goal ${index + 1}`}
              value={goal.targetDate}
              onChange={(event) => {
                const targetDate = event.target.value
                onChange((current) => ({
                  ...current,
                  goals: current.goals.map((item) =>
                    item.id === goal.id ? { ...item, targetDate } : item,
                  ),
                }))
              }}
              className="h-8 min-w-[180px] rounded-md border border-slate-200 px-2 text-sm"
            />
          </div>
          <label className="mt-3 block text-xs font-bold tracking-wide text-slate-500 uppercase">
            How will this be achieved?
            <textarea
              aria-label={`Action plan for goal ${index + 1}`}
              value={goal.actionPlan}
              onChange={(event) => {
                const actionPlan = event.target.value
                onChange((current) => ({
                  ...current,
                  goals: current.goals.map((item) =>
                    item.id === goal.id ? { ...item, actionPlan } : item,
                  ),
                }))
              }}
              className={`${areaClass} mt-1 font-normal normal-case`}
            />
          </label>
        </article>
      ))}
      <button
        type="button"
        className="text-sm font-bold text-[#0073ea]"
        onClick={() =>
          onChange((current) => ({
            ...current,
            goals: [
              ...current.goals,
              {
                id: crypto.randomUUID(),
                title: "",
                active: true,
                targetDate: "",
                actionPlan: "",
                supportBullets: "",
              },
            ],
          }))
        }
      >
        Add another goal
      </button>
    </div>
  )
}

function QualitativeEditor({
  audit,
  onChange,
}: {
  audit: AuditEvaluation
  onChange: (recipe: (audit: AuditEvaluation) => AuditEvaluation) => void
}) {
  const active = audit.goals.filter((goal) => goal.active && goal.title.trim())
  return (
    <div className="space-y-4 rounded-xl border border-violet-200 bg-violet-50/40 p-3">
      <div>
        <h4 className="font-bold text-[#6d28d9]">Section A — selected goals</h4>
        {active.length === 0 ? (
          <p className="mt-1 text-sm text-slate-600">Title the active WR-11 goals and they will list here with no extra commentary.</p>
        ) : (
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
            {active.map((goal) => (
              <li key={goal.id}>{goal.title}</li>
            ))}
          </ol>
        )}
      </div>
      <div>
        <h4 className="font-bold text-[#6d28d9]">Section B — support delivered, grouped by goal</h4>
        <p className="mt-1 text-sm text-slate-600">
          Write what the support worker did. For example: “Supported resident to contact Talk to Frank…”
        </p>
        {audit.goals.filter((goal) => goal.active).map((goal, index) => {
          const warnings = supportVoiceWarnings(goal.supportBullets)
          return (
            <label key={goal.id} className="mt-3 block text-sm font-semibold underline">
              {goal.title.trim() || `Goal ${index + 1}`}
              <textarea
                aria-label={`Support worker actions for ${goal.title || `goal ${index + 1}`}`}
                value={goal.supportBullets}
                placeholder="Supported resident to contact Talk to Frank…"
                onChange={(event) => {
                  const supportBullets = event.target.value
                  onChange((current) => ({
                    ...current,
                    goals: current.goals.map((item) =>
                      item.id === goal.id ? { ...item, supportBullets } : item,
                    ),
                  }))
                }}
                className={`${areaClass} mt-1 font-normal no-underline`}
              />
              {warnings.map((warning) => (
                <span key={warning} className="mt-1 block text-xs font-semibold text-amber-800 no-underline">
                  {warning}
                </span>
              ))}
            </label>
          )
        })}
      </div>
      <div>
        <h4 className="font-bold text-[#6d28d9]">Section C — feedback on support provided</h4>
        <Field
          label="Points of strength"
          value={audit.strengths}
          onChange={(strengths) => onChange((current) => ({ ...current, strengths }))}
        />
        <Field
          label="Next steps"
          value={audit.nextSteps}
          onChange={(nextSteps) => onChange((current) => ({ ...current, nextSteps }))}
        />
        {(
          [
            ["relevancy", "Relevancy"],
            ["followUp", "Follow-up"],
            ["resources", "Resources and signposting"],
            ["evidence", "Evidence"],
            ["practical", "Practical (“do with”) versus advisory support"],
            ["duplication", "Duplication and authenticity"],
          ] as const
        ).map(([key, label]) => (
          <Field
            key={key}
            label={label}
            value={audit[key]}
            onChange={(value) => onChange((current) => ({ ...current, [key]: value }))}
          />
        ))}
        {asBullets(audit.strengths).length === 0 ? null : (
          <p className="text-xs text-slate-500">Strengths and next steps are written as bullets in the Word report.</p>
        )}
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="mt-3 block text-xs font-bold tracking-wide text-slate-500 uppercase">
      {label}
      <textarea
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${areaClass} mt-1 font-normal normal-case`}
      />
    </label>
  )
}

function GeneralEditor({
  audit,
  onChange,
}: {
  audit: AuditEvaluation
  onChange: (recipe: (audit: AuditEvaluation) => AuditEvaluation) => void
}) {
  return (
    <div className="space-y-3">
      <Field
        label="General notes"
        value={audit.generalNotes}
        onChange={(generalNotes) => onChange((current) => ({ ...current, generalNotes }))}
      />
      <Field
        label="Previous audit follow-up"
        value={audit.previousAuditFollowUp}
        onChange={(previousAuditFollowUp) =>
          onChange((current) => ({ ...current, previousAuditFollowUp }))
        }
      />
      <Field
        label="Rent setting corrections"
        value={audit.rentCorrections}
        onChange={(rentCorrections) => onChange((current) => ({ ...current, rentCorrections }))}
      />
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-max min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-bold tracking-wide text-slate-500 uppercase">
            <tr>
              <th className="min-w-[180px] px-3 py-2 whitespace-nowrap">Form</th>
              <th className="min-w-[180px] px-3 py-2 whitespace-nowrap">Status</th>
              <th className="min-w-[180px] px-3 py-2 whitespace-nowrap">Note</th>
            </tr>
          </thead>
          <tbody>
            {audit.formNotes.map((note) => (
              <tr key={note.code} className="border-t border-slate-100">
                <td className="min-w-[180px] px-3 py-2 font-semibold whitespace-nowrap">
                  {note.code} {note.title}
                </td>
                <td className="min-w-[180px] px-3 py-2 whitespace-nowrap">
                  <select
                    aria-label={`Status for ${note.code}`}
                    value={note.status}
                    onChange={(event) => {
                      const status = event.target.value as FormStatus
                      onChange((current) => ({
                        ...current,
                        formNotes: current.formNotes.map((item) =>
                          item.code === note.code ? { ...item, status } : item,
                        ),
                      }))
                    }}
                    className="h-8 min-w-[180px] rounded-md border border-slate-200 bg-white px-2"
                  >
                    <option value="">Not reviewed</option>
                    <option value="ok">OK</option>
                    <option value="discrepancy">Discrepancy</option>
                    <option value="missing">Missing</option>
                  </select>
                </td>
                <td className="min-w-[180px] px-3 py-2 whitespace-nowrap">
                  <input
                    aria-label={`Note for ${note.code}`}
                    value={note.note}
                    onChange={(event) => {
                      const value = event.target.value
                      onChange((current) => ({
                        ...current,
                        formNotes: current.formNotes.map((item) =>
                          item.code === note.code ? { ...item, note: value } : item,
                        ),
                      }))
                    }}
                    className="h-8 min-w-[180px] rounded-md border border-slate-200 px-2"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
