"use client"

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react"
import {
  createResidentFile,
  referenceFromName,
  seedFiles,
  seedProjects,
  seedQuestions,
  type AuditProject,
} from "@/lib/caseload"
import { CLIENT_TOKEN, type WrCode } from "@/lib/documents"
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
  reassignFile: (fileId: string, projectId: string) => void
  removeFile: (fileId: string) => void
  secureMode: boolean
  setSecureMode: (active: boolean) => void
}

type WorkbenchState = {
  projects: AuditProject[]
  projectId: string
  questions: RubricQuestion[]
  files: ResidentFile[]
  fileId: string
}

const WorkbenchContext = createContext<WorkbenchContextValue | null>(null)

export function WorkbenchProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WorkbenchState>({
    projects: seedProjects,
    projectId: seedProjects[0].id,
    questions: seedQuestions,
    files: seedFiles,
    fileId: seedFiles[0].id,
  })
  const [secureMode, setSecureMode] = useState(true)
  const project =
    state.projects.find((item) => item.id === state.projectId) ??
    state.projects[0]
  const file = state.files.find((item) => item.id === state.fileId) ?? null
  const projectFiles = state.files.filter((item) => item.projectId === project.id)

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
      name: "New audit project",
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
        const existing = item.marks[questionId] ?? { score: "" as RubricScore, note: "" }
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
    setState((current) => {
      const taken = new Set(current.files.map((item) => item.reference))
      const created = uploads.map((upload) => {
        const base = referenceFromName(upload.name)
        let reference = base
        let suffix = 2
        while (taken.has(reference)) {
          reference = `${base}-${suffix}`
          suffix += 1
        }
        taken.add(reference)
        return createResidentFile({
          projectId,
          reference,
          ocrText: upload.text,
        })
      })
      return {
        ...current,
        projectId,
        files: [...created, ...current.files],
        fileId: created[0]?.id ?? current.fileId,
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
        reassignFile,
        removeFile,
        secureMode,
        setSecureMode,
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
