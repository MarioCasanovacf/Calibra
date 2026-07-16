import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getD1() {
  const bindings = env as unknown as { DB?: D1Database };
  if (!bindings.DB) throw new Error("La base de datos de Calibra no está disponible.");
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
      human_decision TEXT DEFAULT 'Pendiente' NOT NULL,
      human_reason TEXT,
      human_note TEXT,
      human_score INTEGER,
      feedback_at TEXT,
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
    d1.prepare(`CREATE TABLE IF NOT EXISTS agent_runs (
      id TEXT PRIMARY KEY NOT NULL,
      protocol_version TEXT NOT NULL,
      file_name TEXT DEFAULT 'Lote pegado' NOT NULL,
      status TEXT DEFAULT 'completed' NOT NULL,
      total INTEGER DEFAULT 0 NOT NULL,
      inserted INTEGER DEFAULT 0 NOT NULL,
      duplicates INTEGER DEFAULT 0 NOT NULL,
      invalid INTEGER DEFAULT 0 NOT NULL,
      issues TEXT DEFAULT '[]' NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`),
    d1.prepare("CREATE INDEX IF NOT EXISTS agent_runs_created_idx ON agent_runs (created_at)"),
  ]);
  const columns = await d1.prepare("PRAGMA table_info(jobs)").all<{ name: string }>();
  const names = new Set((columns.results || []).map((column) => column.name));
  const additions = [
    ["human_decision", "ALTER TABLE jobs ADD COLUMN human_decision TEXT DEFAULT 'Pendiente' NOT NULL"],
    ["human_reason", "ALTER TABLE jobs ADD COLUMN human_reason TEXT"],
    ["human_note", "ALTER TABLE jobs ADD COLUMN human_note TEXT"],
    ["human_score", "ALTER TABLE jobs ADD COLUMN human_score INTEGER"],
    ["feedback_at", "ALTER TABLE jobs ADD COLUMN feedback_at TEXT"],
  ] as const;
  const missing = additions.filter(([name]) => !names.has(name)).map(([, statement]) => d1.prepare(statement));
  if (missing.length) await d1.batch(missing);
}
