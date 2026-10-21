"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import type { PillOption } from "@/lib/pills"

export function PillSelect<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: readonly PillOption<T>[]
  onChange: (value: T) => void
  label: string
}) {
  const [open, setOpen] = useState(false)
  const [box, setBox] = useState({ top: 0, left: 0, width: 220 })
  const current = options.find((option) => option.value === value) ?? options[0]

  return (
    <>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="inline-flex h-8 min-w-[180px] shrink-0 items-center justify-between gap-4 rounded-full px-3 text-xs font-bold whitespace-nowrap shadow-sm"
        style={{ backgroundColor: current.bg, color: current.fg }}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect()
          setBox({
            top: rect.bottom + 6,
            left: rect.left,
            width: Math.max(rect.width, 220),
          })
          setOpen((next) => !next)
        }}
      >
        <span>{current.label}</span>
        <ChevronDown className="size-3.5 shrink-0" />
      </button>
      {open ? (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="listbox"
            aria-label={label}
            className="fixed z-50 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
            style={{ top: box.top, left: box.left, minWidth: box.width }}
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === value}
                className="flex w-full rounded-lg p-1 text-left hover:bg-slate-50"
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
              >
                <span
                  className="inline-flex min-w-[180px] items-center justify-center rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap"
                  style={{ backgroundColor: option.bg, color: option.fg }}
                >
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </>
  )
}
