"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { DocumentPane } from "@/components/workbench/document-pane"
import { RubricPanel } from "@/components/workbench/rubric-panel"
import { useWorkbench } from "@/lib/store"
import { agentLabel } from "@/lib/text"

export function AuditWorkbench() {
  const store = useWorkbench()
  const params = useSearchParams()
  const router = useRouter()
  const fileId = params.get("file") ?? ""
  const agentId = params.get("agent") ?? ""
  const file = store.files.find((item) => item.id === fileId) ?? null
  const agent = file
    ? store.agents.find((item) => item.id === file.agentId) ?? null
    : store.agents.find((item) => item.id === agentId) ?? null

  if (!store.ready) {
    return <p className="p-6 text-sm text-slate-600">Loading the audit workbench…</p>
  }

  if (!file || !agent) {
    const visible = agent
      ? store.files.filter((item) => item.agentId === agent.id)
      : store.files
    return (
      <div className="h-full overflow-auto px-4 py-6 sm:px-6">
        <p className="text-xs font-bold tracking-[0.16em] text-[#0073ea] uppercase">Audit workbench</p>
        <h1 className="text-2xl font-bold text-[#1c1f4a]">Choose a resident file</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          The original document sits beside the rubric. New uploads stay Pending Review / Unscored until you set a rating.
        </p>
        {agent ? (
          <p className="mt-3 text-sm font-semibold text-slate-700">
            {agentLabel(agent.name)} has {visible.length} resident file{visible.length === 1 ? "" : "s"}.
          </p>
        ) : null}
        {visible.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            Upload a resident file from the Caseload CRM Board first.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {visible.map((item) => {
              const owner = store.agents.find((agentRow) => agentRow.id === item.agentId)
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className="flex w-full flex-wrap items-center gap-4 rounded-xl bg-white px-4 py-3 text-left shadow-sm ring-1 ring-slate-200"
                    onClick={() => {
                      store.selectFile(item.id)
                      router.push(`/workbench?file=${item.id}`)
                    }}
                  >
                    <span className="min-w-[180px] font-semibold whitespace-nowrap">{item.fileName}</span>
                    <span className="text-sm text-slate-500 whitespace-nowrap">
                      {owner ? agentLabel(owner.name) : "Managing agent"}
                    </span>
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold whitespace-nowrap">
                      {item.score === "unscored" ? "Pending Review / Unscored" : item.score}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    )
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-2">
      <div className="min-h-[70vh] border-b border-slate-200 lg:min-h-0 lg:border-r lg:border-b-0">
        <DocumentPane file={file} />
      </div>
      <div className="min-h-0 lg:h-full">
        <RubricPanel file={file} agent={agent} />
      </div>
    </div>
  )
}
