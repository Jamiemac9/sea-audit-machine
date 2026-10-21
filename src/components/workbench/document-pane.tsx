"use client"

import { useState } from "react"
import { anonymiseExtract } from "@/lib/anonymise"
import { useWorkbench } from "@/lib/store"
import type { ResidentFile } from "@/lib/types"

function kind(file: ResidentFile) {
  const ext = file.fileName.split(".").pop()?.toLowerCase() ?? ""
  if (file.mimeType === "application/pdf" || ext === "pdf") return "pdf"
  if (file.mimeType.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "bmp"].includes(ext)) {
    return "image"
  }
  if (file.previewHtml) return "html"
  return "other"
}

function safeHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
}

export function DocumentPane({ file }: { file: ResidentFile }) {
  return <DocumentBody key={file.id} file={file} />
}

function DocumentBody({ file }: { file: ResidentFile }) {
  const { updateFile } = useWorkbench()
  const [tab, setTab] = useState<"original" | "ocr">("original")
  const [editing, setEditing] = useState(false)
  const preview = kind(file)
  const anonymised = anonymiseExtract(file.extractText, file.fileName)

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#101426]">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2">
        <TabButton active={tab === "original"} onClick={() => setTab("original")}>
          Original document
        </TabButton>
        <TabButton active={tab === "ocr"} onClick={() => setTab("ocr")}>
          Anonymised OCR text
        </TabButton>
        <p className="ml-auto truncate text-xs text-indigo-100/80">{file.fileName}</p>
      </div>
      <div className="min-h-0 flex-1">
        {tab === "original" ? (
          preview === "pdf" ? (
            <iframe
              title={`Original ${file.fileName}`}
              src={`/api/files/${file.id}`}
              className="h-full w-full bg-white"
            />
          ) : preview === "image" ? (
            <div className="flex h-full items-center justify-center overflow-auto bg-slate-900 p-4">
              {/* The uploaded scan is the preview. The browser loads it from this workstation. */}
              {/* User uploads are served by the local API and are not static images. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/files/${file.id}`}
                alt={file.fileName}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ) : preview === "html" ? (
            <div className="h-full overflow-auto bg-white p-6 text-sm leading-6 text-slate-800">
              <div dangerouslySetInnerHTML={{ __html: safeHtml(file.previewHtml) }} />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-indigo-100">
              <p>
                This file type does not embed in the preview. Open the anonymised extract, or download the original from the caseload.
              </p>
            </div>
          )
        ) : (
          <div className="flex h-full flex-col gap-3 overflow-auto bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-bold tracking-wide text-[#0073ea] uppercase">
                Anonymised OCR text extract
              </p>
              <button
                type="button"
                className="text-xs font-bold text-[#0073ea]"
                onClick={() => setEditing((value) => !value)}
              >
                {editing ? "Hide source extract" : "Edit source extract"}
              </button>
            </div>
            <p className="text-xs text-slate-500">
              {file.extractEngine
                ? `Read with ${file.extractEngine}.`
                : "No extract engine recorded."}{" "}
              Emails, phone numbers, National Insurance numbers, and the name in the file title are replaced here.
            </p>
            {file.extractError ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{file.extractError}</p>
            ) : null}
            <pre className="min-h-40 flex-1 overflow-auto rounded-xl bg-slate-50 p-4 text-sm leading-6 whitespace-pre-wrap text-slate-800">
              {anonymised.trim() || "No text was read from this file. The original stays in the other tab."}
            </pre>
            {editing ? (
              <label className="block text-xs font-bold tracking-wide text-slate-500 uppercase">
                Source extract
                <textarea
                  aria-label="Source extract"
                  value={file.extractText}
                  onChange={(event) => updateFile(file.id, { extractText: event.target.value })}
                  className="mt-1 min-h-40 w-full rounded-xl border border-slate-200 p-3 text-sm font-normal normal-case"
                />
              </label>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap ${
        active ? "bg-white text-[#1c1f4a]" : "text-indigo-100 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  )
}
