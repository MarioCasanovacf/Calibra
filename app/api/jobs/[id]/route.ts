import { eq } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../../db";
import { jobs } from "../../../../db/schema";
import { decisionReasons } from "../../../../lib/antigravity";

const allowed = ["Identificada", "Evaluada", "Confirmada", "Aplicada", "En proceso", "Oferta", "Descartada"];

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureSchema();
    const { id } = await context.params;
    const payload = await request.json() as {
      status?: string;
      nextAction?: string;
      humanDecision?: "Pendiente" | "Aplicaría" | "Descartar";
      humanReason?: string;
      humanNote?: string;
      humanScore?: number;
    };
    if (payload.status && !allowed.includes(payload.status)) return Response.json({ error: "Estado inválido" }, { status: 400 });
    if (payload.humanDecision && !["Pendiente", "Aplicaría", "Descartar"].includes(payload.humanDecision)) return Response.json({ error: "Decisión inválida" }, { status: 400 });
    if (payload.humanReason && !(decisionReasons as readonly string[]).includes(payload.humanReason)) return Response.json({ error: "Motivo inválido" }, { status: 400 });
    if (payload.humanScore !== undefined && (!Number.isFinite(payload.humanScore) || payload.humanScore < 0 || payload.humanScore > 100)) return Response.json({ error: "El score humano debe estar entre 0 y 100" }, { status: 400 });
    const updates: Partial<typeof jobs.$inferInsert> & { updatedAt: string; isNew: boolean } = { updatedAt: new Date().toISOString(), isNew: false };
    if (payload.status) updates.status = payload.status;
    if (payload.nextAction?.trim()) updates.nextAction = payload.nextAction.trim();
    if (payload.humanDecision) {
      updates.humanDecision = payload.humanDecision;
      updates.humanReason = payload.humanReason?.trim() || null;
      updates.humanNote = payload.humanNote?.trim().slice(0, 1000) || null;
      updates.humanScore = payload.humanScore === undefined ? null : Math.round(payload.humanScore);
      updates.feedbackAt = new Date().toISOString();
      if (payload.humanDecision === "Aplicaría") updates.status = "Confirmada";
      if (payload.humanDecision === "Descartar") updates.status = "Descartada";
    }
    const [job] = await getDb().update(jobs).set(updates).where(eq(jobs.id, decodeURIComponent(id))).returning();
    if (!job) return Response.json({ error: "Vacante no encontrada" }, { status: 404 });
    return Response.json({ job });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No fue posible actualizar la vacante." }, { status: 500 });
  }
}
