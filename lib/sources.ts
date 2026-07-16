import { scoreJob, stripHtml } from "./scoring";

export type DiscoveredJob = {
  id: string; source: string; externalId: string; sourceUrl: string; title: string; company: string;
  location: string; description: string; publishedAt: string | null; expiresAt: string | null;
  employmentType: string; salary: string; score: number; technicalScore: number; experienceScore: number;
  careerScore: number; verdict: string; recommendedCv: string; matchedSkills: string[]; gaps: string[];
  evidence: object; nextAction: string; eligible: boolean;
};

const relevantTitle = /(data scientist|machine learning|ml engineer|ai engineer|applied ai|data engineer|analytics engineer|data architect|data analyst|business analyst|business intelligence|bi analyst|financial data)/i;

function makeJob(raw: Omit<DiscoveredJob, "score"|"technicalScore"|"experienceScore"|"careerScore"|"verdict"|"recommendedCv"|"matchedSkills"|"gaps"|"evidence"|"nextAction"|"eligible">): DiscoveredJob {
  const scored = scoreJob(raw);
  return { ...raw, ...scored };
}

function locationList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => typeof item === "string" ? item : typeof item === "object" && item && "name" in item ? String((item as {name: unknown}).name) : "").filter(Boolean);
}

function mexicoEligible(locations: string[]) {
  if (!locations.length) return true;
  const joined = locations.join(" ").toLowerCase();
  return /mexico|méxico|mx|latam|latin america|worldwide|anywhere|global/.test(joined);
}

function isoFromTimestamp(value: unknown) {
  if (value == null || value === "") return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return new Date(String(value)).toISOString();
  return new Date(numeric < 1_000_000_000_000 ? numeric * 1000 : numeric).toISOString();
}

export async function fetchHimalayas(): Promise<{jobs: DiscoveredJob[]; scanned: number; rejected: number}> {
  const queries = ["data scientist", "machine learning engineer", "data engineer", "analytics engineer", "business analyst"];
  const responses = await Promise.all(queries.map(async (query) => {
    const url = new URL("https://himalayas.app/jobs/api/search");
    url.searchParams.set("q", query);
    url.searchParams.set("employment_type", "Contractor");
    url.searchParams.set("sort", "recent");
    url.searchParams.set("page", "1");
    const response = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "Calibra/1.0 job-search assistant" } });
    if (!response.ok) throw new Error(`Himalayas respondió ${response.status}`);
    return response.json() as Promise<{jobs?: Record<string, unknown>[]}>;
  }));

  const rawJobs = responses.flatMap((response) => response.jobs || []);
  const byId = new Map<string, DiscoveredJob>();
  let rejected = 0;
  for (const raw of rawJobs) {
    const title = String(raw.title || "");
    const employmentType = String(raw.employmentType || "");
    const locations = locationList(raw.locationRestrictions);
    const expiry = isoFromTimestamp(raw.expiryDate);
    if (!relevantTitle.test(title) || !/contractor/i.test(employmentType) || !mexicoEligible(locations) || (expiry && new Date(expiry) < new Date())) { rejected++; continue; }
    const guid = String(raw.guid || `${raw.companySlug}-${title}`);
    const salary = raw.minSalary && raw.maxSalary ? `${raw.currency || ""} ${Number(raw.minSalary).toLocaleString()}–${Number(raw.maxSalary).toLocaleString()}`.trim() : "Por confirmar";
    const job = makeJob({
      id: `himalayas:${guid}`, source: "Himalayas", externalId: guid,
      sourceUrl: String(raw.applicationLink || `https://himalayas.app/jobs/${guid}`), title,
      company: String(raw.companyName || "Empresa sin nombre"), location: locations.length ? `Remote · ${locations.join(", ")}` : "Remote · Worldwide",
      description: stripHtml(String(raw.description || raw.excerpt || "")),
      publishedAt: isoFromTimestamp(raw.pubDate), expiresAt: expiry,
      employmentType, salary,
    });
    if (job.eligible) byId.set(guid, job); else rejected++;
  }
  return { jobs: [...byId.values()], scanned: rawJobs.length, rejected };
}

export async function fetchRemotive(): Promise<{jobs: DiscoveredJob[]; scanned: number; rejected: number}> {
  const response = await fetch("https://remotive.com/api/remote-jobs?search=data&limit=50", { headers: { Accept: "application/json", "User-Agent": "Calibra/1.0 job-search assistant" } });
  if (!response.ok) throw new Error(`Remotive respondió ${response.status}`);
  const data = await response.json() as {jobs?: Record<string, unknown>[]};
  const rawJobs = data.jobs || [];
  const jobs: DiscoveredJob[] = [];
  let rejected = 0;
  for (const raw of rawJobs) {
    const title = String(raw.title || "");
    const employmentType = String(raw.job_type || "");
    const location = String(raw.candidate_required_location || "Worldwide");
    if (!relevantTitle.test(title) || !/contract|freelance/i.test(employmentType) || !mexicoEligible([location])) { rejected++; continue; }
    const id = String(raw.id || raw.url || title);
    const job = makeJob({
      id: `remotive:${id}`, source: "Remotive", externalId: id, sourceUrl: String(raw.url || "https://remotive.com/remote-jobs"),
      title, company: String(raw.company_name || "Empresa sin nombre"), location: `Remote · ${location}`,
      description: stripHtml(String(raw.description || "")), publishedAt: raw.publication_date ? String(raw.publication_date) : null,
      expiresAt: null, employmentType, salary: String(raw.salary || "Por confirmar") || "Por confirmar",
    });
    if (job.eligible) jobs.push(job); else rejected++;
  }
  return { jobs, scanned: rawJobs.length, rejected };
}

export function verifiedLegacyJobs(): DiscoveredJob[] {
  return [
    makeJob({ id:"verified:epoch-ai-data-scientist", source:"Verificación directa", externalId:"epoch-ai-data-scientist", sourceUrl:"https://jobs.lever.co/epoch-ai/ab88ba6e-6a92-44cc-8830-a2dafca31f1a", title:"Data Scientist (Contract)", company:"Epoch AI", location:"Remote · Worldwide except China", description:"Independent contractor role supporting AI research, literature review, benchmark data and analysis. Python, machine learning research, data quality and technical sources. Flexible 10–30 hours per week with Pacific Time overlap.", publishedAt:null, expiresAt:null, employmentType:"Independent contractor · Part time", salary:"USD 30–40 / hora" }),
    makeJob({ id:"verified:verve-data-engineer", source:"Verificación directa", externalId:"verve-data-engineer", sourceUrl:"https://job-boards.greenhouse.io/verve/jobs/8474867002", title:"Data Engineer (Remote / Contract)", company:"Verve", location:"Remote · US or outside US", description:"40-hour contract position. SQL, large structured and unstructured datasets, BigQuery or ClickHouse, batch ETL/ELT with Airflow, Temporal or Dagster, GCP or AWS, dashboards in Looker or Tableau.", publishedAt:null, expiresAt:null, employmentType:"Contract", salary:"USD 30–50 / hora" }),
    makeJob({ id:"verified:turing-network", source:"Talento directo", externalId:"turing-network", sourceUrl:"https://www.turing.com/jobs", title:"Data Scientist / Data Engineer talent network", company:"Turing", location:"Remote · Global", description:"Independent contractor talent network for data scientists and engineers working with global teams and U.S. clients on AI advancement and application engineering projects.", publishedAt:null, expiresAt:null, employmentType:"Independent contractor", salary:"Por confirmar" }),
  ];
}
