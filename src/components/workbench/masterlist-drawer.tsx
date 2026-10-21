"use client"

import { useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { RUBRIC_SECTIONS, type RubricSection } from "@/lib/rubric-content"

export function MasterlistDrawer({
  sectionId,
  open,
  onOpenChange,
  onInsert,
}: {
  sectionId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onInsert: (sectionId: string, text: string) => void
}) {
  const section = RUBRIC_SECTIONS.find((item) => item.id === sectionId) ?? RUBRIC_SECTIONS[0]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:!max-w-xl">
        <SheetHeader>
          <SheetTitle>Masterlist statements</SheetTitle>
          <p className="text-sm text-slate-600">
            Fill each [insert example], then insert the sentence into {section.title}. Feedback tiers stay separate from the Gold, Green, Amber, or Red score.
          </p>
        </SheetHeader>
        <div className="space-y-3 px-4 pb-6">
          {section.statements.map((statement) => (
            <StatementCard
              key={statement.id}
              template={statement.template}
              onInsert={(text) => onInsert(section.id, text)}
            />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function StatementCard({
  template,
  onInsert,
}: {
  template: string
  onInsert: (text: string) => void
}) {
  const parts = template.split("[insert example]")
  const [examples, setExamples] = useState<string[]>(() => parts.slice(1).map(() => ""))
  const text = parts
    .map((part, index) => {
      if (index === parts.length - 1) return part
      const example = examples[index]?.trim()
      return `${part}${example || "[insert example]"}`
    })
    .join("")

  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-sm leading-6 text-slate-800">
        {parts[0]}
        {parts.slice(1).map((part, index) => (
          <span key={`${part}-${index}`}>
            <input
              aria-label="Insert example"
              value={examples[index] ?? ""}
              placeholder="insert example"
              onChange={(event) =>
                setExamples((current) =>
                  current.map((value, valueIndex) =>
                    valueIndex === index ? event.target.value : value,
                  ),
                )
              }
              className="mx-1 inline-block h-8 min-w-[180px] rounded-md border border-slate-300 bg-white px-2 text-sm"
            />
            {part}
          </span>
        ))}
      </p>
      <button
        type="button"
        className="mt-3 inline-flex h-8 items-center rounded-full bg-[#0073ea] px-3 text-xs font-bold whitespace-nowrap text-white"
        onClick={() => onInsert(text)}
      >
        Insert statement
      </button>
    </article>
  )
}

export type { RubricSection }
