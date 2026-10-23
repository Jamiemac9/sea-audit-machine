/**
 * Synthetic seed data.
 *
 * Every name, address and line of text below is invented. No real resident,
 * managing agent, property or document text may ever appear in this file — it is
 * committed to the repository. See AGENTS.md.
 *
 * The data deliberately contains the defects the check engine looks for, so the
 * rules can be developed and demonstrated without touching a real round:
 *
 *   - an arithmetically impossible risk score (11)
 *   - a risk scored 5 or above with no Risk Management Plan
 *   - a resident carrying fewer than five active goals
 *   - a goal with no action plan, and a goal no session addresses
 *   - a session record copied verbatim into a second resident's file
 *   - a week falling under the one-hour minimum once room checks are excluded
 */

import { db } from "../src/db"
import {
  findings,
  goals,
  managingAgents,
  residentFiles,
  risks,
  rounds,
  sessions,
} from "../src/db/schema"

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

// The same paragraph appears in two residents' files. Rule 9 should catch it.
const DUPLICATED_NOTE =
  "Discussed the weekly budget and looked at the online banking app together. " +
  "Agreed to review the shopping list at the next session and to keep receipts " +
  "in the folder provided."

async function main() {
  await db.delete(findings)
  await db.delete(sessions)
  await db.delete(goals)
  await db.delete(risks)
  await db.delete(residentFiles)
  await db.delete(rounds)
  await db.delete(managingAgents)

  const [agent] = await db
    .insert(managingAgents)
    .values({
      name: "Northgate Housing Partners (sample)",
      contract: "Supported accommodation — support delivery",
      region: "Sample region",
      notes: "Synthetic data for development. Not a real managing agent.",
    })
    .returning()

  const [round] = await db
    .insert(rounds)
    .values({
      managingAgentId: agent.id,
      label: "Sample round — October 2026",
      auditDate: d("2026-10-20"),
      format: "FIRST_AUDIT",
      status: "CHECKING",
    })
    .returning()

  const people = await db
    .insert(residentFiles)
    .values([
      {
        roundId: round.id,
        residentName: "Avery Mountjoy (sample)",
        aliases: "Avery M\navery_mountjoy_scan",
        propertyLine1: "1 Sample Street",
        roomRef: "Room 1",
        moveInDate: d("2026-02-10"),
      },
      {
        roundId: round.id,
        residentName: "Bernard Quillfeather (sample)",
        propertyLine1: "1 Sample Street",
        roomRef: "Room 2",
        moveInDate: d("2026-03-04"),
      },
      {
        roundId: round.id,
        residentName: "Carys Ledanois (sample)",
        propertyLine1: "2 Example Road",
        roomRef: "Room 1",
        moveInDate: d("2026-08-18"),
      },
      {
        roundId: round.id,
        residentName: "Dmitri Sorokovik (sample)",
        propertyLine1: "2 Example Road",
        roomRef: "Room 2",
        moveInDate: d("2026-09-29"),
      },
    ])
    .returning()

  const [a, b, c, dd] = people

  await db.insert(risks).values([
    // Impossible on a 1-5 x 1-5 matrix.
    {
      residentFileId: a.id,
      name: "Financial hardship",
      likelihood: 3,
      severity: 4,
      score: 11,
      hasPlan: false,
    },
    // Scored 5 or above with no plan.
    {
      residentFileId: a.id,
      name: "Risk of tenancy breakdown",
      likelihood: 3,
      severity: 2,
      score: 6,
      hasPlan: false,
    },
    // Score does not match the likelihood and severity recorded above it.
    {
      residentFileId: b.id,
      name: "Social isolation",
      likelihood: 2,
      severity: 3,
      score: 9,
      hasPlan: true,
      planText:
        "Weekly contact and a referral to a community group; review monthly.",
    },
    {
      residentFileId: c.id,
      name: "Risk of hospital readmission",
      likelihood: 2,
      severity: 2,
      score: 4,
      hasPlan: false,
    },
  ])

  await db.insert(goals).values([
    { residentFileId: a.id, title: "Register with a GP", hasActionPlan: true, actionPlanText: "Complete the registration form together at the next session." },
    { residentFileId: a.id, title: "Set up a weekly budget", hasActionPlan: true, actionPlanText: "Complete an income and expenditure sheet, then a budget plan." },
    { residentFileId: a.id, title: "Apply for a college course", hasActionPlan: false },
    { residentFileId: a.id, title: "Build a daily routine", hasActionPlan: true, actionPlanText: "Agree a simple weekly plan and review it each session." },
    { residentFileId: a.id, title: "Register with a dentist", hasActionPlan: true, actionPlanText: "Identify two local practices and call them in session." },

    // Fewer than five active goals.
    { residentFileId: b.id, title: "Register with a GP", hasActionPlan: true, actionPlanText: "Complete the registration form together." },
    { residentFileId: b.id, title: "Maximise income", hasActionPlan: false },
    { residentFileId: b.id, title: "Improve cooking skills", hasActionPlan: true, actionPlanText: "Cook one oven meal alongside the resident each week." },
    { residentFileId: b.id, title: "Move on planning", hasActionPlan: true, actionPlanText: "Start a housing register application." },

    { residentFileId: c.id, title: "Register with a GP", hasActionPlan: true, actionPlanText: "Complete the registration form together." },
    { residentFileId: c.id, title: "Set up a weekly budget", hasActionPlan: true, actionPlanText: "Income and expenditure sheet first." },
    { residentFileId: c.id, title: "Volunteering placement", hasActionPlan: true, actionPlanText: "Contact two local organisations in session." },
    { residentFileId: c.id, title: "Independent living skills", hasActionPlan: true, actionPlanText: "Weekly practical task agreed with the resident." },
    { residentFileId: c.id, title: "Register with a dentist", hasActionPlan: true, actionPlanText: "Call two practices in session." },

    { residentFileId: dd.id, title: "Register with a GP", hasActionPlan: true, actionPlanText: "Complete the registration form together." },
    { residentFileId: dd.id, title: "Open a bank account", hasActionPlan: true, actionPlanText: "Gather identification documents, then apply online together." },
    { residentFileId: dd.id, title: "Set up a weekly budget", hasActionPlan: true, actionPlanText: "Income and expenditure sheet first." },
    { residentFileId: dd.id, title: "Build a daily routine", hasActionPlan: true, actionPlanText: "Agree a simple weekly plan." },
    { residentFileId: dd.id, title: "Independent living skills", hasActionPlan: true, actionPlanText: "Weekly practical task agreed with the resident." },
  ])

  await db.insert(sessions).values([
    {
      residentFileId: a.id,
      sessionDate: d("2026-09-07"),
      durationMins: 60,
      residentSigned: true,
      workerSigned: true,
      evidenceNoted: true,
      bodyText: DUPLICATED_NOTE,
    },
    {
      residentFileId: a.id,
      sessionDate: d("2026-09-14"),
      durationMins: 60,
      residentSigned: true,
      workerSigned: true,
      bodyText:
        "Worked on the college application. Resident completed the personal statement section with prompting.",
    },
    // Under the hour once the room check is excluded.
    {
      residentFileId: a.id,
      sessionDate: d("2026-09-21"),
      durationMins: 20,
      residentSigned: true,
      workerSigned: true,
      bodyText: "Brief catch up in the communal area.",
    },
    {
      residentFileId: a.id,
      sessionDate: d("2026-09-22"),
      durationMins: 45,
      isRoomCheck: true,
      bodyText: "Room check completed. Room clean and tidy.",
    },
    // Non-health missed session with no warning recorded.
    {
      residentFileId: a.id,
      sessionDate: d("2026-09-28"),
      durationMins: 10,
      attended: false,
      missedReason: "Resident was out when the worker called.",
      warningIssued: false,
    },
    // The same paragraph as Resident A's 07/09 session.
    {
      residentFileId: b.id,
      sessionDate: d("2026-09-08"),
      durationMins: 60,
      residentSigned: true,
      workerSigned: true,
      bodyText: DUPLICATED_NOTE,
    },
    {
      residentFileId: b.id,
      sessionDate: d("2026-09-15"),
      durationMins: 60,
      residentSigned: true,
      workerSigned: true,
      bodyText:
        "Cooked a meal together using the oven. Resident managed the timings with prompting.",
    },
    {
      residentFileId: c.id,
      sessionDate: d("2026-09-09"),
      durationMins: 75,
      residentSigned: true,
      workerSigned: true,
      evidenceNoted: true,
      bodyText:
        "Contacted two volunteering organisations during the session. One confirmed a start date.",
    },
    {
      residentFileId: dd.id,
      sessionDate: d("2026-10-06"),
      durationMins: 60,
      residentSigned: true,
      workerSigned: true,
      bodyText:
        "Introductory session. Went through the support plan and agreed the first week's actions.",
    },
  ])

  console.log(
    `Seeded synthetic data: 1 managing agent, 1 round, ${people.length} resident files.`
  )
}

main()
