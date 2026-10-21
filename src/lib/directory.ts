import { CLIENT_TOKEN } from "@/lib/documents"

export type DirectoryContact = {
  role: string
  name: string
  email: string
  phone: string
}

export type RentScheduleRow = {
  id: string
  propertyAddress: string
  roomOrUnit: string
  weeklyRent: number
  weeklyServiceCharge: number
  effectiveFrom: string
}

export type RegisteredProvider = {
  id: string
  name: string
  headOfficeLocation: string
  region: string
  contacts: DirectoryContact[]
  linkedManagingAgentIds: string[]
  defaultSlaTerms: string
  schemes: { id: string; name: string; location: string }[]
}

export type ManagingAgentProfile = {
  id: string
  companyName: string
  registeredAddress: string
  primaryContactName: string
  email: string
  phone: string
  propertyAccessContact: string
  activeStatus: "Active" | "Not Active"
  assignedProperties: string[]
  rentSchedule: RentScheduleRow[]
  linkedRpIds: string[]
}

export const seedRegisteredProviders: RegisteredProvider[] = [
  {
    id: "rp-harbour",
    name: "Harbour & Vale Housing",
    headOfficeLocation: "Birmingham",
    region: "Midlands",
    contacts: [
      {
        role: "Director of Support",
        name: "Priya Nair",
        email: "priya.nair@harbourvale.example",
        phone: "0121 555 0140",
      },
      {
        role: "Head of Compliance",
        name: "James Okeke",
        email: "james.okeke@harbourvale.example",
        phone: "0121 555 0141",
      },
    ],
    linkedManagingAgentIds: ["ma-chantry", "ma-best"],
    defaultSlaTerms:
      "Document packs within 10 working days. Remediation responses within 5 working days.",
    schemes: [
      { id: "rq", name: "Riverside Quarter", location: "Birmingham" },
      { id: "de", name: "Docklands Estate", location: "Midlands" },
      { id: "om", name: "Old Mill Court", location: "Midlands" },
    ],
  },
  {
    id: "rp-northshore",
    name: "Northshore Community Homes",
    headOfficeLocation: "Manchester",
    region: "North West",
    contacts: [
      {
        role: "Director of Support",
        name: "Elena Frost",
        email: "elena.frost@northshore.example",
        phone: "0161 555 0200",
      },
      {
        role: "Head of Compliance",
        name: "Omar Hassan",
        email: "omar.hassan@northshore.example",
        phone: "0161 555 0201",
      },
    ],
    linkedManagingAgentIds: ["ma-chantry", "ma-lumen"],
    defaultSlaTerms:
      "Evidence uploads within 7 working days. Catch-up calls within 48 hours of Amber/Red ratings.",
    schemes: [
      { id: "bp", name: "Beacon Park", location: "Manchester" },
      { id: "hw", name: "Harbour Walk", location: "North West" },
    ],
  },
  {
    id: "rp-meridian",
    name: "Meridian Living",
    headOfficeLocation: "National",
    region: "National",
    contacts: [
      {
        role: "Director of Support",
        name: "Sophie Lang",
        email: "sophie.lang@meridian.example",
        phone: "020 5550 3300",
      },
      {
        role: "Head of Compliance",
        name: "Daniel Reed",
        email: "daniel.reed@meridian.example",
        phone: "020 5550 3301",
      },
    ],
    linkedManagingAgentIds: ["ma-best", "ma-lumen"],
    defaultSlaTerms:
      "National portfolio SLA: packs in 14 days; Big 8 certificates refreshed before expiry + 30 days.",
    schemes: [
      { id: "cw", name: "Canal Wharf", location: "London" },
      { id: "sg", name: "South Gate", location: "National" },
    ],
  },
]

export const seedManagingAgents: ManagingAgentProfile[] = [
  {
    id: "ma-chantry",
    companyName: "Chantry Housing",
    registeredAddress: "14 Corporation Street, Birmingham, B4 6TB",
    primaryContactName: "Natalie Brooks",
    email: "natalie.brooks@chantry.example",
    phone: "0121 555 1100",
    propertyAccessContact: "Site desk — access@chantry.example",
    activeStatus: "Active",
    assignedProperties: [
      "226 Wright Road, Birmingham",
      "18 Canal Side, Birmingham",
      "Beacon Park Block A, Manchester",
    ],
    linkedRpIds: ["rp-harbour", "rp-northshore"],
    rentSchedule: [
      {
        id: "rs1",
        propertyAddress: "226 Wright Road, Birmingham",
        roomOrUnit: "Room 3",
        weeklyRent: 185.5,
        weeklyServiceCharge: 42.0,
        effectiveFrom: "2026-04-01",
      },
      {
        id: "rs2",
        propertyAddress: "18 Canal Side, Birmingham",
        roomOrUnit: "Room 1",
        weeklyRent: 178.0,
        weeklyServiceCharge: 39.5,
        effectiveFrom: "2026-04-01",
      },
      {
        id: "rs3",
        propertyAddress: "Beacon Park Block A, Manchester",
        roomOrUnit: "Flat 2B",
        weeklyRent: 192.0,
        weeklyServiceCharge: 45.0,
        effectiveFrom: "2026-04-01",
      },
    ],
  },
  {
    id: "ma-best",
    companyName: "Best Choice Housing",
    registeredAddress: "88 High Street, Solihull, B91 3TA",
    primaryContactName: "Marcus Webb",
    email: "marcus.webb@bestchoice.example",
    phone: "0121 555 2200",
    propertyAccessContact: "Marcus Webb — mobile on file",
    activeStatus: "Active",
    assignedProperties: [
      "9 Mill Lane, Midlands",
      "South Gate Unit 4, National",
      "Canal Wharf House 2, London",
    ],
    linkedRpIds: ["rp-harbour", "rp-meridian"],
    rentSchedule: [
      {
        id: "rs4",
        propertyAddress: "9 Mill Lane, Midlands",
        roomOrUnit: "Room 5",
        weeklyRent: 170.0,
        weeklyServiceCharge: 38.0,
        effectiveFrom: "2026-04-01",
      },
      {
        id: "rs5",
        propertyAddress: "South Gate Unit 4, National",
        roomOrUnit: "Room 2",
        weeklyRent: 165.0,
        weeklyServiceCharge: 36.5,
        effectiveFrom: "2026-04-01",
      },
    ],
  },
  {
    id: "ma-lumen",
    companyName: "Lumen Estates",
    registeredAddress: "2 Quayside, Manchester, M3 4AE",
    primaryContactName: "Hannah Cole",
    email: "hannah.cole@lumen.example",
    phone: "0161 555 4400",
    propertyAccessContact: "Estates team — estates@lumen.example",
    activeStatus: "Not Active",
    assignedProperties: ["Harbour Walk House 1, North West"],
    linkedRpIds: ["rp-northshore", "rp-meridian"],
    rentSchedule: [
      {
        id: "rs6",
        propertyAddress: "Harbour Walk House 1, North West",
        roomOrUnit: "Room 4",
        weeklyRent: 160.0,
        weeklyServiceCharge: 34.0,
        effectiveFrom: "2025-10-01",
      },
    ],
  },
]

export function rpDisplayName(rp: RegisteredProvider | undefined) {
  return rp?.name ?? CLIENT_TOKEN
}

export function findManagingAgentByName(
  agents: ManagingAgentProfile[],
  name: string,
) {
  const needle = name.trim().toLowerCase()
  return agents.find((agent) => agent.companyName.toLowerCase() === needle)
}

export function rentScheduleForAddress(
  agent: ManagingAgentProfile | undefined,
  addressHint: string,
) {
  if (!agent) return null
  const hint = addressHint.toLowerCase()
  return (
    agent.rentSchedule.find((row) =>
      row.propertyAddress.toLowerCase().includes(hint),
    ) ??
    agent.rentSchedule[0] ??
    null
  )
}
