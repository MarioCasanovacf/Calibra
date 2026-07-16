import { desc } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../../db";
import { jobs } from "../../../../db/schema";
import { antigravityTemplate, buildAntigravityPackage } from "../../../../lib/antigravity";

export async function GET(request: Request) {
  try {
    await ensureSchema();
    const format = new URL(request.url).searchParams.get("format");
    if (format === "template") {
      return new Response(JSON.stringify(antigravityTemplate(), null, 2), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": "attachment; filename=calibra-antigravity-template.json",
        },
      });
    }

    const known = await getDb().select({
      title: jobs.title,
      company: jobs.company,
      sourceUrl: jobs.sourceUrl,
      status: jobs.status,
      humanDecision: jobs.humanDecision,
      humanReason: jobs.humanReason,
      humanScore: jobs.humanScore,
    })
      .from(jobs).orderBy(desc(jobs.updatedAt)).limit(300);
    const markdown = buildAntigravityPackage(known);
    return new Response(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": "attachment; filename=calibra-antigravity-paquete.md",
      },
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No fue posible preparar el paquete." }, { status: 500 });
  }
}
