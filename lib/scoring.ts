import { candidateProfile } from "./profile";

export type ScoredJob = {
  score: number;
  technicalScore: number;
  experienceScore: number;
  careerScore: number;
  verdict: string;
  recommendedCv: "SDS" | "SDE" | "SDA" | "SBA";
  matchedSkills: string[];
  gaps: string[];
  nextAction: string;
  eligible: boolean;
  evidence: { remote: boolean; contractor: boolean; location: string; disqualifiers: string[] };
};

const requirementSignals = [
  ...candidateProfile.strengths,
  ...candidateProfile.adjacent,
  "java", "scala", "go", "react", "node.js", "kafka", "redshift", "palantir", "looker studio",
];

function includes(text: string, term: string) {
  return text.includes(term.toLowerCase());
}

export function scoreJob(input: { title: string; description: string; location?: string; employmentType?: string }): ScoredJob {
  const title = input.title.toLowerCase();
  const description = stripHtml(input.description).toLowerCase();
  const text = `${title}\n${description}`;
  const location = (input.location || "Remote").toLowerCase();
  const employment = (input.employmentType || "").toLowerCase();

  const matchedSkills = candidateProfile.strengths.filter((skill) => includes(text, skill));
  const adjacentMatches = candidateProfile.adjacent.filter((skill) => includes(text, skill));
  const detectedRequirements = requirementSignals.filter((skill) => includes(text, skill));
  const gaps = detectedRequirements.filter((skill) => !candidateProfile.strengths.includes(skill as never)).slice(0, 4);

  const trackScores = Object.entries(candidateProfile.tracks).map(([track, terms]) => ({
    track: track as "SDS" | "SDE" | "SDA" | "SBA",
    score: terms.reduce((total, term) => total + (includes(text, term) ? (includes(title, term) ? 3 : 1) : 0), 0),
  })).sort((a, b) => b.score - a.score);
  const recommendedCv = trackScores[0]?.track || "SDS";

  const remote = /remote|remoto|worldwide|anywhere|global|latam|latin america/.test(`${location} ${text.slice(0, 900)}`);
  const contractor = /contract|contractor|freelance|1099|b2b|consultant|project-based/.test(`${employment} ${text.slice(0, 1500)}`);
  const explicitDisqualifiers: string[] = candidateProfile.hardExclusions.filter((term) => includes(`${employment} ${location} ${text.slice(0, 1800)}`, term));
  const locationSpecific = location && !/remote|worldwide|anywhere|global|latam|latin america|mexico|méxico|mx/.test(location);
  if (locationSpecific && /united states only|us only|usa only|canada only|europe only|uk only/.test(`${location} ${text.slice(0, 1000)}`)) {
    explicitDisqualifiers.push("restricción geográfica");
  }

  const technicalScore = Math.min(96, 42 + matchedSkills.length * 6 + adjacentMatches.length * 2);
  const experienceScore = Math.min(96, 48 + trackScores[0].score * 5 + (/senior|staff|lead/.test(title) ? 8 : 0));
  const behavioralSignals = ["autonomy", "independent", "collabor", "ownership", "research", "cross-functional"].filter((term) => includes(text, term)).length;
  const behavioralScore = Math.min(92, 58 + behavioralSignals * 6);
  const energizerMatches = candidateProfile.energizers.filter((term) => includes(text, term)).length;
  const drainerMatches = candidateProfile.drainers.filter((term) => includes(text, term)).length;
  const careerScore = Math.max(30, Math.min(96, 56 + energizerMatches * 5 - drainerMatches * 10 + (contractor ? 8 : 0)));
  let score = Math.round(technicalScore * .30 + experienceScore * .25 + behavioralScore * .15 + careerScore * .30);
  const eligible = remote && contractor && explicitDisqualifiers.length === 0;
  if (!eligible) score = Math.min(score, 54);

  const verdict = !eligible ? "No cumple filtros" : score >= 80 ? "Aplicar" : score >= 68 ? "Buen match" : score >= 55 ? "Revisar" : "Descartar";
  const nextAction = !remote ? "Confirmar modalidad remota" : !contractor ? "Confirmar tipo de contratación" : gaps.length ? `Confirmar experiencia en ${gaps[0]}` : "Revisar y adaptar el CV";

  return {
    score, technicalScore, experienceScore, careerScore, verdict, recommendedCv,
    matchedSkills: matchedSkills.slice(0, 10), gaps,
    nextAction, eligible,
    evidence: { remote, contractor, location: input.location || "Remote", disqualifiers: explicitDisqualifiers },
  };
}

export function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
}
