"use client"

import { useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  RUBRIC_SCORES,
  RUBRIC_WEIGHTS,
  formatScore,
  rubricOutcome,
  rubricPillars,
  rubricWeightLabel,
  type RubricItem,
  type RubricScore,
} from "@/lib/audit"
import { useWorkbench } from "@/lib/workbench"
import { cn } from "cn"

const scoreStyles: Record<RubricScore, string> = {
  Pass: "bg-emerald-600 text-white hover:bg-emerald-600",
  Partial: "bg-amber-500 text-amber-950 hover:bg-amber-500",
  Fail: "bg-red-600 text-white hover:bg-red-600",
  "N/A": "bg-foreground text-background hover:bg-foreground",
}

type Draft = {
  pillarId: string
  title: string
  question: string
  weight: string
}

function emptyDraft(pillarId: string): Draft {
  return { pillarId, title: "", question: "", weight: "3" }
}

function draftFromItem(item: RubricItem): Draft {
  return {
    pillarId: item.pillarId,
    title: item.title,
    question: item.question,
    weight: String(item.weight),
  }
}

export function RubricView() {
  const {
    clientName,
    schemeName,
    rubricItems,
    rubricMarks,
    setRubricScore,
    setRubricNote,
    addRubricItem,
    updateRubricItem,
    deleteRubricItem,
  } = useWorkbench()
  const [editor, setEditor] = useState<
    { mode: "add"; draft: Draft } | { mode: "edit"; itemId: string; draft: Draft } | null
  >(null)
  const [pendingDelete, setPendingDelete] = useState<RubricItem | null>(null)
  const [formError, setFormError] = useState("")

  const overall = rubricOutcome(rubricItems, rubricMarks)

  function openAdd(pillarId: string) {
    setFormError("")
    setEditor({ mode: "add", draft: emptyDraft(pillarId) })
  }

  function saveDraft() {
    if (!editor) return
    const title = editor.draft.title.trim()
    const question = editor.draft.question.trim()
    const weight = Number(editor.draft.weight)
    if (title.length < 3) {
      setFormError("Enter an item title of at least 3 characters.")
      return
    }
    if (question.length < 8) {
      setFormError("Enter the question the practitioner will test.")
      return
    }
    if (!RUBRIC_WEIGHTS.includes(weight as (typeof RUBRIC_WEIGHTS)[number])) {
      setFormError("Choose a weight from 1 to 5.")
      return
    }
    const input = {
      pillarId: editor.draft.pillarId,
      title,
      question,
      weight,
    }
    if (editor.mode === "add") addRubricItem(input)
    else updateRubricItem(editor.itemId, input)
    setEditor(null)
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            Supported housing
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Quality assurance rubric
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Statutory compliance test for {clientName}, {schemeName}. Score
            each item Pass, Partial, Fail, or N/A and record the practitioner
            note beside it. Weights change how the item moves the pillar result.
          </p>
        </div>
        <Card size="sm" className="shadow-sm ring-foreground/8 lg:min-w-56">
          <CardHeader>
            <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
              Weighted result
            </p>
            <p className="mt-1 text-3xl font-semibold tabular-nums">
              {overall.percent === null ? "—" : `${formatScore(overall.percent)}%`}
            </p>
            <CardDescription>
              {overall.scored} of {overall.total} items scored. N/A is excluded.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {rubricPillars.map((pillar, index) => {
        const items = rubricItems.filter((item) => item.pillarId === pillar.id)
        const outcome = rubricOutcome(items, rubricMarks)
        return (
          <section key={pillar.id} aria-labelledby={`pillar-${pillar.id}`}>
            <Card className="shadow-sm ring-foreground/8">
              <CardHeader className="border-b">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                      Pillar {index + 1}
                    </p>
                    <CardTitle id={`pillar-${pillar.id}`} className="mt-1">
                      {pillar.title}
                    </CardTitle>
                    <CardDescription className="mt-1 max-w-3xl">
                      {pillar.summary}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-muted-foreground tabular-nums">
                      {outcome.percent === null
                        ? "Not scored"
                        : `${formatScore(outcome.percent)}%`}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAdd(pillar.id)}
                    >
                      <Plus />
                      Add item
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 pt-4">
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No items in this pillar. Add one to score it.
                  </p>
                ) : (
                  items.map((item) => {
                    const mark = rubricMarks.find(
                      (entry) => entry.itemId === item.id
                    )
                    return (
                      <article
                        key={item.id}
                        className="rounded-xl border border-border bg-card p-4"
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <h3 className="text-sm font-medium">{item.title}</h3>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                              {item.question}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Label
                              htmlFor={`weight-${item.id}`}
                              className="text-xs text-muted-foreground"
                            >
                              Weight
                            </Label>
                            <Select
                              value={String(item.weight)}
                              onValueChange={(value) => {
                                if (typeof value !== "string") return
                                updateRubricItem(item.id, {
                                  pillarId: item.pillarId,
                                  title: item.title,
                                  question: item.question,
                                  weight: Number(value),
                                })
                              }}
                            >
                              <SelectTrigger
                                id={`weight-${item.id}`}
                                className="w-40 bg-background"
                                aria-label={`Weight for ${item.title}`}
                              >
                                <SelectValue>
                                  {(value) =>
                                    typeof value === "string"
                                      ? `${value} · ${rubricWeightLabel(Number(value))}`
                                      : "Weight"
                                  }
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {RUBRIC_WEIGHTS.map((weight) => (
                                  <SelectItem key={weight} value={String(weight)}>
                                    {weight} · {rubricWeightLabel(weight)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setFormError("")
                                setEditor({
                                  mode: "edit",
                                  itemId: item.id,
                                  draft: draftFromItem(item),
                                })
                              }}
                            >
                              <Pencil />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPendingDelete(item)}
                            >
                              <Trash2 />
                              Delete
                            </Button>
                          </div>
                        </div>
                        <div className="mt-4 grid gap-3 lg:grid-cols-[16rem_minmax(0,1fr)]">
                          <div
                            role="group"
                            aria-label={`Score for ${item.title}`}
                            className="grid grid-cols-4 gap-1.5 lg:grid-cols-2"
                          >
                            {RUBRIC_SCORES.map((score) => {
                              const selected = mark?.score === score
                              return (
                                <Button
                                  key={score}
                                  type="button"
                                  size="sm"
                                  variant={selected ? "default" : "outline"}
                                  aria-pressed={selected}
                                  className={cn(
                                    selected && scoreStyles[score]
                                  )}
                                  onClick={() => setRubricScore(item.id, score)}
                                >
                                  {score}
                                </Button>
                              )
                            })}
                          </div>
                          <Textarea
                            aria-label={`Practitioner notes for ${item.title}`}
                            placeholder="Practitioner notes"
                            value={mark?.note ?? ""}
                            onChange={(event) =>
                              setRubricNote(item.id, event.target.value)
                            }
                          />
                        </div>
                      </article>
                    )
                  })
                )}
              </CardContent>
            </Card>
          </section>
        )
      })}

      <Dialog
        open={editor !== null}
        onOpenChange={(open) => {
          if (!open) setEditor(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editor?.mode === "edit" ? "Edit rubric item" : "Add rubric item"}
            </DialogTitle>
            <DialogDescription>
              Items stay on this workstation and apply to every client. Scores
              and notes stay with the active client and scheme.
            </DialogDescription>
          </DialogHeader>
          {editor ? (
            <form
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault()
                saveDraft()
              }}
            >
              <div className="grid gap-1.5">
                <Label htmlFor="rubric-pillar">Pillar</Label>
                <Select
                  value={editor.draft.pillarId}
                  onValueChange={(value) => {
                    if (typeof value !== "string") return
                    setEditor({
                      ...editor,
                      draft: { ...editor.draft, pillarId: value },
                    })
                  }}
                >
                  <SelectTrigger id="rubric-pillar" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {rubricPillars.map((pillar) => (
                      <SelectItem key={pillar.id} value={pillar.id}>
                        {pillar.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="rubric-title">Title</Label>
                <Input
                  id="rubric-title"
                  value={editor.draft.title}
                  onChange={(event) =>
                    setEditor({
                      ...editor,
                      draft: { ...editor.draft, title: event.target.value },
                    })
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="rubric-question">Question</Label>
                <Textarea
                  id="rubric-question"
                  value={editor.draft.question}
                  onChange={(event) =>
                    setEditor({
                      ...editor,
                      draft: { ...editor.draft, question: event.target.value },
                    })
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="rubric-weight">Weight</Label>
                <Select
                  value={editor.draft.weight}
                  onValueChange={(value) => {
                    if (typeof value !== "string") return
                    setEditor({
                      ...editor,
                      draft: { ...editor.draft, weight: value },
                    })
                  }}
                >
                  <SelectTrigger id="rubric-weight" className="w-full">
                    <SelectValue>
                      {(value) =>
                        typeof value === "string"
                          ? `${value} · ${rubricWeightLabel(Number(value))}`
                          : "Weight"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {RUBRIC_WEIGHTS.map((weight) => (
                      <SelectItem key={weight} value={String(weight)}>
                        {weight} · {rubricWeightLabel(weight)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {formError ? (
                <p className="text-sm text-destructive" role="alert">
                  {formError}
                </p>
              ) : null}
              <DialogFooter>
                <Button type="submit">
                  {editor.mode === "edit" ? "Save item" : "Add item"}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete rubric item</DialogTitle>
            <DialogDescription>
              {pendingDelete
                ? `Remove “${pendingDelete.title}” and its scores and notes from this workstation.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Keep item
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (pendingDelete) deleteRubricItem(pendingDelete.id)
                setPendingDelete(null)
              }}
            >
              Delete item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
