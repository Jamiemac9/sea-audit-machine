"use client"

import { useState } from "react"
import { InlineText } from "@/components/workbench/inline-field"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useWorkbench } from "@/lib/workbench"

export function RubricSettingsView() {
  const {
    project,
    projects,
    setProjectId,
    questions,
    updateQuestion,
    restoreQuestion,
    addQuestion,
    removeQuestion,
  } = useWorkbench()
  const [draft, setDraft] = useState("")
  const list = questions.filter((question) => question.projectId === project.id)

  function commitDraft() {
    const prompt = draft.trim()
    if (!prompt) return
    addQuestion(project.id, prompt)
    setDraft("")
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            Rubric
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Manage rubric settings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Edit a question in place, or add a bespoke check for this project.
            Standard WR wording can be restored.
          </p>
        </div>
        <select
          aria-label="Rubric project"
          className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm sm:w-64"
          value={project.id}
          onChange={(event) => setProjectId(event.target.value)}
        >
          {projects.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      <Card className="shadow-sm ring-foreground/8">
        <CardHeader className="border-b">
          <CardTitle>{project.name}</CardTitle>
          <CardDescription>
            {list.length} questions. Custom questions apply only to this project.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-4">
          {list.map((question) => (
            <div key={question.id} className="grid gap-2 border-b border-border pb-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
                  {question.source === "custom" ? "Custom" : question.wrCode}
                </p>
                <div className="flex gap-2">
                  {question.source === "standard" &&
                  question.prompt !== question.defaultPrompt ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => restoreQuestion(question.id)}
                    >
                      Restore wording
                    </Button>
                  ) : null}
                  {question.source === "custom" ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeQuestion(question.id)}
                    >
                      Remove question
                    </Button>
                  ) : null}
                </div>
              </div>
              <InlineText
                multiline
                value={question.prompt}
                ariaLabel={`Rubric question ${question.wrCode ?? "custom"}`}
                onCommit={(prompt) =>
                  updateQuestion(question.id, prompt || question.prompt)
                }
              />
            </div>
          ))}
          <label className="grid gap-2 text-sm">
            <span className="font-medium">Add a bespoke question</span>
            <textarea
              aria-label="New rubric question"
              className="min-h-16 rounded-lg border border-input px-2.5 py-2"
              placeholder="Write the check this RP asked for"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <Button className="w-fit" onClick={commitDraft} disabled={!draft.trim()}>
              Add question
            </Button>
          </label>
        </CardContent>
      </Card>
    </div>
  )
}
