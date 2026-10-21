"use client"

import { InlineText } from "@/components/workbench/inline-field"
import { RUBRIC_SCORES, emptyMark, type RubricScore } from "@/lib/rubric"
import { useWorkbench } from "@/lib/workbench"

export function RubricEditor({
  fileId,
  contained = true,
}: {
  fileId: string
  contained?: boolean
}) {
  const { file, questions, setMark } = useWorkbench()
  if (!file || file.id !== fileId) return null
  const list = questions.filter((question) => question.projectId === file.projectId)

  return (
    <div
      className={
        contained
          ? "flex max-h-[32rem] flex-col gap-3 overflow-y-auto pr-1"
          : "flex flex-col gap-3"
      }
    >
      {list.map((question) => {
        const mark = file.marks[question.id] ?? emptyMark()
        return (
          <div key={question.id} className="grid gap-2 border-b border-border pb-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <select
                aria-label={`Rubric score for ${question.prompt}`}
                className="h-8 shrink-0 rounded-lg border border-input bg-background px-2 text-sm"
                value={mark.score}
                onChange={(event) =>
                  setMark(file.id, question.id, {
                    score: event.target.value as RubricScore,
                  })
                }
              >
                <option value="">Unset</option>
                {RUBRIC_SCORES.map((score) => (
                  <option key={score} value={score}>
                    {score}
                  </option>
                ))}
              </select>
              <p className="text-sm">{question.prompt}</p>
            </div>
            <InlineText
              multiline
              value={mark.note}
              placeholder="Add a practitioner observation"
              ariaLabel={`Observation for ${question.prompt}`}
              onCommit={(note) => setMark(file.id, question.id, { note })}
            />
          </div>
        )
      })}
    </div>
  )
}
