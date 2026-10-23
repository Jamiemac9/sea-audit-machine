import { and, desc, eq, isNull, sql } from "drizzle-orm"
import { db } from "@/db"
import {
  documents,
  findings,
  goals,
  managingAgents,
  residentFiles,
  risks,
  rounds,
  sessions,
} from "@/db/schema"

export async function listAgentsWithRounds() {
  const agents = await db
    .select()
    .from(managingAgents)
    .orderBy(managingAgents.name)

  const allRounds = await db.select().from(rounds).orderBy(desc(rounds.createdAt))

  const counts = await db
    .select({
      roundId: residentFiles.roundId,
      count: sql<number>`count(*)`.as("count"),
    })
    .from(residentFiles)
    .groupBy(residentFiles.roundId)

  const countByRound = new Map(counts.map((row) => [row.roundId, row.count]))

  return agents.map((agent) => ({
    agent,
    rounds: allRounds
      .filter((round) => round.managingAgentId === agent.id)
      .map((round) => ({
        ...round,
        residentFileCount: countByRound.get(round.id) ?? 0,
      })),
  }))
}

export async function getRound(roundId: string) {
  const [row] = await db
    .select({ round: rounds, agent: managingAgents })
    .from(rounds)
    .innerJoin(managingAgents, eq(rounds.managingAgentId, managingAgents.id))
    .where(eq(rounds.id, roundId))
    .limit(1)
  return row ?? null
}

export async function getRoundDetail(roundId: string) {
  const header = await getRound(roundId)
  if (!header) return null

  const files = await db
    .select()
    .from(residentFiles)
    .where(eq(residentFiles.roundId, roundId))
    .orderBy(residentFiles.residentName)

  const docs = await db
    .select()
    .from(documents)
    .where(eq(documents.roundId, roundId))
    .orderBy(desc(documents.createdAt))

  const unclassified = docs.filter(
    (doc) => doc.residentFileId === null || doc.wrCode === null
  )

  return {
    ...header,
    residentFiles: files.map((file) => ({
      ...file,
      documentCount: docs.filter((doc) => doc.residentFileId === file.id).length,
    })),
    documents: docs,
    unclassified,
  }
}

export async function getResidentFile(residentFileId: string) {
  const [row] = await db
    .select({
      file: residentFiles,
      round: rounds,
      agent: managingAgents,
    })
    .from(residentFiles)
    .innerJoin(rounds, eq(residentFiles.roundId, rounds.id))
    .innerJoin(managingAgents, eq(rounds.managingAgentId, managingAgents.id))
    .where(eq(residentFiles.id, residentFileId))
    .limit(1)

  if (!row) return null

  const [docs, riskRows, goalRows, sessionRows, findingRows] = await Promise.all(
    [
      db
        .select()
        .from(documents)
        .where(eq(documents.residentFileId, residentFileId))
        .orderBy(documents.wrCode),
      db.select().from(risks).where(eq(risks.residentFileId, residentFileId)),
      db.select().from(goals).where(eq(goals.residentFileId, residentFileId)),
      db
        .select()
        .from(sessions)
        .where(eq(sessions.residentFileId, residentFileId))
        .orderBy(sessions.sessionDate),
      db
        .select()
        .from(findings)
        .where(eq(findings.residentFileId, residentFileId))
        .orderBy(findings.stream),
    ]
  )

  return {
    ...row,
    documents: docs,
    risks: riskRows,
    goals: goalRows,
    sessions: sessionRows,
    findings: findingRows,
  }
}

export async function countUnclassified(roundId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)`.as("count") })
    .from(documents)
    .where(and(eq(documents.roundId, roundId), isNull(documents.residentFileId)))
  return row?.count ?? 0
}
