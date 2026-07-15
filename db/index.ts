import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getD1() {
  const bindings = env as unknown as { DB?: D1Database };
  if (!bindings.DB) throw new Error("La base de datos de Jossette no está disponible.");
  return bindings.DB;
}

export function getDb() {
  return drizzle(getD1(), { schema });
}

export async function ensureSchema() {
  const d1 = getD1();
  await d1.batch([
    d1.prepare(`CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY NOT NULL,
      source TEXT NOT NULL,
      external_id TEXT NOT NULL,
      source_url TEXT NOT NULL,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      location TEXT DEFAULT 'Remote' NOT NULL,
      description TEXT DEFAULT '' NOT NULL,
      published_at TEXT,
      expires_at TEXT,
      employment_type TEXT DEFAULT 'Contractor' NOT NULL,
      salary TEXT DEFAULT 'Por confirmar' NOT NULL,
      score INTEGER DEFAULT 0 NOT NULL,
      technical_score INTEGER DEFAULT 0 NOT NULL,
      experience_score INTEGER DEFAULT 0 NOT NULL,
      career_score INTEGER DEFAULT 0 NOT NULL,
      verdict TEXT DEFAULT 'Por evaluar' NOT NULL,
      recommended_cv TEXT DEFAULT 'SDS' NOT NULL,
      matched_skills TEXT DEFAULT '[]' NOT NULL,
      gaps TEXT DEFAULT '[]' NOT NULL,
      evidence TEXT DEFAULT '{}' NOT NULL,
      status TEXT DEFAULT 'Identificada' NOT NULL,
      next_action TEXT DEFAULT 'Revisar requisitos' NOT NULL,
      is_new INTEGER DEFAULT 1 NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`),
    d1.prepare("CREATE UNIQUE INDEX IF NOT EXISTS jobs_source_external_idx ON jobs (source, external_id)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS jobs_score_idx ON jobs (score)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS jobs_status_idx ON jobs (status)"),
    d1.prepare(`CREATE TABLE IF NOT EXISTS search_runs (
      id TEXT PRIMARY KEY NOT NULL,
      source TEXT NOT NULL,
      status TEXT DEFAULT 'running' NOT NULL,
      scanned INTEGER DEFAULT 0 NOT NULL,
      inserted INTEGER DEFAULT 0 NOT NULL,
      duplicates INTEGER DEFAULT 0 NOT NULL,
      rejected INTEGER DEFAULT 0 NOT NULL,
      error TEXT,
      started_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      completed_at TEXT
    )`),
  ]);
}
