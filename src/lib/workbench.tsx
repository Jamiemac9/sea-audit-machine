"use client"

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  assuranceForScore,
  averageScore,
  clients,
  inScope,
  managingAgents,
  seedActivities,
  seedProjects,
  seedRemediations,
  type AuditActivity,
  type AuditProject,
  type RemediationCall,
} from "@/lib/audit"

type NewProjectInput = {
  name: string
  schemeId: string
  managingAgentId: string
  filesAudited: number
  complianceScore: number
}

type UploadInput = {
  projectId: string
  fileNames: string[]
}

type WorkbenchContextValue = {
  clientId: string
  schemeId: string
  setClientId: (clientId: string) => void
  setSchemeId: (schemeId: string) => void
  secureMode: boolean
  setSecureMode: (active: boolean) => void
  clientName: string
  schemeName: string
  schemes: { id: string; name: string }[]
  projects: AuditProject[]
  activities: AuditActivity[]
  remediations: RemediationCall[]
  metrics: {
    filesAudited: number
    averageScore: number | null
    activeAgents: number
    pendingCalls: number
    projectCount: number
  }
  addProject: (input: NewProjectInput) => void
  uploadBatch: (input: UploadInput) => void
}

const WorkbenchContext = createContext<WorkbenchContextValue | null>(null)

export function WorkbenchProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState(seedProjects)
  const [activities, setActivities] = useState(seedActivities)
  const [remediations] = useState(seedRemediations)
  const [clientId, setClientIdState] = useState(clients[0].id)
  const [schemeId, setSchemeId] = useState("all")
  const [secureMode, setSecureMode] = useState(true)

  const client = clients.find((item) => item.id === clientId) ?? clients[0]

  const scopedProjects = useMemo(
    () =>
      inScope(projects, client.id, schemeId).sort((a, b) =>
        a.updatedAt < b.updatedAt ? 1 : -1
      ),
    [projects, client.id, schemeId]
  )
  const scopedActivities = useMemo(
    () =>
      inScope(activities, client.id, schemeId).sort((a, b) =>
        a.at < b.at ? 1 : -1
      ),
    [activities, client.id, schemeId]
  )
  const scopedCalls = useMemo(
    () => inScope(remediations, client.id, schemeId),
    [remediations, client.id, schemeId]
  )

  const metrics = useMemo(() => {
    const activeAgentIds = new Set(
      scopedProjects
        .filter((project) => project.status !== "Closed")
        .map((project) => project.managingAgentId)
    )
    return {
      filesAudited: scopedProjects.reduce(
        (sum, project) => sum + project.filesAudited,
        0
      ),
      averageScore: averageScore(scopedProjects),
      activeAgents: activeAgentIds.size,
      pendingCalls: scopedCalls.filter((call) => call.status === "Open").length,
      projectCount: scopedProjects.length,
    }
  }, [scopedProjects, scopedCalls])

  function setClientId(nextClientId: string) {
    setClientIdState(nextClientId)
    setSchemeId("all")
  }

  function addProject(input: NewProjectInput) {
    const now = new Date().toISOString()
    const id = `p-${crypto.randomUUID()}`
    const project: AuditProject = {
      id,
      name: input.name.trim(),
      clientId: client.id,
      schemeId: input.schemeId,
      managingAgentId: input.managingAgentId,
      filesAudited: input.filesAudited,
      complianceScore: input.complianceScore,
      assurance: assuranceForScore(input.complianceScore),
      status: "Fieldwork",
      updatedAt: now,
    }
    setProjects((current) => [project, ...current])
    setActivities((current) => [
      {
        id: `a-${crypto.randomUUID()}`,
        clientId: client.id,
        schemeId: input.schemeId,
        projectId: id,
        title: "Audit project opened",
        detail: `${project.name} was added on this workstation.`,
        at: now,
      },
      ...current,
    ])
  }

  function uploadBatch(input: UploadInput) {
    const project = projects.find((item) => item.id === input.projectId)
    if (!project || input.fileNames.length === 0) return
    const now = new Date().toISOString()
    setProjects((current) =>
      current.map((item) =>
        item.id === project.id
          ? {
              ...item,
              filesAudited: item.filesAudited + input.fileNames.length,
              updatedAt: now,
            }
          : item
      )
    )
    setActivities((current) => [
      {
        id: `a-${crypto.randomUUID()}`,
        clientId: project.clientId,
        schemeId: project.schemeId,
        projectId: project.id,
        title: "Batch uploaded",
        detail: `${input.fileNames.length} file${input.fileNames.length === 1 ? "" : "s"} added to ${project.name}.`,
        at: now,
      },
      ...current,
    ])
  }

  const schemeName =
    schemeId === "all"
      ? "All schemes"
      : (client.schemes.find((scheme) => scheme.id === schemeId)?.name ??
        "All schemes")

  const value: WorkbenchContextValue = {
    clientId: client.id,
    schemeId,
    setClientId,
    setSchemeId,
    secureMode,
    setSecureMode,
    clientName: client.name,
    schemeName,
    schemes: client.schemes,
    projects: scopedProjects,
    activities: scopedActivities,
    remediations: scopedCalls,
    metrics,
    addProject,
    uploadBatch,
  }

  return (
    <WorkbenchContext.Provider value={value}>
      {children}
    </WorkbenchContext.Provider>
  )
}

export function useWorkbench() {
  const value = useContext(WorkbenchContext)
  if (!value) {
    throw new Error("useWorkbench must be used within WorkbenchProvider")
  }
  return value
}

export { clients, managingAgents }
