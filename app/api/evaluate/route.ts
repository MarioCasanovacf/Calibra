import { ensureSchema, getDb } from "../../../db";
import { jobs } from "../../../db/schema";
import { scoreJob } from "../../../lib/scoring";

export async function POST(request: Request) {
  try {
    const payload = await request.json() as { title?: string; company?: string; description?: string; location?: string; employmentType?: string; sourceUrl?: string; save?: boolean };
    const description = payload.description?.trim() || "";
    if (description.length < 40) return Response.json({ error: "La descripción necesita al menos 40 caracteres." }, { status: 400 });
    const title = payload.title?.trim() || description.split("\n")[0].slice(0, 120) || "Vacante manual";
    const company = payload.company?.trim() || "Empresa por confirmar";
    const location = payload.location?.trim() || "Remote · Por confirmar";
    const employmentType = payload.employmentType?.trim() || "Contractor · Por confirmar";
    const analysis = scoreJob({ title, description, location, employmentType });
    let id: string | null = null;
    if (payload.save) {
      await ensureSchema();
      id = `manual:${crypto.randomUUID()}`;
      await getDb().insert(jobs).values({
        id, source: "Evaluación manual", externalId: id, sourceUrl: payload.sourceUrl || "", title, company, location,
        description, employmentType, salary: "Por confirmar", score: analysis.score, technicalScore: analysis.technicalScore,
        experienceScore: analysis.experienceScore, careerScore: analysis.careerScore, verdict: analysis.verdict,
        recommendedCv: analysis.recommendedCv, matchedSkills: JSON.stringify(analysis.matchedSkills), gaps: JSON.stringify(analysis.gaps),
        evidence: JSON.stringify(analysis.evidence), status: "Evaluada", nextAction: analysis.nextAction,
      });
    }
    return Response.json({ id, analysis, title, company, location, employmentType });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No fue posible evaluar la vacante." }, { status: 500 });
  }
}
