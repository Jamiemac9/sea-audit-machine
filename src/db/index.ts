// Server-side only. Imported by route handlers, server components and the
// scripts in scripts/, so it deliberately does not import "server-only" —
// that would break the CLI scripts.
import { existsSync, mkdirSync } from "node:fs"
import { dirname, isAbsolute, resolve } from "node:path"
import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import * as schema from "./schema"

/**
 * Where document bytes are written. Must be outside the repository — resident
 * files are special category data and this is a code repo. See .env.example.
 */
export function auditDataDir() {
  const configured = process.env.AUDIT_DATA_DIR
  if (!configured) {
    throw new Error(
      "AUDIT_DATA_DIR is not set. Copy .env.example to .env.local and point it at a folder outside this repository."
    )
  }
  const dir = isAbsolute(configured) ? configured : resolve(configured)
  mkdirSync(dir, { recursive: true })
  return dir
}

function databaseFile() {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and point it at a file outside this repository."
    )
  }
  return url.replace(/^file:/, "")
}

declare global {
  var __auditDb: ReturnType<typeof create> | undefined
}

function create() {
  const file = databaseFile()
  mkdirSync(dirname(file), { recursive: true })
  const sqlite = new Database(file)
  sqlite.pragma("journal_mode = WAL")
  sqlite.pragma("foreign_keys = ON")
  return drizzle(sqlite, { schema })
}

// Next.js reloads modules in development; without this the database handle is
// reopened on every change until the process runs out of file descriptors.
export const db = globalThis.__auditDb ?? create()
if (process.env.NODE_ENV !== "production") globalThis.__auditDb = db

export function databaseExists() {
  return existsSync(databaseFile())
}

export { schema }
