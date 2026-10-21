import type { AuditScore, ManagingAgent, ResidentFile } from "@/lib/types"
import { dayOf, localDay } from "@/lib/text"

export const SCORE_RANK: Record<AuditScore, number> = {
  unscored: 0,
  gold: 1,
  green: 2,
  amber: 3,
  red: 4,
}

export const XP_BY_SCORE: Record<AuditScore, number> = {
  unscored: 0,
  gold: 100,
  green: 70,
  amber: 40,
  red: 20,
}

export function rollupScore(scores: AuditScore[]): AuditScore {
  const rated = scores.filter((score) => score !== "unscored")
  if (rated.length === 0) return "unscored"
  return rated.reduce((worst, score) =>
    SCORE_RANK[score] > SCORE_RANK[worst] ? score : worst,
  )
}

export function isFlaggedScore(score: AuditScore) {
  return score === "amber" || score === "red"
}

export function completionPercent(files: ResidentFile[], agents: ManagingAgent[]) {
  if (files.length > 0) {
    const done = files.filter((file) => file.score !== "unscored").length
    return Math.round((done / files.length) * 100)
  }
  if (agents.length === 0) return 0
  const done = agents.filter((agent) => agent.crmStatus === "Audit Complete").length
  return Math.round((done / agents.length) * 100)
}

export function filesAuditedOn(files: ResidentFile[], day = localDay()) {
  return files.filter(
    (file) => file.score !== "unscored" && dayOf(file.scoredAt) === day,
  ).length
}

export function xpTotal(files: ResidentFile[]) {
  return files.reduce((sum, file) => sum + XP_BY_SCORE[file.score], 0)
}

export function scoreDistribution(scores: AuditScore[]) {
  const keys: AuditScore[] = ["gold", "green", "amber", "red", "unscored"]
  const counts = {
    gold: 0,
    green: 0,
    amber: 0,
    red: 0,
    unscored: 0,
  }
  for (const score of scores) counts[score] += 1
  const total = scores.length
  return keys.map((key) => ({
    key,
    count: counts[key],
    pct: total === 0 ? (key === "unscored" ? 100 : 0) : (counts[key] / total) * 100,
  }))
}

export function syncOverall(
  agents: ManagingAgent[],
  files: ResidentFile[],
  agentId: string,
) {
  const agentFiles = files.filter((file) => file.agentId === agentId)
  if (agentFiles.length === 0) return agents
  const overall = rollupScore(agentFiles.map((file) => file.score))
  return agents.map((agent) =>
    agent.id === agentId ? { ...agent, overallScore: overall } : agent,
  )
}
