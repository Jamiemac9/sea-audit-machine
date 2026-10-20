import { residentDocuments, type WrCode } from "@/lib/documents"

export const RUBRIC_SCORES = ["Pass", "Partial", "Fail", "N/A"] as const

export type RubricScore = (typeof RUBRIC_SCORES)[number] | ""

export type RubricQuestion = {
  id: string
  projectId: string
  prompt: string
  defaultPrompt: string
  source: "standard" | "custom"
  wrCode: WrCode | null
}

export type RubricMark = {
  score: RubricScore
  note: string
}

export function standardQuestions(projectId: string): RubricQuestion[] {
  return residentDocuments.map((document) => {
    const prompt = `${document.code} ${document.title}. ${document.checks.join(" ")}`
    return {
      id: `${projectId}:${document.code}`,
      projectId,
      prompt,
      defaultPrompt: prompt,
      source: "standard",
      wrCode: document.code,
    }
  })
}

export function emptyMark(): RubricMark {
  return { score: "", note: "" }
}
