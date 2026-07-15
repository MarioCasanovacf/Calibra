import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const jobs = sqliteTable("jobs", {
  id: text("id").primaryKey(),
  source: text("source").notNull(),
  externalId: text("external_id").notNull(),
  sourceUrl: text("source_url").notNull(),
  title: text("title").notNull(),
  company: text("company").notNull(),
  location: text("location").notNull().default("Remote"),
  description: text("description").notNull().default(""),
  publishedAt: text("published_at"),
  expiresAt: text("expires_at"),
  employmentType: text("employment_type").notNull().default("Contractor"),
  salary: text("salary").notNull().default("Por confirmar"),
  score: integer("score").notNull().default(0),
  technicalScore: integer("technical_score").notNull().default(0),
  experienceScore: integer("experience_score").notNull().default(0),
  careerScore: integer("career_score").notNull().default(0),
  verdict: text("verdict").notNull().default("Por evaluar"),
  recommendedCv: text("recommended_cv").notNull().default("SDS"),
  matchedSkills: text("matched_skills").notNull().default("[]"),
  gaps: text("gaps").notNull().default("[]"),
  evidence: text("evidence").notNull().default("{}"),
  status: text("status").notNull().default("Identificada"),
  nextAction: text("next_action").notNull().default("Revisar requisitos"),
  isNew: integer("is_new", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("jobs_source_external_idx").on(table.source, table.externalId),
  index("jobs_score_idx").on(table.score),
  index("jobs_status_idx").on(table.status),
]);

export const searchRuns = sqliteTable("search_runs", {
  id: text("id").primaryKey(),
  source: text("source").notNull(),
  status: text("status").notNull().default("running"),
  scanned: integer("scanned").notNull().default(0),
  inserted: integer("inserted").notNull().default(0),
  duplicates: integer("duplicates").notNull().default(0),
  rejected: integer("rejected").notNull().default(0),
  error: text("error"),
  startedAt: text("started_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  completedAt: text("completed_at"),
});
