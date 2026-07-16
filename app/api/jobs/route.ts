import { desc, eq, inArray } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../db";
import { jobs, searchRuns } from "../../../db/schema";
import { fetchHimalayas, fetchRemotive, type DiscoveredJob, verifiedLegacyJobs } from "../../../lib/sources";

export const dynamic = "force-dynamic";

function serialize(row: typeof jobs.$inferSelect) {
  return {
    ...row,
    matchedSkills: JSON.parse(row.matchedSkills || "[]"),
    gaps: JSON.parse(row.gaps || "[]"),
    evidence: JSON.parse(row.evidence || "{}"),
  };
}

function values(job: DiscoveredJob) {
  return {
    id: job.id, source: job.source, externalId: job.externalId, sourceUrl: job.sourceUrl,
    title: job.title, company: job.company, location: job.location, description: job.description,
    publishedAt: job.publishedAt, expiresAt: job.expiresAt, employmentType: job.employmentType,
    salary: job.salary, score: job.score, technicalScore: job.technicalScore,
    experienceScore: job.experienceScore, careerScore: job.careerScore, verdict: job.verdict,
    recommendedCv: job.recommendedCv, matchedSkills: JSON.stringify(job.matchedSkills), gaps: JSON.stringify(job.gaps),
    evidence: JSON.stringify(job.evidence), nextAction: job.nextAction, updatedAt: new Date().toISOString(),
  };
}

async function upsertJobs(discovered: DiscoveredJob[]) {
  const db = getDb();
  const ids = discovered.map((job) => job.id);
  const existing = ids.length ? await db.select({ id: jobs.id }).from(jobs).where(inArray(jobs.id, ids)) : [];
  const existingIds = new Set(existing.map((row) => row.id));
  for (const job of discovered) {
    const row = values(job);
    await db.insert(jobs).values(row).onConflictDoUpdate({
      target: jobs.id,
      set: { ...row, isNew: existingIds.has(job.id) ? false : true },
    });
  }
  return { inserted: discovered.length - existingIds.size, duplicates: existingIds.size };
}

async function seedVerified() {
  const db = getDb();
  const [count] = await db.select({ id: jobs.id }).from(jobs).limit(1);
  if (!count) await upsertJobs(verifiedLegacyJobs());
}

export async function GET() {
  try {
    await ensureSchema();
    await seedVerified();
    const db = getDb();
    const rows = await db.select().from(jobs).orderBy(desc(jobs.score), desc(jobs.createdAt)).limit(100);
    const [lastRun] = await db.select().from(searchRuns).orderBy(desc(searchRuns.startedAt)).limit(1);
    return Response.json({ jobs: rows.map(serialize), lastRun: lastRun || null });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No fue posible cargar las vacantes." }, { status: 500 });
  }
}

export async function POST() {
  await ensureSchema();
  const db = getDb();
  const runId = crypto.randomUUID();
  await db.insert(searchRuns).values({ id: runId, source: "Himalayas + Remotive + verificadas" });
  try {
    const settled = await Promise.allSettled([fetchHimalayas(), fetchRemotive()]);
    const successful = settled.filter((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof fetchHimalayas>>> => result.status === "fulfilled");
    const liveJobs = successful.flatMap((result) => result.value.jobs);
    const combined = [...verifiedLegacyJobs(), ...liveJobs];
    const byId = [...new Map(combined.map((job) => [job.id, job])).values()];
    const { inserted, duplicates } = await upsertJobs(byId);
    const scanned = successful.reduce((sum, result) => sum + result.value.scanned, 0);
    const rejected = successful.reduce((sum, result) => sum + result.value.rejected, 0);
    const errors = settled.filter((result): result is PromiseRejectedResult => result.status === "rejected").map((result) => result.reason instanceof Error ? result.reason.message : String(result.reason));
    await db.update(searchRuns).set({ status: errors.length === settled.length ? "failed" : errors.length ? "partial" : "completed", scanned, inserted, duplicates, rejected, error: errors.join(" · ") || null, completedAt: new Date().toISOString() }).where(eq(searchRuns.id, runId));
    const rows = await db.select().from(jobs).orderBy(desc(jobs.score), desc(jobs.createdAt)).limit(100);
    return Response.json({ jobs: rows.map(serialize), run: { id: runId, scanned, inserted, duplicates, rejected, errors } });
  } catch (error) {
    await db.update(searchRuns).set({ status: "failed", error: error instanceof Error ? error.message : String(error), completedAt: new Date().toISOString() }).where(eq(searchRuns.id, runId));
    return Response.json({ error: error instanceof Error ? error.message : "La búsqueda no pudo completarse." }, { status: 500 });
  }
}
