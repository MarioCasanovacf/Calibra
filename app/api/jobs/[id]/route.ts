import { eq } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../../db";
import { jobs } from "../../../../db/schema";

const allowed = ["Identificada", "Evaluada", "Confirmada", "Aplicada", "En proceso", "Oferta", "Descartada"];

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureSchema();
    const { id } = await context.params;
    const payload = await request.json() as { status?: string; nextAction?: string };
    if (payload.status && !allowed.includes(payload.status)) return Response.json({ error: "Estado inválido" }, { status: 400 });
    const updates: { status?: string; nextAction?: string; updatedAt: string; isNew: boolean } = { updatedAt: new Date().toISOString(), isNew: false };
    if (payload.status) updates.status = payload.status;
    if (payload.nextAction?.trim()) updates.nextAction = payload.nextAction.trim();
    const [job] = await getDb().update(jobs).set(updates).where(eq(jobs.id, decodeURIComponent(id))).returning();
    if (!job) return Response.json({ error: "Vacante no encontrada" }, { status: 404 });
    return Response.json({ job });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No fue posible actualizar la vacante." }, { status: 500 });
  }
}
