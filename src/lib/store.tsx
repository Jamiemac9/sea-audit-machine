"use client"

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { rationaleForScore } from "@/lib/audit-factory"
import { syncOverall } from "@/lib/score"
import {
  EMPTY_SNAPSHOT,
  sanitizeFile,
  sanitizeSnapshot,
} from "@/lib/snapshot"
import type {
  AuditEvaluation,
  AuditScore,
  CaseloadGroup,
  ManagingAgent,
  Profile,
  RentSchedule,
  ResidentFile,
  Snapshot,
} from "@/lib/types"

const STORAGE_KEY = "seaaudit-workbench-v1"

type Store = {
  ready: boolean
  saving: boolean
  error: string | null
  clearError: () => void
  uploading: boolean
  profile: Profile
  agents: ManagingAgent[]
  rentSchedules: RentSchedule[]
  files: ResidentFile[]
  selectedFileId: string
  saveProfile: (profile: Profile) => void
  addAgent: (group: CaseloadGroup) => string
  updateAgent: (id: string, patch: Partial<ManagingAgent>) => void
  deleteAgent: (id: string) => void
  addRent: () => void
  updateRent: (id: string, patch: Partial<RentSchedule>) => void
  deleteRent: (id: string) => void
  uploadFiles: (agentId: string, list: File[]) => Promise<void>
  updateFile: (
    id: string,
    patch: Partial<Pick<ResidentFile, "fileName" | "extractText">>,
  ) => void
  updateAudit: (
    id: string,
    recipe: (audit: AuditEvaluation) => AuditEvaluation,
  ) => void
  setFileScore: (id: string, score: AuditScore) => void
  deleteFile: (id: string) => void
  selectFile: (id: string) => void
}

const StoreContext = createContext<Store | null>(null)

function readCache(): Snapshot | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return sanitizeSnapshot(JSON.parse(raw) as unknown)
  } catch {
    return null
  }
}

function cacheSnapshot(snapshot: Snapshot) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
  } catch {
    const slim: Snapshot = {
      ...snapshot,
      files: snapshot.files.map((file) => ({ ...file, previewHtml: "" })),
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slim))
    } catch {
      // The SQLite database remains the source of truth.
    }
  }
}

export function WorkbenchProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<Snapshot>(EMPTY_SNAPSHOT)
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const latest = useRef(snapshot)
  const hydrated = useRef(false)
  const queue = useRef(Promise.resolve())
  const timer = useRef<number | null>(null)

  useEffect(() => {
    latest.current = snapshot
  }, [snapshot])

  async function putSnapshot(payload: Snapshot) {
    setSaving(true)
    try {
      const response = await fetch("/api/state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error("Could not save to the local database.")
      setError(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save.")
    } finally {
      setSaving(false)
    }
  }

  function enqueue(task: () => Promise<void>) {
    queue.current = queue.current.then(task, task)
    return queue.current
  }

  function scheduleSave() {
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      void enqueue(() => putSnapshot(latest.current))
    }, 300)
  }

  function commit(
    updater: (current: Snapshot) => Snapshot,
    immediate = false,
  ) {
    if (!hydrated.current) return
    const next = updater(latest.current)
    latest.current = next
    setSnapshot(next)
    cacheSnapshot(next)
    if (immediate) {
      if (timer.current) window.clearTimeout(timer.current)
      void enqueue(() => putSnapshot(latest.current))
    } else {
      scheduleSave()
    }
  }

  useEffect(() => {
    let cancelled = false
    fetch("/api/state")
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not read the local database.")
        return sanitizeSnapshot(await response.json())
      })
      .then((next) => {
        if (cancelled) return
        latest.current = next
        setSnapshot(next)
        cacheSnapshot(next)
        hydrated.current = true
        setReady(true)
      })
      .catch((caught: unknown) => {
        if (cancelled) return
        const cached = readCache()
        hydrated.current = true
        if (cached) {
          latest.current = cached
          setSnapshot(cached)
        }
        setError(
          caught instanceof Error
            ? `${caught.message} Showing the browser copy.`
            : "Could not read the local database. Showing the browser copy.",
        )
        setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  function saveProfile(profile: Profile) {
    commit(
      (current) => ({
        ...current,
        profile: {
          name: profile.name.trim(),
          role: profile.role.trim(),
          email: profile.email.trim(),
          defaultClientRpName: profile.defaultClientRpName.trim(),
        },
      }),
      true,
    )
  }

  function addAgent(group: CaseloadGroup) {
    const id = crypto.randomUUID()
    const agent: ManagingAgent = {
      id,
      name: "",
      group,
      propertiesUnits: "",
      docsDeadline: "",
      docsReceived: "",
      crmStatus: "Files Requested",
      overallScore: "unscored",
      reRequestDeadline: "",
      teamsCallDate: "",
    }
    commit((current) => ({ ...current, agents: [...current.agents, agent] }), true)
    return id
  }

  function updateAgent(id: string, patch: Partial<ManagingAgent>) {
    commit((current) => ({
      ...current,
      agents: current.agents.map((agent) =>
        agent.id === id ? { ...agent, ...patch, id: agent.id } : agent,
      ),
    }))
  }

  function deleteAgent(id: string) {
    commit((current) => ({
      ...current,
      agents: current.agents.filter((agent) => agent.id !== id),
      files: current.files.filter((file) => file.agentId !== id),
      selectedFileId: current.files.some(
        (file) => file.id === current.selectedFileId && file.agentId === id,
      )
        ? ""
        : current.selectedFileId,
    }), true)
  }

  function addRent() {
    const row: RentSchedule = {
      id: crypto.randomUUID(),
      propertyName: "",
      legalEntity: "",
      address: "",
      weeklyRent: "",
      licenceCharge: "",
      serviceCharge: "",
      notes: "",
    }
    commit((current) => ({
      ...current,
      rentSchedules: [...current.rentSchedules, row],
    }))
  }

  function updateRent(id: string, patch: Partial<RentSchedule>) {
    commit((current) => ({
      ...current,
      rentSchedules: current.rentSchedules.map((row) =>
        row.id === id ? { ...row, ...patch, id: row.id } : row,
      ),
    }))
  }

  function deleteRent(id: string) {
    commit((current) => ({
      ...current,
      rentSchedules: current.rentSchedules.filter((row) => row.id !== id),
    }))
  }

  async function uploadFiles(agentId: string, list: File[]) {
    if (list.length === 0) return
    setUploading(true)
    if (timer.current) window.clearTimeout(timer.current)
    try {
      await enqueue(async () => {
        await putSnapshot(latest.current)
        for (const file of list) {
          const body = new FormData()
          body.set("agentId", agentId)
          body.set("file", file)
          const response = await fetch("/api/files", { method: "POST", body })
          const payload = (await response.json()) as { file?: unknown; error?: string }
          if (!response.ok || !payload.file) {
            throw new Error(payload.error || "Could not read that file.")
          }
          const created = sanitizeFile(payload.file)
          if (!created || created.score !== "unscored") {
            throw new Error("The upload was not stored as Pending Review / Unscored.")
          }
          const next: Snapshot = {
            ...latest.current,
            files: [created, ...latest.current.files.filter((item) => item.id !== created.id)],
            selectedFileId: created.id,
          }
          latest.current = next
          setSnapshot(next)
          cacheSnapshot(next)
        }
        await putSnapshot(latest.current)
      })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Upload failed.")
    } finally {
      setUploading(false)
    }
  }

  function updateFile(
    id: string,
    patch: Partial<Pick<ResidentFile, "fileName" | "extractText">>,
  ) {
    commit((current) => ({
      ...current,
      files: current.files.map((file) =>
        file.id === id
          ? {
              ...file,
              fileName: patch.fileName ?? file.fileName,
              extractText: patch.extractText ?? file.extractText,
            }
          : file,
      ),
    }))
  }

  function updateAudit(
    id: string,
    recipe: (audit: AuditEvaluation) => AuditEvaluation,
  ) {
    commit((current) => ({
      ...current,
      files: current.files.map((file) =>
        file.id === id ? { ...file, audit: recipe(file.audit) } : file,
      ),
    }))
  }

  function setFileScore(id: string, score: AuditScore) {
    commit((current) => {
      const files = current.files.map((file) => {
        if (file.id !== id) return file
        return {
          ...file,
          score,
          scoredAt: score === "unscored" ? "" : new Date().toISOString(),
          audit: {
            ...file.audit,
            ratingRationale: rationaleForScore(file.audit.ratingRationale, score),
          },
        }
      })
      const owner = files.find((file) => file.id === id)
      return {
        ...current,
        files,
        agents: owner
          ? syncOverall(current.agents, files, owner.agentId)
          : current.agents,
      }
    })
  }

  function deleteFile(id: string) {
    commit((current) => {
      const removed = current.files.find((file) => file.id === id)
      const files = current.files.filter((file) => file.id !== id)
      return {
        ...current,
        files,
        agents: removed
          ? syncOverall(current.agents, files, removed.agentId)
          : current.agents,
        selectedFileId: current.selectedFileId === id ? "" : current.selectedFileId,
      }
    }, true)
  }

  function selectFile(id: string) {
    commit((current) => ({ ...current, selectedFileId: id }), true)
  }

  const value: Store = {
    ready,
    saving,
    error,
    clearError: () => setError(null),
    uploading,
    profile: snapshot.profile,
    agents: snapshot.agents,
    rentSchedules: snapshot.rentSchedules,
    files: snapshot.files,
    selectedFileId: snapshot.selectedFileId,
    saveProfile,
    addAgent,
    updateAgent,
    deleteAgent,
    addRent,
    updateRent,
    deleteRent,
    uploadFiles,
    updateFile,
    updateAudit,
    setFileScore,
    deleteFile,
    selectFile,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useWorkbench() {
  const value = useContext(StoreContext)
  if (!value) throw new Error("useWorkbench must be used within WorkbenchProvider")
  return value
}
