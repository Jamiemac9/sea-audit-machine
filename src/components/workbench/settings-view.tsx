"use client"

import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWorkbench } from "@/lib/store"
import type { CaseloadGroup, Profile } from "@/lib/types"

const field =
  "h-10 min-w-[180px] w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#0073ea]"

export function SettingsView() {
  const store = useWorkbench()
  if (!store.ready) {
    return <p className="p-6 text-sm text-slate-600">Loading workspace settings…</p>
  }
  return <SettingsForm key={JSON.stringify(store.profile)} profile={store.profile} />
}

function SettingsForm({ profile }: { profile: Profile }) {
  const store = useWorkbench()
  const [draft, setDraft] = useState<Profile>(profile)
  const [dirty, setDirty] = useState(false)

  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
    setDirty(true)
  }

  return (
    <div className="h-full overflow-auto px-4 py-5 sm:px-6">
      <p className="text-xs font-bold tracking-[0.16em] text-[#0073ea] uppercase">Workstation</p>
      <h1 className="text-2xl font-bold text-[#1c1f4a]">Workspace Settings</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-600">
        Your name, role, email, and default client RP are saved in the local SQLite database and mirrored in this browser.
      </p>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-[#e8f3ff] to-white px-5 py-4">
          <h2 className="text-lg font-bold text-[#0073ea]">Profile</h2>
        </div>
        <form
          className="grid gap-4 px-5 py-5 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault()
            store.saveProfile(draft)
            setDirty(false)
          }}
        >
          <label className="block text-sm font-semibold text-slate-700">
            Name
            <input
              id="profile-name"
              className={`${field} mt-1`}
              value={draft.name}
              onChange={(event) => update("name", event.target.value)}
              autoComplete="name"
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Role
            <input
              id="profile-role"
              className={`${field} mt-1`}
              value={draft.role}
              onChange={(event) => update("role", event.target.value)}
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Email
            <input
              id="profile-email"
              type="email"
              className={`${field} mt-1`}
              value={draft.email}
              onChange={(event) => update("email", event.target.value)}
              autoComplete="email"
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Default Client RP Name
            <input
              id="profile-client"
              className={`${field} mt-1`}
              value={draft.defaultClientRpName}
              onChange={(event) => update("defaultClientRpName", event.target.value)}
            />
          </label>
          <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
            <Button type="submit" disabled={!store.ready}>
              Save profile
            </Button>
            <p className="text-sm text-slate-500">
              {dirty ? "Unsaved profile changes" : "Profile is saved on this workstation"}
            </p>
          </div>
        </form>
      </section>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-[#f6effc] to-white px-5 py-4">
          <h2 className="text-lg font-bold text-[#a25ddc]">Managing agents</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex h-8 items-center gap-2 rounded-full bg-[#0073ea] px-3 text-xs font-bold whitespace-nowrap text-white"
              onClick={() => store.addAgent("active")}
            >
              <Plus className="size-3.5" />
              Add to active caseload
            </button>
            <button
              type="button"
              className="inline-flex h-8 items-center gap-2 rounded-full bg-[#a25ddc] px-3 text-xs font-bold whitespace-nowrap text-white"
              onClick={() => store.addAgent("first-time")}
            >
              <Plus className="size-3.5" />
              Add to first time audited
            </button>
          </div>
        </div>
        {store.agents.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">No managing agents yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-max min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-bold tracking-wide text-slate-500 uppercase">
                  <th className="min-w-[180px] px-4 py-3 whitespace-nowrap">Name</th>
                  <th className="min-w-[180px] px-4 py-3 whitespace-nowrap">Group</th>
                  <th className="px-4 py-3 whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody>
                {store.agents.map((agent) => (
                  <tr key={agent.id} className="border-t border-slate-100">
                    <td className="min-w-[180px] px-4 py-3 whitespace-nowrap">
                      <input
                        aria-label="Managing agent name"
                        value={agent.name}
                        placeholder="Managing agent name"
                        onChange={(event) =>
                          store.updateAgent(agent.id, { name: event.target.value })
                        }
                        className="h-8 min-w-[180px] rounded-md border border-slate-200 px-2"
                      />
                    </td>
                    <td className="min-w-[180px] px-4 py-3 whitespace-nowrap">
                      <select
                        aria-label={`Group for ${agent.name || "managing agent"}`}
                        value={agent.group}
                        onChange={(event) =>
                          store.updateAgent(agent.id, {
                            group: event.target.value as CaseloadGroup,
                          })
                        }
                        className="h-8 min-w-[180px] rounded-md border border-slate-200 bg-white px-2"
                      >
                        <option value="active">Active Caseload</option>
                        <option value="first-time">First Time Audited</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        type="button"
                        className="inline-flex h-8 items-center gap-2 text-xs font-bold whitespace-nowrap text-rose-700"
                        onClick={() => {
                          if (window.confirm(`Remove ${agent.name || "this managing agent"}?`)) {
                            store.deleteAgent(agent.id)
                          }
                        }}
                      >
                        <Trash2 className="size-3.5" />
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-5 mb-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-white px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-[#0e7a43]">Rent setting tables</h2>
            <p className="text-sm text-slate-600">
              Used when you check WR-02 licence charges against the property rent setting.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex h-8 items-center gap-2 rounded-full bg-[#0e7a43] px-3 text-xs font-bold whitespace-nowrap text-white"
            onClick={() => store.addRent()}
          >
            <Plus className="size-3.5" />
            Add rent setting
          </button>
        </div>
        {store.rentSchedules.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">No rent settings yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-max min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-bold tracking-wide text-slate-500 uppercase">
                  {["Property", "Legal entity", "Address", "Weekly rent", "Licence charge", "Service charge", "Notes", ""].map(
                    (heading) => (
                      <th key={heading || "remove"} className="min-w-[180px] px-4 py-3 whitespace-nowrap">
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {store.rentSchedules.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    {(
                      [
                        ["propertyName", "Property"],
                        ["legalEntity", "Legal entity"],
                        ["address", "Address"],
                        ["weeklyRent", "Weekly rent"],
                        ["licenceCharge", "Licence charge"],
                        ["serviceCharge", "Service charge"],
                        ["notes", "Notes"],
                      ] as const
                    ).map(([key, label]) => (
                      <td key={key} className="min-w-[180px] px-4 py-3 whitespace-nowrap">
                        <input
                          aria-label={`${label} for rent setting`}
                          value={row[key]}
                          onChange={(event) => store.updateRent(row.id, { [key]: event.target.value })}
                          className="h-8 min-w-[180px] rounded-md border border-slate-200 px-2"
                        />
                      </td>
                    ))}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        type="button"
                        className="text-xs font-bold whitespace-nowrap text-rose-700"
                        onClick={() => store.deleteRent(row.id)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
