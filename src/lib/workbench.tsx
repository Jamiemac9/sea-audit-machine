"use client"

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  DEFAULT_AUDITOR,
  DEFAULT_MASTERLIST,
  type AuditorProfile,
  type MasterlistSection,
} from "@/lib/auditorSettings"
import {
  createResidentFile,
  referenceFromName,
  seedFiles,
  seedProjects,
  seedQuestions,
  type AuditProject,
} from "@/lib/caseload"
import {
  applyExtractionToFile,
  deepAuditExtract,
  mergeBundleClassification,
  toBundleFiles,
  type ClassifiedUpload,
} from "@/lib/deepAuditExtractor"
import {
  buildMissingInfoRequestEmail,
  scanCompleteness,
} from "@/lib/completenessGate"
import {
  seedManagingAgents,
  seedRegisteredProviders,
  type ManagingAgentProfile,
  type RegisteredProvider,
} from "@/lib/directory"
import { CLIENT_TOKEN, type WrCode } from "@/lib/documents"
import {
  seedProperties,
  type PropertyComplianceRow,
} from "@/lib/propertyCompliance"
import type { AuditStatus, ResidentFile } from "@/lib/rating"
import {
  standardQuestions,
  type RubricMark,
  type RubricQuestion,
  type RubricScore,
} from "@/lib/rubric"

type WorkbenchContextValue = {
  projects: AuditProject[]
  projectId: string
  project: AuditProject
  setProjectId: (projectId: string) => void
  updateProject: (projectId: string, patch: Partial<AuditProject>) => void
  addProject: () => void
  questions: RubricQuestion[]
  updateQuestion: (questionId: string, prompt: string) => void
  restoreQuestion: (questionId: string) => void
  addQuestion: (projectId: string, prompt: string) => void
  removeQuestion: (questionId: string) => void
  files: ResidentFile[]
  projectFiles: ResidentFile[]
  fileId: string
  file: ResidentFile | null
  setFileId: (fileId: string) => void
  updateFile: (fileId: string, patch: Partial<ResidentFile>) => void
  setDocumentReceived: (fileId: string, code: WrCode, present: boolean) => void
  setStatus: (fileId: string, status: AuditStatus) => void
  setMark: (
    fileId: string,
    questionId: string,
    patch: Partial<RubricMark>,
  ) => void
  signOff: (fileId: string) => void
  addUploadedFiles: (
    projectId: string,
    uploads: { name: string; text: string }[],
  ) => void
  addBundleToFile: (fileId: string, uploads: ClassifiedUpload[]) => void
  createResidentFromBundle: (
    projectId: string,
    reference: string,
    uploads: ClassifiedUpload[],
    meta?: { managingAgent?: string; managingAgentId?: string },
  ) => void
  flagMissingRequest: (fileId: string, deadlineDays?: number) => string
  uploadReceivedItems: (fileId: string, uploads: ClassifiedUpload[]) => void
  markDownAndProceed: (fileId: string) => void
  runDeepExtraction: (fileId: string) => void
  reassignFile: (fileId: string, projectId: string) => void
  removeFile: (fileId: string) => void
  secureMode: boolean
  setSecureMode: (active: boolean) => void
  registeredProviders: RegisteredProvider[]
  managingAgents: ManagingAgentProfile[]
  updateRegisteredProvider: (
    id: string,
    patch: Partial<RegisteredProvider>,
  ) => void
  updateManagingAgent: (
    id: string,
    patch: Partial<ManagingAgentProfile>,
  ) => void
  properties: PropertyComplianceRow[]
  updateProperty: (id: string, patch: Partial<PropertyComplianceRow>) => void
  auditor: AuditorProfile
  setAuditor: (patch: Partial<AuditorProfile>) => void
  masterlist: MasterlistSection[]
  updateMasterlistSection: (id: string, content: string) => void
}

type WorkbenchState = {
  projects: AuditProject[]
  projectId: string
  questions: RubricQuestion[]
  files: ResidentFile[]
  fileId: string
  registeredProviders: RegisteredProvider[]
  managingAgents: ManagingAgentProfile[]
  properties: PropertyComplianceRow[]
  auditor: AuditorProfile
  masterlist: MasterlistSection[]
}

const WorkbenchContext = createContext<WorkbenchContextValue | null>(null)

function addDaysIso(days: number) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function WorkbenchProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WorkbenchState>({
    projects: seedProjects,
    projectId: seedProjects[0].id,
    questions: seedQuestions,
    files: seedFiles,
    fileId: seedFiles[0].id,
    registeredProviders: seedRegisteredProviders,
    managingAgents: seedManagingAgents,
    properties: seedProperties,
    auditor: DEFAULT_AUDITOR,
    masterlist: DEFAULT_MASTERLIST,
  })
  const [secureMode, setSecureMode] = useState(true)
  const project =
    state.projects.find((item) => item.id === state.projectId) ??
    state.projects[0]
  const file = state.files.find((item) => item.id === state.fileId) ?? null
  const projectFiles = useMemo(
    () => state.files.filter((item) => item.projectId === project.id),
    [state.files, project.id],
  )

  function setProjectId(projectId: string) {
    setState((current) => {
      const inProject = current.files.filter((item) => item.projectId === projectId)
      const keep = inProject.some((item) => item.id === current.fileId)
      return {
        ...current,
        projectId,
        fileId: keep ? current.fileId : (inProject[0]?.id ?? ""),
      }
    })
  }

  function updateProject(projectId: string, patch: Partial<AuditProject>) {
    setState((current) => ({
      ...current,
      projects: current.projects.map((item) =>
        item.id === projectId ? { ...item, ...patch } : item,
      ),
    }))
  }

  function addProject() {
    const id = `project-${crypto.randomUUID()}`
    const nextProject: AuditProject = {
      id,
      name: "New support audit project",
      clientLabel: CLIENT_TOKEN,
    }
    setState((current) => ({
      ...current,
      projects: [...current.projects, nextProject],
      questions: [...current.questions, ...standardQuestions(id)],
      projectId: id,
      fileId: "",
    }))
  }

  function updateQuestion(questionId: string, prompt: string) {
    setState((current) => ({
      ...current,
      questions: current.questions.map((item) =>
        item.id === questionId ? { ...item, prompt } : item,
      ),
    }))
  }

  function restoreQuestion(questionId: string) {
    setState((current) => ({
      ...current,
      questions: current.questions.map((item) =>
        item.id === questionId ? { ...item, prompt: item.defaultPrompt } : item,
      ),
    }))
  }

  function addQuestion(projectId: string, prompt: string) {
    const question: RubricQuestion = {
      id: `${projectId}:custom-${crypto.randomUUID()}`,
      projectId,
      prompt,
      defaultPrompt: prompt,
      source: "custom",
      wrCode: null,
    }
    setState((current) => ({
      ...current,
      questions: [...current.questions, question],
    }))
  }

  function removeQuestion(questionId: string) {
    setState((current) => ({
      ...current,
      questions: current.questions.filter(
        (item) => item.id !== questionId || item.source !== "custom",
      ),
    }))
  }

  function setFileId(fileId: string) {
    setState((current) => {
      const next = current.files.find((item) => item.id === fileId)
      return {
        ...current,
        fileId,
        projectId: next?.projectId ?? current.projectId,
      }
    })
  }

  function updateFile(fileId: string, patch: Partial<ResidentFile>) {
    setState((current) => ({
      ...current,
      files: current.files.map((item) =>
        item.id === fileId ? { ...item, ...patch, signedOff: false } : item,
      ),
    }))
  }

  function setDocumentReceived(fileId: string, code: WrCode, present: boolean) {
    setState((current) => ({
      ...current,
      files: current.files.map((item) =>
        item.id === fileId
          ? {
              ...item,
              signedOff: false,
              received: { ...item.received, [code]: present },
            }
          : item,
      ),
    }))
  }

  function setStatus(fileId: string, status: AuditStatus) {
    updateFile(fileId, { status })
  }

  function setMark(
    fileId: string,
    questionId: string,
    patch: Partial<RubricMark>,
  ) {
    setState((current) => ({
      ...current,
      files: current.files.map((item) => {
        if (item.id !== fileId) return item
        const existing = item.marks[questionId] ?? {
          score: "" as RubricScore,
          note: "",
        }
        return {
          ...item,
          signedOff: false,
          marks: {
            ...item.marks,
            [questionId]: { ...existing, ...patch },
          },
        }
      }),
    }))
  }

  function signOff(fileId: string) {
    setState((current) => ({
      ...current,
      files: current.files.map((item) =>
        item.id === fileId
          ? { ...item, signedOff: true, status: "Audit Complete" }
          : item,
      ),
    }))
  }

  function addUploadedFiles(
    projectId: string,
    uploads: { name: string; text: string }[],
  ) {
    const classified: ClassifiedUpload[] = uploads.map((upload) => ({
      name: upload.name,
      text: upload.text,
      classifiedAs: "unclassified",
    }))
    createResidentFromBundle(projectId, referenceFromName(uploads[0]?.name ?? "UPLOAD"), classified)
  }

  function createResidentFromBundle(
    projectId: string,
    reference: string,
    uploads: ClassifiedUpload[],
    meta?: { managingAgent?: string; managingAgentId?: string },
  ) {
    setState((current) => {
      const taken = new Set(current.files.map((item) => item.reference))
      let nextRef = reference
      let suffix = 2
      while (taken.has(nextRef)) {
        nextRef = `${reference}-${suffix}`
        suffix += 1
      }
      const classifiedReceived = mergeBundleClassification(uploads)
      const created = createResidentFile({
        projectId,
        reference: nextRef,
        ocrText: uploads.map((u) => `--- ${u.name} ---\n${u.text}`).join("\n\n"),
        managingAgent: meta?.managingAgent,
        managingAgentId: meta?.managingAgentId,
      })
      created.received = { ...created.received, ...classifiedReceived }
      created.bundleFiles = toBundleFiles(uploads)
      created.status = "Docs Received"
      return {
        ...current,
        projectId,
        files: [created, ...current.files],
        fileId: created.id,
      }
    })
  }

  function addBundleToFile(fileId: string, uploads: ClassifiedUpload[]) {
    setState((current) => ({
      ...current,
      files: current.files.map((item) => {
        if (item.id !== fileId) return item
        const bundleFiles = [...(item.bundleFiles ?? []), ...toBundleFiles(uploads)]
        const classified = mergeBundleClassification(
          bundleFiles.map((file) => ({
            name: file.name,
            text: file.text,
            classifiedAs: file.classifiedAs,
          })),
        )
        const ocrText = [
          item.ocrText,
          ...uploads.map((u) => `--- ${u.name} ---\n${u.text}`),
        ]
          .filter(Boolean)
          .join("\n\n")
        return {
          ...item,
          signedOff: false,
          bundleFiles,
          ocrText,
          received: { ...item.received, ...classified },
          status:
            item.status === "Awaiting More Info" ? "Docs Received" : item.status,
        }
      }),
    }))
  }

  function flagMissingRequest(fileId: string, deadlineDays = 7) {
    let draft = ""
    setState((current) => {
      const target = current.files.find((item) => item.id === fileId)
      if (!target) return current
      const deadline = addDaysIso(deadlineDays)
      const scan = scanCompleteness(target, {
        managingAgents: current.managingAgents,
      })
      const projectLabel =
        current.projects.find((p) => p.id === target.projectId)?.clientLabel ??
        CLIENT_TOKEN
      draft = buildMissingInfoRequestEmail(target, scan, {
        clientLabel: projectLabel,
        agentName: target.managingAgent,
        auditorName: current.auditor.name,
        deadline,
      })
      return {
        ...current,
        files: current.files.map((item) =>
          item.id === fileId
            ? {
                ...item,
                status: "Awaiting More Info" as AuditStatus,
                reRequestDeadline: deadline,
                gateEmailDraft: draft,
                signedOff: false,
              }
            : item,
        ),
      }
    })
    return draft
  }

  function uploadReceivedItems(fileId: string, uploads: ClassifiedUpload[]) {
    addBundleToFile(fileId, uploads)
  }

  function markDownAndProceed(fileId: string) {
    setState((current) => {
      const target = current.files.find((item) => item.id === fileId)
      if (!target) return current
      const scan = scanCompleteness(target, {
        managingAgents: current.managingAgents,
      })
      const openIds = scan.items
        .filter((item) => !item.markedDown)
        .map((item) => item.id)
      return {
        ...current,
        files: current.files.map((item) =>
          item.id === fileId
            ? {
                ...item,
                markedDownItems: [
                  ...new Set([...(item.markedDownItems ?? []), ...openIds]),
                ],
                proceedAfterMarkDown: true,
                status: "Audit in Progress" as AuditStatus,
                signedOff: false,
                nextSteps: [
                  ...(item.nextSteps ?? []),
                  "Proceeding with marked-down penalties for items not received after request.",
                ],
              }
            : item,
        ),
      }
    })
  }

  function runDeepExtraction(fileId: string) {
    setState((current) => {
      const target = current.files.find((item) => item.id === fileId)
      if (!target) return current
      const extraction = deepAuditExtract(target, {
        managingAgents: current.managingAgents,
        clientLabel: current.projects.find((p) => p.id === target.projectId)
          ?.clientLabel,
      })
      const patch = applyExtractionToFile(target, extraction)
      return {
        ...current,
        files: current.files.map((item) =>
          item.id === fileId
            ? {
                ...item,
                ...patch,
                status:
                  item.status === "Docs Received" ||
                  item.status === "Awaiting More Info"
                    ? ("Audit in Progress" as AuditStatus)
                    : item.status,
                signedOff: false,
              }
            : item,
        ),
      }
    })
  }

  function reassignFile(fileId: string, projectId: string) {
    setState((current) => {
      const files = current.files.map((item) =>
        item.id === fileId ? { ...item, projectId, signedOff: false } : item,
      )
      const active = files.find((item) => item.id === current.fileId)
      const activeStillInProject = active?.projectId === current.projectId
      const fallback = files.find((item) => item.projectId === current.projectId)
      return {
        ...current,
        files,
        fileId: activeStillInProject ? current.fileId : (fallback?.id ?? ""),
      }
    })
  }

  function removeFile(fileId: string) {
    setState((current) => {
      const files = current.files.filter((item) => item.id !== fileId)
      if (current.fileId !== fileId) return { ...current, files }
      const fallback = files.find((item) => item.projectId === current.projectId)
      return {
        ...current,
        files,
        fileId: fallback?.id ?? "",
      }
    })
  }

  function updateRegisteredProvider(
    id: string,
    patch: Partial<RegisteredProvider>,
  ) {
    setState((current) => ({
      ...current,
      registeredProviders: current.registeredProviders.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }))
  }

  function updateManagingAgent(
    id: string,
    patch: Partial<ManagingAgentProfile>,
  ) {
    setState((current) => ({
      ...current,
      managingAgents: current.managingAgents.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }))
  }

  function updateProperty(id: string, patch: Partial<PropertyComplianceRow>) {
    setState((current) => ({
      ...current,
      properties: current.properties.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }))
  }

  function setAuditor(patch: Partial<AuditorProfile>) {
    setState((current) => ({
      ...current,
      auditor: { ...current.auditor, ...patch },
    }))
  }

  function updateMasterlistSection(id: string, content: string) {
    setState((current) => ({
      ...current,
      masterlist: current.masterlist.map((item) =>
        item.id === id ? { ...item, content } : item,
      ),
    }))
  }

  return (
    <WorkbenchContext.Provider
      value={{
        projects: state.projects,
        projectId: project.id,
        project,
        setProjectId,
        updateProject,
        addProject,
        questions: state.questions,
        updateQuestion,
        restoreQuestion,
        addQuestion,
        removeQuestion,
        files: state.files,
        projectFiles,
        fileId: file?.id ?? "",
        file,
        setFileId,
        updateFile,
        setDocumentReceived,
        setStatus,
        setMark,
        signOff,
        addUploadedFiles,
        addBundleToFile,
        createResidentFromBundle,
        flagMissingRequest,
        uploadReceivedItems,
        markDownAndProceed,
        runDeepExtraction,
        reassignFile,
        removeFile,
        secureMode,
        setSecureMode,
        registeredProviders: state.registeredProviders,
        managingAgents: state.managingAgents,
        updateRegisteredProvider,
        updateManagingAgent,
        properties: state.properties,
        updateProperty,
        auditor: state.auditor,
        setAuditor,
        masterlist: state.masterlist,
        updateMasterlistSection,
      }}
    >
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
