import { candidateProfile, cvProfiles } from "./profile";

export const ANTIGRAVITY_PROTOCOL = "jossette.antigravity.v1";

export const decisionReasons = [
  "Match técnico",
  "Modalidad",
  "Tipo de contrato",
  "Geografía",
  "Compensación",
  "Seniority",
  "Empresa o industria",
  "Crecimiento profesional",
  "Otro",
] as const;

export type AntigravityEvidence = {
  remote: boolean;
  contractor: boolean | null;
  location: string;
  disqualifiers: string[];
  verification: {
    status: "verified";
    directUrl: string;
    checkedAt: string;
    notes: string;
  };
};

export type AntigravityJob = {
  externalId?: string;
  source: string;
  sourceUrl: string;
  title: string;
  company: string;
  location: string;
  description: string;
  publishedAt: string | null;
  expiresAt?: string | null;
  employmentType: string;
  salary: string;
  score: number;
  technicalScore: number;
  experienceScore: number;
  careerScore: number;
  verdict: string;
  recommendedCv: "SDS" | "SDE" | "SDA" | "SBA";
  matchedSkills: string[];
  gaps: string[];
  nextAction: string;
  evidence: AntigravityEvidence;
};

export type AntigravityBatch = {
  protocolVersion: typeof ANTIGRAVITY_PROTOCOL;
  generatedAt: string;
  run: {
    searchedAt: string;
    queryScope: string;
    sourcesChecked: string[];
  };
  jobs: AntigravityJob[];
};

export function antigravityTemplate(): AntigravityBatch {
  const now = new Date().toISOString();
  return {
    protocolVersion: ANTIGRAVITY_PROTOCOL,
    generatedAt: now,
    run: {
      searchedAt: now,
      queryScope: "Senior Data / AI / Analytics · contractor · remote",
      sourcesChecked: ["Nombre de la fuente revisada"],
    },
    jobs: [
      {
        externalId: "identificador-del-anuncio",
        source: "Sitio o ATS de origen",
        sourceUrl: "https://empresa.example/jobs/puesto",
        title: "Senior Data Scientist — Contract",
        company: "Empresa",
        location: "Remote · LATAM",
        description: "Descripción completa y verificada de la vacante, con responsabilidades y requisitos suficientes para auditar la evaluación.",
        publishedAt: null,
        expiresAt: null,
        employmentType: "Contractor",
        salary: "Por confirmar",
        score: 82,
        technicalScore: 86,
        experienceScore: 84,
        careerScore: 76,
        verdict: "Aplicar",
        recommendedCv: "SDS",
        matchedSkills: ["python", "sql", "machine learning"],
        gaps: ["aws"],
        nextAction: "Confirmar tarifa y duración del contrato",
        evidence: {
          remote: true,
          contractor: true,
          location: "La publicación acepta candidatos en LATAM",
          disqualifiers: [],
          verification: {
            status: "verified",
            directUrl: "https://empresa.example/jobs/puesto",
            checkedAt: now,
            notes: "La página directa estaba abierta y mostraba explícitamente modalidad remota y contratación por proyecto.",
          },
        },
      },
    ],
  };
}

export function buildAntigravityPackage(seenJobs: Array<{
  title: string;
  company: string;
  sourceUrl: string;
  status: string;
  humanDecision: string;
  humanReason: string | null;
  humanScore: number | null;
}>) {
  const template = JSON.stringify(antigravityTemplate(), null, 2);
  const seen = seenJobs.length
    ? seenJobs.map((job) => `- ${job.company} — ${job.title} — estado: ${job.status} — decisión humana: ${job.humanDecision}${job.humanReason ? ` (${job.humanReason})` : ""}${job.humanScore === null ? "" : ` — score humano: ${job.humanScore}`} — ${job.sourceUrl}`).join("\n")
    : "- Ninguna todavía.";

  return `# Jossette × Antigravity — paquete operativo

Versión del protocolo: ${ANTIGRAVITY_PROTOCOL}
Generado: ${new Date().toISOString()}

## Tu papel

Actúas como agente de investigación de vacantes para Mario Casanova. Busca, abre, verifica y evalúa oportunidades reales. No inventes vacantes, no uses snippets como evidencia y no apliques por Mario. Tu única salida operativa es un archivo JSON válido que Jossette pueda importar.

## Perfil y filtros no negociables

- Ubicación del candidato: ${candidateProfile.location}.
- Modalidad: 100% remota; México, LATAM o worldwide.
- Relación: contractor, freelance, 1099, consultoría independiente o B2B.
- Excluir si declara explícitamente FTE, W-2, permanent employee, EOR, híbrido u onsite.
- Si el tipo de contratación no está explícito, conserva la oportunidad, usa contractor = null, limita el score a 74 y pide confirmarlo.
- Seniority objetivo: Senior, Staff o Lead. Roles adyacentes solo si la experiencia es transferible y la compensación lo justifica.
- Nunca autoaplicar. La decisión humana ocurre dentro de Jossette.

## Cuatro CVs disponibles

${cvProfiles.map((cv) => `- ${cv.short} — ${cv.name}: ${cv.focus}.`).join("\n")}

## Evidencia profesional que sí puedes afirmar

- 7+ años en data, analytics, consultoría y Applied AI; trabajo remoto desde México e inglés profesional.
- Python, SQL, Machine Learning, modelado estadístico y predictivo, NLP, LLMs y RAG.
- Pipelines ETL/ELT, dbt, Spark/PySpark, Databricks, Snowflake, Oracle, GCP y Azure.
- Power BI, Tableau, dimensional modeling, SCD Type 2, calidad de datos y automatización de reporting.
- Sistemas multiagente, human gates, DAGs, control de concurrencia y automatización con Python/C#/Node.js.
- Proyectos verificables: clasificación NLP multilingüe a escala, análisis de 13M+ cuentas y 79M+ dispositivos, pipelines de 26k+ registros diarios, sistemas RAG/OCR, simulación Monte Carlo y reconstrucción de libros de órdenes.
- No conviertas una tecnología adyacente en experiencia profunda sin evidencia. Registra el faltante como gap.

## Estrategia de búsqueda

Rota fuentes en vez de depender de una sola: ATS directos (Greenhouse, Lever, Ashby y páginas de carrera), bolsas remotas, consultoras nearshore LATAM, research nonprofits, comunidades especializadas y marketplaces de talento senior. LinkedIn sirve para descubrir candidatos, pero una vacante solo entra si logras verificarla en una página directa vigente.

Prioriza:

1. Senior Data Scientist, ML Engineer, Applied AI, LLM/RAG y AI Systems.
2. Senior Data Engineer, Analytics Engineer, Data Architect, dbt/Spark.
3. Senior Data Analyst, Product Analytics, BI y Data Operations.
4. Senior Business Analyst, Strategy, Operations y Financial Data.
5. Contratos fraccionales o consultoría independiente de nivel senior.

## Regla de verificación

Para cada resultado abre la página directa. Confirma que el anuncio sigue vigente y registra la URL, fecha de revisión, modalidad, geografía y texto que sustenta el tipo de contratación. Si la fuente bloquea la verificación y no encuentras el anuncio original, descártalo. Menos resultados auditables son mejores que muchos resultados inciertos.

## Evaluación

- Score 0–100 con razones rastreables.
- Distingue requisitos obligatorios de “nice to have”.
- Selecciona SDS, SDE, SDA o SBA y explica la elección mediante matchedSkills y gaps.
- Un filtro duro explícitamente incumplido produce verdict = "No cumple filtros" y score máximo 54.
- Tipo de contrato ambiguo produce verdict = "Revisar", contractor = null y score máximo 74.
- evidence.verification.status siempre debe ser "verified".
- sourceUrl y evidence.verification.directUrl deben apuntar a la misma vacante directa.

## Vacantes ya conocidas — no las vuelvas a presentar

${seen}

Usa las decisiones humanas anteriores como ejemplos de calibración, sin convertirlas en reglas universales. Si el score humano difiere del score del agente, prioriza el motivo escrito y busca qué evidencia faltó.

## Entrega obligatoria

Devuelve solo JSON UTF-8, sin cercos de Markdown, comentarios ni texto antes o después. Usa exactamente esta estructura:

${template}

Puedes incluir entre 0 y 100 vacantes. Un lote vacío es válido si no encontraste resultados verificables.

## Rutina diaria para Antigravity

Si Antigravity permite tareas programadas, crea una ejecución diaria a las 07:30 en America/Mexico_City. En cada ejecución: lee este archivo, revisa primero resultados de los últimos siete días, rota al menos cuatro familias de fuentes, verifica cada página directa, elimina los elementos de “Vacantes ya conocidas” y guarda el JSON final como \`jossette-import-AAAA-MM-DD.json\`. No envíes aplicaciones ni mensajes a reclutadores. La persona operadora revisará el archivo y lo importará en Jossette.
`;
}

export function normalizeUrl(value: string) {
  try {
    const url = new URL(value);
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref", "source"].forEach((key) => url.searchParams.delete(key));
    url.hash = "";
    return `${url.hostname.replace(/^www\./, "")}${url.pathname.replace(/\/$/, "")}${url.search}`.toLowerCase();
  } catch {
    return value.trim().toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
  }
}

export function stableId(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
