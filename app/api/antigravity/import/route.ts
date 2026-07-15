import { desc, eq } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../../db";
import { agentRuns, jobs } from "../../../../db/schema";
import {
  ANTIGRAVITY_PROTOCOL,
  normalizeUrl,
  stableId,
  type AntigravityBatch,
  type AntigravityJob,
} from "../../../../lib/antigravity";

type Issue = { index: number; field: string; message: string };

function text(value: unknown, max = 12000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function score(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(100, Math.round(number))) : null;
}

function stringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, 30) : [];
}

function isWebUrl(value: string) {
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
}

function validate(raw: unknown, index: number): { job?: AntigravityJob; issues: Issue[] } {
  const issues: Issue[] = [];
  if (!raw || typeof raw !== "object") return { issues: [{ index, field: "job", message: "El registro no es un objeto." }] };
  const item = raw as Record<string, unknown>;
  const evidence = item.evidence && typeof item.evidence === "object" ? item.evidence as Record<string, unknown> : {};
  const verification = evidence.verification && typeof evidence.verification === "object" ? evidence.verification as Record<string, unknown> : {};
  const sourceUrl = text(item.sourceUrl, 2000);
  const directUrl = text(verification.directUrl, 2000);
  const title = text(item.title, 220);
  const company = text(item.company, 180);
  const description = text(item.description, 30000);
  const source = text(item.source, 100);
  const recommendedCv = text(item.recommendedCv, 3);
  const scores = [score(item.score), score(item.technicalScore), score(item.experienceScore), score(item.careerScore)];

  if (!title) issues.push({ index, field: "title", message: "Falta el título." });
  if (!company) issues.push({ index, field: "company", message: "Falta la empresa." });
  if (!source) issues.push({ index, field: "source", message: "Falta la fuente." });
  if (!isWebUrl(sourceUrl)) issues.push({ index, field: "sourceUrl", message: "Se requiere una URL directa http(s)." });
  if (description.length < 60) issues.push({ index, field: "description", message: "La descripción verificada es demasiado corta." });
  if (!isWebUrl(directUrl) || normalizeUrl(directUrl) !== normalizeUrl(sourceUrl)) issues.push({ index, field: "evidence.verification.directUrl", message: "La evidencia debe apuntar a la misma vacante directa." });
  if (verification.status !== "verified") issues.push({ index, field: "evidence.verification.status", message: "La vacante no está marcada como verificada." });
  if (!text(verification.checkedAt, 60)) issues.push({ index, field: "evidence.verification.checkedAt", message: "Falta la fecha de verificación." });
  if (!text(verification.notes, 1000)) issues.push({ index, field: "evidence.verification.notes", message: "Falta una nota de evidencia." });
  if (!(["SDS", "SDE", "SDA", "SBA"] as string[]).includes(recommendedCv)) issues.push({ index, field: "recommendedCv", message: "El CV debe ser SDS, SDE, SDA o SBA." });
  if (scores.some((value) => value === null)) issues.push({ index, field: "score", message: "Los cuatro scores deben estar entre 0 y 100." });
  if (typeof evidence.remote !== "boolean") issues.push({ index, field: "evidence.remote", message: "remote debe ser booleano." });
  if (!(typeof evidence.contractor === "boolean" || evidence.contractor === null)) issues.push({ index, field: "evidence.contractor", message: "contractor debe ser true, false o null." });
  if (issues.length) return { issues };

  let overall = scores[0] as number;
  const disqualifiers = stringList(evidence.disqualifiers);
  if (evidence.contractor === null) overall = Math.min(overall, 74);
  if (evidence.contractor === false || evidence.remote === false || disqualifiers.length) overall = Math.min(overall, 54);

  return {
    issues,
    job: {
      externalId: text(item.externalId, 200) || undefined,
      source,
      sourceUrl,
      title,
      company,
      location: text(item.location, 180) || "Remote · Por confirmar",
      description,
      publishedAt: text(item.publishedAt, 60) || null,
      expiresAt: text(item.expiresAt, 60) || null,
      employmentType: text(item.employmentType, 140) || "Por confirmar",
      salary: text(item.salary, 140) || "Por confirmar",
      score: overall,
      technicalScore: scores[1] as number,
      experienceScore: scores[2] as number,
      careerScore: scores[3] as number,
      verdict: text(item.verdict, 100) || "Revisar",
      recommendedCv: recommendedCv as AntigravityJob["recommendedCv"],
      matchedSkills: stringList(item.matchedSkills),
      gaps: stringList(item.gaps),
      nextAction: text(item.nextAction, 500) || "Revisar evidencia",
      evidence: {
        remote: evidence.remote as boolean,
        contractor: evidence.contractor as boolean | null,
        location: text(evidence.location, 500) || text(item.location, 180),
        disqualifiers,
        verification: {
          status: "verified",
          directUrl,
          checkedAt: text(verification.checkedAt, 60),
          notes: text(verification.notes, 1000),
        },
      },
    },
  };
}

function runView(row: typeof agentRuns.$inferSelect) {
  return { ...row, issues: JSON.parse(row.issues || "[]") };
}

export async function GET() {
  try {
    await ensureSchema();
    const runs = await getDb().select().from(agentRuns).orderBy(desc(agentRuns.createdAt)).limit(10);
    return Response.json({ runs: runs.map(runView) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No fue posible cargar las importaciones." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await ensureSchema();
  const db = getDb();
  const runId = crypto.randomUUID();
  try {
    const incoming = await request.json() as { fileName?: string; batch?: unknown } | AntigravityBatch;
    const envelope = incoming && typeof incoming === "object" && "batch" in incoming ? incoming : { batch: incoming };
    const batch = envelope.batch as Partial<AntigravityBatch> | undefined;
    const fileName = "fileName" in envelope ? text(envelope.fileName, 180) || "Lote pegado" : "Lote pegado";
    if (!batch || batch.protocolVersion !== ANTIGRAVITY_PROTOCOL) {
      return Response.json({ error: `El archivo debe usar protocolVersion = ${ANTIGRAVITY_PROTOCOL}.` }, { status: 400 });
    }
    if (!Array.isArray(batch.jobs)) return Response.json({ error: "El archivo necesita un arreglo jobs." }, { status: 400 });
    if (batch.jobs.length > 100) return Response.json({ error: "Un lote admite hasta 100 vacantes." }, { status: 400 });

    const existing = await db.select().from(jobs).limit(1000);
    const byUrl = new Map(existing.filter((job) => job.sourceUrl).map((job) => [normalizeUrl(job.sourceUrl), job]));
    const byTitleCompany = new Map(existing.map((job) => [`${job.company.trim().toLowerCase()}::${job.title.trim().toLowerCase()}`, job]));
    const issues: Issue[] = [];
    let inserted = 0;
    let duplicates = 0;

    for (let index = 0; index < batch.jobs.length; index += 1) {
      const result = validate(batch.jobs[index], index);
      issues.push(...result.issues);
      if (!result.job) continue;
      const job = result.job;
      const urlKey = normalizeUrl(job.sourceUrl);
      const titleKey = `${job.company.trim().toLowerCase()}::${job.title.trim().toLowerCase()}`;
      const duplicate = byUrl.get(urlKey) || byTitleCompany.get(titleKey);
      const disqualified = !job.evidence.remote || job.evidence.contractor === false || job.evidence.disqualifiers.length > 0;
      const row = {
        sourceUrl: job.sourceUrl,
        title: job.title,
        company: job.company,
        location: job.location,
        description: job.description,
        publishedAt: job.publishedAt,
        expiresAt: job.expiresAt || null,
        employmentType: job.employmentType,
        salary: job.salary,
        score: job.score,
        technicalScore: job.technicalScore,
        experienceScore: job.experienceScore,
        careerScore: job.careerScore,
        verdict: disqualified ? "No cumple filtros" : job.evidence.contractor === null ? "Revisar" : job.verdict,
        recommendedCv: job.recommendedCv,
        matchedSkills: JSON.stringify(job.matchedSkills),
        gaps: JSON.stringify(job.gaps),
        evidence: JSON.stringify(job.evidence),
        nextAction: job.nextAction,
        updatedAt: new Date().toISOString(),
      };

      if (duplicate) {
        await db.update(jobs).set({ ...row, isNew: false }).where(eq(jobs.id, duplicate.id));
        duplicates += 1;
        continue;
      }

      const externalId = job.externalId || stableId(urlKey || titleKey);
      const id = `antigravity:${stableId(`${job.source}:${externalId}:${urlKey}`)}`;
      await db.insert(jobs).values({
        id,
        source: `Antigravity · ${job.source}`,
        externalId,
        ...row,
        status: disqualified ? "Descartada" : "Identificada",
        isNew: true,
      });
      const saved = { id, sourceUrl: job.sourceUrl, company: job.company, title: job.title } as typeof jobs.$inferSelect;
      byUrl.set(urlKey, saved);
      byTitleCompany.set(titleKey, saved);
      inserted += 1;
    }

    const invalid = new Set(issues.map((issue) => issue.index)).size;
    const status = invalid === batch.jobs.length && batch.jobs.length > 0 ? "failed" : invalid ? "partial" : "completed";
    const [run] = await db.insert(agentRuns).values({
      id: runId,
      protocolVersion: ANTIGRAVITY_PROTOCOL,
      fileName,
      status,
      total: batch.jobs.length,
      inserted,
      duplicates,
      invalid,
      issues: JSON.stringify(issues.slice(0, 100)),
    }).returning();
    return Response.json({ run: runView(run), issues });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No fue posible importar el lote." }, { status: 500 });
  }
}
