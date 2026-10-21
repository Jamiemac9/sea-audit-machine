"use client"

import { useRef, useState, useSyncExternalStore } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, Plus, Sparkles, Trash2, Upload } from "lucide-react"
import { PillSelect } from "@/components/workbench/pill-select"
import {
  CompletionBar,
  ProgressRing,
  ScoreBattery,
} from "@/components/workbench/progress-widgets"
import { downloadAgentPackage, downloadFileReport } from "@/lib/download-report"
import { CRM_OPTIONS, SCORE_OPTIONS } from "@/lib/pills"
import { completionPercent, filesAuditedOn, isFlaggedScore, xpTotal } from "@/lib/score"
import { useWorkbench } from "@/lib/store"
import { agentLabel, localDay } from "@/lib/text"
import type { AuditScore, CaseloadGroup, CrmStatus, ManagingAgent } from "@/lib/types"

const GROUPS: { id: CaseloadGroup; title: string; tint: string; wash: string }[] = [
  { id: "active", title: "Active Caseload", tint: "#0073ea", wash: "#e8f3ff" },
  { id: "first-time", title: "First Time Audited", tint: "#a25ddc", wash: "#f6effc" },
]

function useAuditedToday(files: Parameters<typeof filesAuditedOn>[0]) {
  const day = useSyncExternalStore(
    () => () => {},
    () => localDay(),
    () => "",
  )
  if (!day) return 0
  return filesAuditedOn(files, day)
}

export function CaseloadBoard() {
  const store = useWorkbench()
  const today = useAuditedToday(store.files)
  const xp = xpTotal(store.files)
  const overall = completionPercent(store.files, store.agents)

  if (!store.ready) {
    return <p className="p-6 text-sm text-slate-600">Loading the caseload…</p>
  }

  return (
    <div className="h-full overflow-auto px-4 py-5 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.16em] text-[#0073ea] uppercase">
            Caseload tracker
          </p>
          <h1 className="text-2xl font-bold text-[#1c1f4a]">Caseload CRM Board</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Group managing agents into active caseload and first-time audits. Uploaded resident files stay Pending Review / Unscored until you grade them.
          </p>
        </div>
        <div className="flex items-center gap-4 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-[#d9e2f2]">
          <ProgressRing value={overall} color="#0073ea" />
          <div>
            <p className="flex items-center gap-1 text-xs font-bold tracking-wide text-slate-500 uppercase">
              <Sparkles className="size-3.5 text-[#f0a202]" />
              Audit XP
            </p>
            <p className="text-2xl font-black text-[#1c1f4a]">{xp}</p>
            <p className="text-sm font-semibold text-slate-600 whitespace-nowrap">
              Files audited today: {today}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#d9e2f2]">
        <p className="mb-2 text-xs font-bold tracking-wide text-slate-500 uppercase">
          Gold / Green / Amber / Red
        </p>
        <ScoreBattery scores={store.files.map((file) => file.score)} />
      </div>

      <div className="mt-5 space-y-5">
        {GROUPS.map((group) => (
          <GroupSection key={group.id} group={group} />
        ))}
      </div>
    </div>
  )
}

function GroupSection({
  group,
}: {
  group: { id: CaseloadGroup; title: string; tint: string; wash: string }
}) {
  const store = useWorkbench()
  const [open, setOpen] = useState(true)
  const agents = store.agents.filter((agent) => agent.group === group.id)
  const files = store.files.filter((file) => agents.some((agent) => agent.id === file.agentId))
  const percent = completionPercent(files, agents)
  const today = useAuditedToday(files)
  const xp = xpTotal(files)

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#d9e2f2]">
      <header className="flex flex-wrap items-center gap-4 px-4 py-4" style={{ backgroundColor: group.wash }}>
        <button
          type="button"
          aria-expanded={open}
          aria-label={`${open ? "Collapse" : "Expand"} ${group.title}`}
          className="inline-flex size-8 items-center justify-center rounded-full bg-white text-[#1c1f4a] shadow-sm"
          onClick={() => setOpen((value) => !value)}
        >
          <ChevronDown className={`size-4 transition-transform ${open ? "" : "-rotate-90"}`} />
        </button>
        <ProgressRing value={percent} color={group.tint} />
        <div className="min-w-[180px] flex-1">
          <h2 className="text-lg font-black" style={{ color: group.tint }}>
            {group.title}
          </h2>
          <p className="text-sm font-semibold text-slate-600 whitespace-nowrap">
            {agents.length} managing agents · {files.length} resident files · {xp} XP · Files audited today: {today}
          </p>
          <div className="mt-2 max-w-xl">
            <CompletionBar value={percent} color={group.tint} />
          </div>
        </div>
      </header>

      {open ? (
        <div className="overflow-x-auto">
          <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="bg-[#1c1f4a] text-left text-xs font-bold tracking-wide text-white uppercase">
                {[
                  "Managing Agent",
                  "Properties / Units",
                  "Docs Deadline",
                  "Docs Received",
                  "CRM Status",
                  "Overall Audit Score",
                  "Re-Request Deadline",
                  "Teams Call Date",
                  "Action",
                ].map((heading) => (
                  <th key={heading} className="min-w-[180px] px-4 py-3 whitespace-nowrap">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-sm text-slate-500">
                    No managing agents in this group yet.
                  </td>
                </tr>
              ) : (
                agents.map((agent) => <AgentRows key={agent.id} agent={agent} />)
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      <footer className="space-y-3 border-t border-slate-100 bg-slate-50 px-4 py-4">
        <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">Group summary</p>
        <ScoreBattery scores={files.map((file) => file.score)} />
        <CompletionBar value={percent} color={group.tint} />
        <button
          type="button"
          className="inline-flex h-9 items-center gap-2 rounded-full bg-[#1c1f4a] px-4 text-sm font-bold whitespace-nowrap text-white"
          onClick={() => store.addAgent(group.id)}
        >
          <Plus className="size-4" />
          Add managing agent
        </button>
      </footer>
    </section>
  )
}

function AgentRows({ agent }: { agent: ManagingAgent }) {
  const store = useWorkbench()
  const router = useRouter()
  const [expanded, setExpanded] = useState(true)
  const [busy, setBusy] = useState(false)
  const uploadRef = useRef<HTMLInputElement>(null)
  const files = store.files.filter((file) => file.agentId === agent.id)
  const flagged = isFlaggedScore(agent.overallScore)
  const name = agentLabel(agent.name)

  async function downloadPackage() {
    setBusy(true)
    try {
      await downloadAgentPackage({
        profile: store.profile,
        agent,
        files,
        rentSchedules: store.rentSchedules,
      })
    } finally {
      setBusy(false)
    }
  }

  function openWorkbench() {
    const first = files[0]
    if (first) {
      store.selectFile(first.id)
      router.push(`/workbench?file=${first.id}`)
      return
    }
    router.push(`/workbench?agent=${agent.id}`)
  }

  return (
    <>
      <tr className="border-t border-slate-100 align-middle">
        <td className="min-w-[180px] px-4 py-3 whitespace-nowrap">
          <div className="flex items-center gap-4">
            <button
              type="button"
              aria-expanded={expanded}
              aria-label={`Resident files for ${name}`}
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-slate-100"
              onClick={() => setExpanded((value) => !value)}
            >
              <ChevronDown className={`size-4 ${expanded ? "" : "-rotate-90"}`} />
            </button>
            <input
              aria-label={`Managing agent name for ${name}`}
              value={agent.name}
              placeholder="Managing agent name"
              onChange={(event) => store.updateAgent(agent.id, { name: event.target.value })}
              className="h-8 min-w-[180px] shrink-0 rounded-md border border-slate-200 bg-white px-2 text-sm font-semibold"
            />
            <span className="rounded-full bg-[#e8f3ff] px-2 py-0.5 text-[11px] font-bold whitespace-nowrap text-[#0073ea]">
              {files.length} files
            </span>
          </div>
        </td>
        <td className="min-w-[180px] px-4 py-3 whitespace-nowrap">
          <input
            aria-label={`Properties and units for ${name}`}
            value={agent.propertiesUnits}
            placeholder="e.g. 12 units"
            onChange={(event) =>
              store.updateAgent(agent.id, { propertiesUnits: event.target.value })
            }
            className="h-8 min-w-[180px] shrink-0 rounded-md border border-slate-200 bg-white px-2 text-sm"
          />
        </td>
        <td className="min-w-[180px] px-4 py-3 whitespace-nowrap">
          <input
            type="date"
            aria-label={`Docs deadline for ${name}`}
            value={agent.docsDeadline}
            onChange={(event) => store.updateAgent(agent.id, { docsDeadline: event.target.value })}
            className="h-8 min-w-[180px] shrink-0 rounded-md border border-slate-200 bg-white px-2 text-sm"
          />
        </td>
        <td className="min-w-[180px] px-4 py-3 whitespace-nowrap">
          <input
            type="date"
            aria-label={`Docs received for ${name}`}
            value={agent.docsReceived}
            onChange={(event) => store.updateAgent(agent.id, { docsReceived: event.target.value })}
            className="h-8 min-w-[180px] shrink-0 rounded-md border border-slate-200 bg-white px-2 text-sm"
          />
        </td>
        <td className="min-w-[180px] px-4 py-3 whitespace-nowrap">
          <PillSelect
            label={`CRM status for ${name}`}
            value={agent.crmStatus}
            options={CRM_OPTIONS}
            onChange={(crmStatus: CrmStatus) => store.updateAgent(agent.id, { crmStatus })}
          />
        </td>
        <td className="min-w-[180px] px-4 py-3 whitespace-nowrap">
          <PillSelect
            label={`Overall audit score for ${name}`}
            value={agent.overallScore}
            options={SCORE_OPTIONS}
            onChange={(overallScore: AuditScore) => store.updateAgent(agent.id, { overallScore })}
          />
        </td>
        <td className="min-w-[180px] px-4 py-3 whitespace-nowrap">
          <FlaggedDate
            label={`Re-request deadline for ${name}`}
            value={agent.reRequestDeadline}
            flagged={flagged}
            onChange={(reRequestDeadline) => store.updateAgent(agent.id, { reRequestDeadline })}
          />
        </td>
        <td className="min-w-[180px] px-4 py-3 whitespace-nowrap">
          <FlaggedDate
            label={`Teams call date for ${name}`}
            value={agent.teamsCallDate}
            flagged={flagged}
            onChange={(teamsCallDate) => store.updateAgent(agent.id, { teamsCallDate })}
          />
        </td>
        <td className="min-w-[360px] px-4 py-3 whitespace-nowrap">
          <div className="flex items-center gap-4 whitespace-nowrap">
            <button
              type="button"
              className="inline-flex h-8 shrink-0 items-center rounded-full bg-[#0073ea] px-3 text-xs font-bold whitespace-nowrap text-white"
              onClick={openWorkbench}
            >
              Open in Workbench
            </button>
            <button
              type="button"
              className="inline-flex h-8 shrink-0 items-center rounded-full bg-[#0e7a43] px-3 text-xs font-bold whitespace-nowrap text-white disabled:opacity-60"
              disabled={busy}
              onClick={() => void downloadPackage()}
            >
              {busy ? "Preparing…" : "Download .DOCX Package"}
            </button>
            <button
              type="button"
              aria-label={`Remove ${name}`}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-rose-700 hover:bg-rose-50"
              onClick={() => {
                const count = files.length
                const message = count
                  ? `Remove ${name} and ${count} resident file${count === 1 ? "" : "s"}?`
                  : `Remove ${name}?`
                if (window.confirm(message)) store.deleteAgent(agent.id)
              }}
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </td>
      </tr>
      {expanded ? (
        <tr className="bg-[#f8faff]">
          <td colSpan={9} className="border-t border-slate-100 px-4 py-3">
            <div className="mb-3 flex flex-wrap items-center gap-4">
              <input
                ref={uploadRef}
                type="file"
                className="sr-only"
                accept=".pdf,.docx,.png,.jpg,.jpeg,.webp,.txt,application/pdf,image/*"
                aria-label={`Upload a resident file for ${name}`}
                onChange={(event) => {
                  const list = Array.from(event.target.files ?? [])
                  event.target.value = ""
                  void store.uploadFiles(agent.id, list)
                }}
              />
              <button
                type="button"
                className="inline-flex h-8 items-center gap-2 rounded-full border border-[#0073ea] bg-white px-3 text-xs font-bold whitespace-nowrap text-[#0073ea]"
                onClick={() => uploadRef.current?.click()}
                disabled={store.uploading}
              >
                <Upload className="size-3.5" />
                {store.uploading ? "Reading file…" : "Upload resident file"}
              </button>
              <p className="text-xs text-slate-500">
                PDF, Word, and images are read locally. New files open as Pending Review / Unscored.
              </p>
            </div>
            {files.length === 0 ? (
              <p className="text-sm text-slate-500">No resident files uploaded for this managing agent.</p>
            ) : (
              <div className="space-y-2">
                {files.map((file) => (
                  <FileLine key={file.id} fileId={file.id} agent={agent} />
                ))}
              </div>
            )}
          </td>
        </tr>
      ) : null}
    </>
  )
}

function FileLine({ fileId, agent }: { fileId: string; agent: ManagingAgent }) {
  const store = useWorkbench()
  const router = useRouter()
  const file = store.files.find((item) => item.id === fileId)
  const [busy, setBusy] = useState(false)
  if (!file) return null

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex min-w-[180px] shrink-0 items-center gap-4 whitespace-nowrap">
          <span className="text-[11px] font-bold tracking-wide text-slate-500 uppercase">
            File name
          </span>
          <input
            aria-label={`File name for ${file.fileName}`}
            value={file.fileName}
            onChange={(event) => store.updateFile(file.id, { fileName: event.target.value })}
            className="h-8 min-w-[180px] shrink-0 rounded-md border border-slate-200 bg-white px-2 text-sm font-semibold"
          />
        </label>
        <PillSelect
          label={`Audit score for ${file.fileName}`}
          value={file.score}
          options={SCORE_OPTIONS}
          onChange={(score: AuditScore) => store.setFileScore(file.id, score)}
        />
        {file.score === "unscored" ? (
          <span className="rounded-full bg-slate-200 px-2 py-1 text-[11px] font-bold whitespace-nowrap text-slate-700">
            Pending Review / Unscored
          </span>
        ) : null}
        <button
          type="button"
          className="inline-flex h-8 shrink-0 items-center rounded-full bg-[#0073ea] px-3 text-xs font-bold whitespace-nowrap text-white"
          onClick={() => {
            store.selectFile(file.id)
            router.push(`/workbench?file=${file.id}`)
          }}
        >
          Open in Workbench
        </button>
        <button
          type="button"
          className="inline-flex h-8 shrink-0 items-center rounded-full bg-[#0e7a43] px-3 text-xs font-bold whitespace-nowrap text-white disabled:opacity-60"
          disabled={busy}
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
        <button
          type="button"
          className="inline-flex h-8 shrink-0 items-center whitespace-nowrap text-xs font-bold text-rose-700"
          onClick={() => {
            if (window.confirm(`Remove ${file.fileName}?`)) store.deleteFile(file.id)
          }}
        >
          Remove file
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {file.extractEngine
          ? `Extracted with ${file.extractEngine}.`
          : "Waiting for a local extract."}{" "}
        {file.extractError || "The original document stays beside the audit."}
      </p>
    </div>
  )
}

function FlaggedDate({
  value,
  label,
  flagged,
  onChange,
}: {
  value: string
  label: string
  flagged: boolean
  onChange: (value: string) => void
}) {
  return (
    <div className="flex min-w-[180px] items-center gap-4 whitespace-nowrap">
      <input
        type="date"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 min-w-[180px] shrink-0 rounded-md border border-slate-200 bg-white px-2 text-sm"
      />
      {flagged ? (
        <span className="shrink-0 rounded-full bg-rose-600 px-2 py-0.5 text-[11px] font-bold whitespace-nowrap text-white">
          Flagged
        </span>
      ) : null}
    </div>
  )
}
