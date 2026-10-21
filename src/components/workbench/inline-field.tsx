"use client"

import { useState } from "react"
import { formatAuditDate } from "@/lib/format"
import { cn } from "cn"

type InlineTextProps = {
  value: string
  onCommit: (value: string) => void
  ariaLabel: string
  placeholder?: string
  multiline?: boolean
  type?: "text" | "date"
  className?: string
}

export function InlineText({
  value,
  onCommit,
  ariaLabel,
  placeholder = "Click to edit",
  multiline = false,
  type = "text",
  className,
}: InlineTextProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [source, setSource] = useState(value)

  if (value !== source && !editing) {
    setSource(value)
    setDraft(value)
  }

  function commit() {
    setEditing(false)
    if (draft !== value) onCommit(draft)
  }

  function cancel() {
    setDraft(value)
    setEditing(false)
  }

  if (editing) {
    const fieldClass =
      "w-full rounded-lg border border-input bg-background px-2 py-1 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    if (multiline) {
      return (
        <textarea
          aria-label={ariaLabel}
          autoFocus
          className={cn(fieldClass, "min-h-16", className)}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Escape") cancel()
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) commit()
          }}
        />
      )
    }
    return (
      <input
        aria-label={ariaLabel}
        autoFocus
        type={type}
        className={cn(fieldClass, "h-8", className)}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit()
          if (event.key === "Escape") cancel()
        }}
      />
    )
  }

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={() => {
        setDraft(value)
        setEditing(true)
      }}
      className={cn(
        "block w-full rounded-md px-1 py-0.5 text-left hover:bg-muted",
        !value && "text-muted-foreground",
        className,
      )}
    >
      {(type === "date" && value ? formatAuditDate(value) : value) || placeholder}
    </button>
  )
}
