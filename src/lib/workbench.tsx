"use client"

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react"
import { seedFiles } from "@/lib/caseload"
import type { WrCode } from "@/lib/documents"
import type { AuditStatus, ResidentFile } from "@/lib/rating"

type WorkbenchContextValue = {
  files: ResidentFile[]
  fileId: string
  file: ResidentFile
  setFileId: (fileId: string) => void
  updateFile: (fileId: string, patch: Partial<ResidentFile>) => void
  setDocumentReceived: (fileId: string, code: WrCode, present: boolean) => void
  setStatus: (fileId: string, status: AuditStatus) => void
  signOff: (fileId: string) => void
  secureMode: boolean
  setSecureMode: (active: boolean) => void
}

const WorkbenchContext = createContext<WorkbenchContextValue | null>(null)

export function WorkbenchProvider({ children }: { children: ReactNode }) {
  const [files, setFiles] = useState(seedFiles)
  const [fileId, setFileId] = useState(seedFiles[0].id)
  const [secureMode, setSecureMode] = useState(true)
  const file = files.find((item) => item.id === fileId) ?? files[0]

  function updateFile(id: string, patch: Partial<ResidentFile>) {
    setFiles((current) =>
      current.map((item) =>
        item.id === id ? { ...item, ...patch, signedOff: false } : item,
      ),
    )
  }

  function setDocumentReceived(id: string, code: WrCode, present: boolean) {
    setFiles((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              signedOff: false,
              received: { ...item.received, [code]: present },
            }
          : item,
      ),
    )
  }

  function setStatus(id: string, status: AuditStatus) {
    updateFile(id, { status })
  }

  function signOff(id: string) {
    setFiles((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, signedOff: true, status: "Audit Complete" }
          : item,
      ),
    )
  }

  return (
    <WorkbenchContext.Provider
      value={{
        files,
        fileId: file.id,
        file,
        setFileId,
        updateFile,
        setDocumentReceived,
        setStatus,
        signOff,
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
