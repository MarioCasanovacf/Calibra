"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";

type View = "inicio" | "evaluador" | "radar" | "agente" | "pipeline" | "perfil";
type Stage = "Identificada" | "Evaluada" | "Confirmada" | "Aplicada" | "En proceso" | "Oferta" | "Descartada";
type Analysis = {
  score: number; technicalScore: number; experienceScore: number; careerScore: number; verdict: string;
  recommendedCv: string; matchedSkills: string[]; gaps: string[]; nextAction: string; eligible: boolean;
  evidence: { remote: boolean; contractor: boolean | null; location: string; disqualifiers: string[]; verification?: { status: string; directUrl: string; checkedAt: string; notes: string } };
};
type Job = {
  id: string; source: string; sourceUrl: string; title: string; company: string; location: string; description: string;
  publishedAt: string | null; employmentType: string; salary: string; score: number; technicalScore: number;
  experienceScore: number; careerScore: number; verdict: string; recommendedCv: string; matchedSkills: string[];
  gaps: string[]; evidence: Analysis["evidence"]; status: Stage; nextAction: string; isNew: boolean;
  humanDecision: "Pendiente" | "Aplicaría" | "Descartar"; humanReason: string | null; humanNote: string | null;
  humanScore: number | null; feedbackAt: string | null;
};
type SearchRun = { status: string; scanned: number; inserted: number; duplicates: number; rejected: number; completedAt: string | null };
type AgentRun = { id: string; status: string; fileName: string; total: number; inserted: number; duplicates: number; invalid: number; createdAt: string; issues: { index: number; field: string; message: string }[] };

const nav: { id: View; label: string; icon: string }[] = [
  { id: "inicio", label: "Inicio", icon: "⌂" }, { id: "evaluador", label: "Evaluador", icon: "✦" },
  { id: "radar", label: "Radar diario", icon: "◎" }, { id: "agente", label: "Antigravity", icon: "↯" },
  { id: "pipeline", label: "Pipeline", icon: "▦" },
  { id: "perfil", label: "Perfil y CVs", icon: "◉" },
];
const cvs = [
  { short: "SDS", name: "Senior Data Scientist", accent: "violet", focus: "ML, estadística, LLMs", updated: "Jul 2026" },
  { short: "SDE", name: "Senior Data Engineer", accent: "blue", focus: "Pipelines, cloud, dbt", updated: "Jul 2026" },
  { short: "SDA", name: "Senior Data Analyst", accent: "amber", focus: "BI, SQL, analítica", updated: "Jul 2026" },
  { short: "SBA", name: "Senior Business Analyst", accent: "green", focus: "Estrategia, KPIs, negocio", updated: "Jul 2026" },
];
const stageColors: Record<Stage, string> = { Identificada:"slate", Evaluada:"violet", Confirmada:"green", Aplicada:"blue", "En proceso":"amber", Oferta:"green", Descartada:"red" };
const feedbackReasons = ["Match técnico", "Modalidad", "Tipo de contrato", "Geografía", "Compensación", "Seniority", "Empresa o industria", "Crecimiento profesional", "Otro"];

function relativeDate(value: string | null) {
  if (!value) return "Verificada recientemente";
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000));
  return days === 0 ? "Publicada hoy" : days === 1 ? "Publicada ayer" : `Hace ${days} días`;
}

export default function Home() {
  const [view, setView] = useState<View>("inicio");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [lastRun, setLastRun] = useState<SearchRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [posting, setPosting] = useState("");
  const [postingTitle, setPostingTitle] = useState("");
  const [postingCompany, setPostingCompany] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [toast, setToast] = useState("");
  const [agentRuns, setAgentRuns] = useState<AgentRun[]>([]);
  const [importText, setImportText] = useState("");
  const [importFileName, setImportFileName] = useState("Lote pegado");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<AgentRun | null>(null);
  const [feedbackJobId, setFeedbackJobId] = useState<string | null>(null);
  const [feedbackDecision, setFeedbackDecision] = useState<"Aplicaría" | "Descartar">("Aplicaría");
  const [feedbackReason, setFeedbackReason] = useState("Match técnico");
  const [feedbackScore, setFeedbackScore] = useState(75);
  const [feedbackNote, setFeedbackNote] = useState("");

  async function loadJobs() {
    try {
      const response = await fetch("/api/jobs", { cache: "no-store" });
      const data = await response.json() as { jobs?: Job[]; lastRun?: SearchRun; error?: string };
      if (!response.ok) throw new Error(data.error || "No fue posible cargar el radar.");
      setJobs(data.jobs || []); setLastRun(data.lastRun || null);
    } catch (error) { flash(error instanceof Error ? error.message : "No fue posible cargar las vacantes."); }
    finally { setLoading(false); }
  }
  async function loadAgentRuns() {
    try {
      const response = await fetch("/api/antigravity/import", { cache: "no-store" });
      const data = await response.json() as { runs?: AgentRun[] };
      if (response.ok) setAgentRuns(data.runs || []);
    } catch { /* El radar principal sigue disponible aunque el historial no cargue. */ }
  }
  useEffect(() => { void loadJobs(); void loadAgentRuns(); }, []);

  const stats = useMemo(() => ({
    active: jobs.filter((job) => !["Descartada","Oferta"].includes(job.status)).length,
    strong: jobs.filter((job) => job.score >= 75 && !["Descartada"].includes(job.status)).length,
    applications: jobs.filter((job) => ["Aplicada","En proceso","Oferta"].includes(job.status)).length,
    newJobs: jobs.filter((job) => job.isNew).length,
  }), [jobs]);
  const topJobs = jobs.filter((job) => job.status !== "Descartada").slice(0, 3);
  const actions = jobs.filter((job) => !["Oferta","Descartada"].includes(job.status)).slice(0, 3);
  const today = new Intl.DateTimeFormat("es-MX", { weekday:"long", day:"numeric", month:"long" }).format(new Date()).toUpperCase();

  function go(id: View) { setView(id); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function flash(message: string) { setToast(message); window.setTimeout(() => setToast(""), 3200); }
  async function runSearch() {
    setSyncing(true);
    try {
      const response = await fetch("/api/jobs", { method:"POST" });
      const data = await response.json() as { jobs?: Job[]; run?: SearchRun & {errors?: string[]}; error?: string };
      if (!response.ok) throw new Error(data.error || "El radar no pudo terminar la búsqueda.");
      setJobs(data.jobs || []); setLastRun(data.run || null);
      flash(`Radar listo: ${data.run?.inserted || 0} nuevas, ${data.run?.duplicates || 0} duplicadas.`);
    } catch (error) { flash(error instanceof Error ? error.message : "La búsqueda falló."); }
    finally { setSyncing(false); }
  }
  async function runAnalysis() {
    if (posting.trim().length < 40) { flash("Pega una descripción un poco más completa."); return; }
    setAnalyzing(true);
    try {
      const response = await fetch("/api/evaluate", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ title:postingTitle, company:postingCompany, description:posting }) });
      const data = await response.json() as { analysis?: Analysis; error?: string };
      if (!response.ok || !data.analysis) throw new Error(data.error || "No fue posible evaluar la vacante.");
      setAnalysis(data.analysis);
    } catch (error) { flash(error instanceof Error ? error.message : "No fue posible evaluar la vacante."); }
    finally { setAnalyzing(false); }
  }
  async function addToPipeline() {
    if (!analysis) return;
    try {
      if (selectedJobId) {
        await updateStageById(selectedJobId, "Evaluada");
      } else {
        const response = await fetch("/api/evaluate", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ title:postingTitle, company:postingCompany, description:posting, save:true }) });
        const data = await response.json() as { error?: string };
        if (!response.ok) throw new Error(data.error || "No fue posible guardar la evaluación.");
        await loadJobs();
      }
      flash("Evaluación guardada en el pipeline"); go("pipeline");
    } catch (error) { flash(error instanceof Error ? error.message : "No fue posible guardar."); }
  }
  function evaluateJob(job: Job) {
    setSelectedJobId(job.id); setPosting(job.description); setPostingTitle(job.title); setPostingCompany(job.company);
    setAnalysis({ score:job.score, technicalScore:job.technicalScore, experienceScore:job.experienceScore, careerScore:job.careerScore, verdict:job.verdict, recommendedCv:job.recommendedCv, matchedSkills:job.matchedSkills, gaps:job.gaps, nextAction:job.nextAction, eligible:job.score > 54, evidence:job.evidence });
    go("evaluador");
  }
  async function updateStageById(id: string, status: Stage) {
    const response = await fetch(`/api/jobs/${encodeURIComponent(id)}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ status }) });
    if (!response.ok) throw new Error("No fue posible actualizar el estado.");
    setJobs((current) => current.map((job) => job.id === id ? {...job, status, isNew:false} : job));
  }
  async function updateStage(id: string, status: Stage) {
    try { await updateStageById(id, status); flash("Estado actualizado"); }
    catch (error) { flash(error instanceof Error ? error.message : "No fue posible actualizar."); }
  }
  async function copyAgentPackage() {
    try {
      const response = await fetch("/api/antigravity/export", { cache: "no-store" });
      if (!response.ok) throw new Error("No fue posible preparar el paquete.");
      await navigator.clipboard.writeText(await response.text());
      flash("Paquete de contexto copiado");
    } catch (error) { flash(error instanceof Error ? error.message : "No fue posible copiar el paquete."); }
  }
  async function readImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    setImportText(await file.text());
    setImportResult(null);
  }
  async function importBatch() {
    if (!importText.trim()) { flash("Pega el JSON o selecciona un archivo."); return; }
    setImporting(true);
    try {
      let batch: unknown;
      try { batch = JSON.parse(importText); } catch { throw new Error("El contenido no es JSON válido."); }
      const response = await fetch("/api/antigravity/import", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ fileName:importFileName, batch }) });
      const data = await response.json() as { run?: AgentRun; error?: string };
      if (!response.ok || !data.run) throw new Error(data.error || "No fue posible importar el lote.");
      setImportResult(data.run); setAgentRuns((current) => [data.run!, ...current].slice(0,10));
      await loadJobs();
      flash(`Importación lista: ${data.run.inserted} nuevas, ${data.run.duplicates} duplicadas.`);
    } catch (error) { flash(error instanceof Error ? error.message : "No fue posible importar el lote."); }
    finally { setImporting(false); }
  }
  function openFeedback(job: Job, decision: "Aplicaría" | "Descartar") {
    setFeedbackJobId(job.id); setFeedbackDecision(decision); setFeedbackReason(decision === "Aplicaría" ? "Match técnico" : "Tipo de contrato");
    setFeedbackScore(job.humanScore ?? job.score); setFeedbackNote(job.humanNote || "");
  }
  async function saveFeedback(job: Job) {
    try {
      const response = await fetch(`/api/jobs/${encodeURIComponent(job.id)}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ humanDecision:feedbackDecision, humanReason:feedbackReason, humanScore:feedbackScore, humanNote:feedbackNote }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "No fue posible guardar la decisión.");
      const status: Stage = feedbackDecision === "Aplicaría" ? "Confirmada" : "Descartada";
      setJobs((current) => current.map((item) => item.id === job.id ? {...item, humanDecision:feedbackDecision, humanReason:feedbackReason, humanScore:feedbackScore, humanNote:feedbackNote, feedbackAt:new Date().toISOString(), status, isNew:false} : item));
      setFeedbackJobId(null); flash("Decisión humana guardada para calibración");
    } catch (error) { flash(error instanceof Error ? error.message : "No fue posible guardar la decisión."); }
  }

  return <main className="app-shell">
    {toast && <div className="toast" role="status">✓ {toast}</div>}
    <aside className="sidebar">
      <button className="brand" onClick={() => go("inicio")} aria-label="Ir al inicio"><span className="brand-mark">C.</span><span>Calibra</span><em>WORK / 02</em></button>
      <div className="workspace-label">ESPACIO DE MARIO</div>
      <nav aria-label="Navegación principal">{nav.map((item) => <button key={item.id} className={view===item.id?"nav-item active":"nav-item"} onClick={() => go(item.id)}><span>{item.icon}</span>{item.label}{item.id==="radar" && <b>{stats.newJobs}</b>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="agent-card"><span className={syncing?"pulse searching":"pulse"}/><div><strong>Radar {syncing?"buscando":"conectado"}</strong><small>{lastRun?.completedAt ? `Última revisión · ${new Date(lastRun.completedAt).toLocaleDateString("es-MX")}` : "Listo para buscar"}</small></div></div><button className="user-card" onClick={() => go("perfil")}><span>MC</span><div><strong>Mario Casanova</strong><small>4 CVs activos</small></div><i>⌄</i></button></div>
    </aside>
    <section className="main-area">
      <header className="topbar"><div><span className="eyebrow">{view==="inicio"?today:"ESPACIO DE TRABAJO"}</span><strong>{nav.find((item)=>item.id===view)?.label}</strong></div><button className="icon-button" aria-label="Notificaciones">♢{stats.newJobs>0&&<span/>}</button></header>

      {view==="inicio" && <div className="page dashboard">
        <section className="hero"><div><span className="kicker"><i/> DATOS REALES, DECISIONES TRAZABLES</span><h1>Buenos días, Mario.</h1><p>{loading?"Cargando tu radar…":<>Hay <strong>{stats.newJobs} oportunidades nuevas</strong> y {stats.active} procesos activos.</>}</p></div><button className="primary" onClick={()=>go("radar")}>Revisar oportunidades <span>→</span></button></section>
        <section className="metric-grid"><article><span className="metric-icon violet">◎</span><div><small>OPORTUNIDADES ACTIVAS</small><strong>{stats.active}</strong><p>Persistidas en tu radar</p></div></article><article><span className="metric-icon green">↗</span><div><small>MATCH ALTO</small><strong>{stats.strong}</strong><p>Score mayor a 75</p></div></article><article><span className="metric-icon blue">✉</span><div><small>APLICACIONES</small><strong>{stats.applications}</strong><p>En seguimiento</p></div></article><article><span className="metric-icon amber">◷</span><div><small>NUEVAS</small><strong>{stats.newJobs}</strong><p>Desde la última revisión</p></div></article></section>
        <div className="editorial-rule"><span>01</span><p>Oportunidades verificadas y próximos movimientos</p><i/></div>
        <section className="content-grid">
          <article className="panel opportunities"><div className="panel-head"><div><span className="section-icon violet">✦</span><div><h2>Las mejores ahora</h2><p>Priorizadas contra tus CVs</p></div></div><button onClick={()=>go("radar")}>Ver todas →</button></div>{topJobs.length?topJobs.map((job,i)=><div className="opportunity" key={job.id}><div className={`company-logo c${i%3}`}>{job.company.slice(0,1)}</div><div className="job-copy"><strong>{job.title}</strong><span>{job.company} · {job.location}</span><div className="tags"><em>{job.recommendedCv} recomendado</em><em>{relativeDate(job.publishedAt)}</em></div></div><div className="score-ring"><b>{job.score}</b><small>match</small></div><button aria-label={`Evaluar ${job.title}`} onClick={()=>evaluateJob(job)}>→</button></div>):<div className="empty-state">No hay vacantes todavía. Inicia una búsqueda desde Radar.</div>}</article>
          <article className="panel next-actions"><div className="panel-head"><div><span className="section-icon amber">◷</span><div><h2>Siguientes acciones</h2><p>Lo que mueve tu pipeline</p></div></div></div>{actions.length?actions.map((job,index)=><div className={index===0?"action-item urgent":"action-item"} key={job.id}><span>{index===0?"!":"?"}</span><div><strong>{job.nextAction}</strong><p>{job.company} · {job.title}</p><small>{job.status}</small></div><button onClick={()=>evaluateJob(job)}>Abrir</button></div>):<div className="empty-state">Tu lista de acciones está al día.</div>}</article>
        </section>
        <div className="editorial-rule compact"><span>02</span><p>El sistema operativo</p><i/></div><section className="workflow"><div><span>↯</span><p><strong>Antigravity</strong><small>Busca y entrega JSON verificable</small></p></div><i>→</i><div><span>◎</span><p><strong>Radar</strong><small>Deduplica y conserva evidencia</small></p></div><i>→</i><div><span>▦</span><p><strong>Pipeline</strong><small>Aprende de cada decisión humana</small></p></div><b>Sin API de IA · sin autoaplicar</b></section>
      </div>}

      {view==="evaluador" && <div className="page tool-page">
        <div className="page-title"><div><span className="kicker"><i/> SCORING EXPLICABLE</span><h1>¿Vale la pena aplicar?</h1><p>La vacante se contrasta con evidencia extraída de tus cuatro CVs y con tus filtros no negociables.</p></div><button className="ghost" onClick={()=>{setPosting("");setPostingTitle("");setPostingCompany("");setAnalysis(null);setSelectedJobId(null)}}>Limpiar</button></div>
        <div className="evaluator-layout"><article className="panel paste-panel"><div className="manual-meta"><input value={postingTitle} onChange={(e)=>setPostingTitle(e.target.value)} placeholder="Título del puesto (opcional)" aria-label="Título del puesto"/><input value={postingCompany} onChange={(e)=>setPostingCompany(e.target.value)} placeholder="Empresa (opcional)" aria-label="Empresa"/></div><label htmlFor="posting">DESCRIPCIÓN DE LA VACANTE</label><textarea id="posting" value={posting} onChange={(e)=>setPosting(e.target.value)} placeholder="Pega aquí el texto completo de una vacante real…"/><div className="textarea-foot"><span>{posting.length.toLocaleString()} caracteres</span><button className="primary" disabled={analyzing} onClick={runAnalysis}>{analyzing?"Analizando…":"Analizar vacante"}<span>✦</span></button></div></article><aside className="panel profile-summary"><span className="mini-label">REGLAS ACTIVAS</span><div className="profile-avatar">MC</div><h3>Mario Casanova</h3><p>Senior Data · AI · Analytics</p><div className="profile-facts"><span>✓ Contrato / freelance / B2B</span><span>✓ Remoto LATAM o worldwide</span><span>✓ Senior, Staff o Lead</span><span>× FTE, EOR, híbrido u onsite</span></div><button className="text-button" onClick={()=>go("perfil")}>Ver fuente de verdad →</button></aside></div>
        {analysis&&<section className="analysis panel"><div className="verdict"><div className="big-score"><strong>{analysis.score}</strong><small>/100</small></div><div><span className="match-pill">{analysis.verdict.toUpperCase()}</span><h2>{analysis.eligible?(analysis.score>=75?"Sí, merece atención.":"Revísala con cautela."):"No pasa los filtros duros."}</h2><p>{analysis.eligible?`Match técnico ${analysis.technicalScore}%. ${analysis.gaps.length?`Antes de aplicar conviene confirmar ${analysis.gaps[0]}.`:"No se detectó un gap técnico crítico."}`:"La modalidad, el tipo de contrato o la geografía requieren confirmación antes de continuar."}</p></div><button className="primary" onClick={addToPipeline}>{selectedJobId?"Marcar evaluada":"Guardar en pipeline"}</button></div><div className="analysis-grid"><div><small>MATCH TÉCNICO</small><strong>{analysis.technicalScore}%</strong><p>{analysis.matchedSkills.slice(0,6).join(" · ")||"Sin evidencia suficiente"}</p></div><div><small>EXPERIENCIA</small><strong>{analysis.experienceScore}%</strong><p>Alineación con trayectoria y seniority</p></div><div><small>CV RECOMENDADO</small><strong>{analysis.recommendedCv}</strong><p>{cvs.find((cv)=>cv.short===analysis.recommendedCv)?.name}</p></div><div><small>PREGUNTA CLAVE</small><strong>{analysis.gaps[0]||"Tipo de contrato"}</strong><p>{analysis.nextAction}</p></div></div></section>}
      </div>}

      {view==="radar" && <div className="page tool-page">
        <div className="page-title"><div><span className="kicker"><i/> DESCUBRIMIENTO REAL</span><h1>Radar diario</h1><p>Reúne oportunidades verificadas, elimina duplicados y registra qué sí aplicarías para calibrar el criterio.</p></div><div className="title-actions"><button className="ghost" onClick={()=>go("agente")}>Importar de Antigravity</button><button className="primary" disabled={syncing} onClick={runSearch}>{syncing?"Buscando…":"Actualizar fuentes"}<span>↻</span></button></div></div>
        <section className="radar-status panel"><div className="radar-orbit"><span>◎</span></div><div><span className="match-pill">{agentRuns[0]?"ÚLTIMO LOTE IMPORTADO":"RADAR OPERATIVO"}</span><h2>Antigravity + fuentes verificadas</h2><p>{agentRuns[0]?`${agentRuns[0].inserted} nuevas · ${agentRuns[0].duplicates} duplicadas · ${agentRuns[0].invalid} inválidas en ${agentRuns[0].fileName}`:lastRun?`${lastRun.scanned} revisadas · ${lastRun.inserted} nuevas · ${lastRun.duplicates} duplicadas`:`La primera carga incluye oportunidades verificadas directamente.`}</p></div><div className="source-dots"><span>Antigravity</span><span>ATS directos</span><span>Verificación humana</span></div></section>
        <section className="radar-grid"><article className="panel"><div className="panel-head"><div><span className="section-icon violet">◎</span><div><h2>Resultados reales</h2><p>{jobs.length} oportunidades guardadas · {jobs.filter((job)=>job.humanDecision!=="Pendiente").length} calibradas</p></div></div></div>{loading?<div className="empty-state">Cargando resultados…</div>:jobs.length?jobs.map((job,i)=><div className="radar-item" key={job.id}><div className="radar-row"><span className="rank">{String(i+1).padStart(2,"0")}</span><div><strong>{job.title}</strong><p>{job.company} · {job.location} · {job.source}</p>{job.humanDecision!=="Pendiente"&&<small className={`decision-mark ${job.humanDecision==="Aplicaría"?"yes":"no"}`}>{job.humanDecision} · {job.humanReason}</small>}</div><em>{job.humanScore??job.score} match</em><div className="radar-actions"><button className="yes-action" onClick={()=>openFeedback(job,"Aplicaría")}>Aplicaría</button><button className="no-action" onClick={()=>openFeedback(job,"Descartar")}>Descartar</button><button onClick={()=>evaluateJob(job)}>Ver →</button></div></div>{feedbackJobId===job.id&&<div className="feedback-editor"><div><span className={`decision-seal ${feedbackDecision==="Aplicaría"?"yes":"no"}`}>{feedbackDecision==="Aplicaría"?"✓":"×"}</span><div><strong>{feedbackDecision}</strong><p>Esta corrección queda ligada a la vacante para calibrar futuros lotes.</p></div></div><label>Motivo<select value={feedbackReason} onChange={(event)=>setFeedbackReason(event.target.value)}>{feedbackReasons.map((reason)=><option key={reason}>{reason}</option>)}</select></label><label>Score humano<input type="number" min="0" max="100" value={feedbackScore} onChange={(event)=>setFeedbackScore(Math.max(0,Math.min(100,Number(event.target.value))))}/></label><label className="feedback-note">Nota opcional<input value={feedbackNote} maxLength={1000} onChange={(event)=>setFeedbackNote(event.target.value)} placeholder="¿Qué vio la persona que el agente no vio?"/></label><div className="feedback-buttons"><button className="ghost" onClick={()=>setFeedbackJobId(null)}>Cancelar</button><button className="primary" onClick={()=>void saveFeedback(job)}>Guardar criterio</button></div></div>}</div>):<div className="empty-state">No se encontraron vacantes que pasen los filtros.</div>}</article><article className="panel filters"><div className="panel-head"><div><span className="section-icon blue">☷</span><div><h2>Filtros activos</h2><p>Configuración de Mario</p></div></div></div><div className="filter-row"><span>Modalidad</span><strong>Remoto LATAM / worldwide</strong></div><div className="filter-row"><span>Contratación</span><strong>Contractor · freelance · B2B</strong></div><div className="filter-row"><span>Seniority</span><strong>Senior · Staff · Lead</strong></div><div className="filter-row"><span>Exclusiones</span><strong>FTE · EOR · híbrido · onsite</strong></div><div className="filter-row"><span>Calibración</span><strong>Decisión, motivo, score y nota humana</strong></div><button className="filter-cta" onClick={()=>go("agente")}>Abrir centro Antigravity →</button></article></section>
      </div>}

      {view==="agente" && <div className="page tool-page agent-page">
        <div className="page-title"><div><span className="kicker"><i/> SIN API DE IA</span><h1>Centro Antigravity</h1><p>Gemini hace la investigación dentro de Antigravity; Calibra entrega el contexto, valida el resultado y conserva la memoria.</p></div><span className="agent-mode"><i/> PROTOCOLO V1 ACTIVO</span></div>
        <section className="agent-hero panel"><div><span className="agent-number">01</span><div><small>PAQUETE DE CONTEXTO</small><h2>Todo lo que el agente necesita, en un archivo.</h2><p>Incluye las cuatro rutas de CV, evidencia profesional, filtros duros, estrategia de fuentes, decisiones previas, reglas de verificación y formato de salida.</p></div></div><div className="agent-hero-actions"><button className="primary" onClick={()=>void copyAgentPackage()}>Copiar instrucciones</button><a className="ghost link-button" href="/api/antigravity/export" download>Descargar .md</a><a className="text-link" href="/api/antigravity/export?format=template" download>Plantilla JSON →</a></div></section>
        <div className="editorial-rule"><span>02</span><p>Importación auditable</p><i/></div>
        <section className="agent-import-grid"><article className="panel import-panel"><div className="panel-head"><div><span className="section-icon violet">↯</span><div><h2>Recibir lote de Antigravity</h2><p>Archivo JSON o contenido pegado</p></div></div><label className="file-button">Elegir archivo<input type="file" accept="application/json,.json" onChange={(event)=>void readImportFile(event)}/></label></div><textarea value={importText} onChange={(event)=>{setImportText(event.target.value);setImportFileName("Lote pegado")}} placeholder={'{\n  "protocolVersion": "calibra.antigravity.v1",\n  "jobs": [...]\n}'}/><div className="import-foot"><span>{importFileName} · {importText.length.toLocaleString()} caracteres</span><button className="primary" disabled={importing} onClick={()=>void importBatch()}>{importing?"Validando…":"Validar e importar"}<span>→</span></button></div></article><aside className="panel validation-card"><small>COMPUERTAS DE CALIDAD</small><h2>Solo entra evidencia revisable.</h2><ul><li>Protocolo y campos válidos</li><li>Enlace directo verificado</li><li>Descripción suficiente</li><li>Score entre 0 y 100</li><li>CV SDS, SDE, SDA o SBA</li><li>Deduplicación por URL y empresa + rol</li></ul>{importResult&&<div className={`import-result ${importResult.invalid?"partial":"success"}`}><strong>{importResult.status==="completed"?"Importación completa":"Importación parcial"}</strong><span>{importResult.inserted} nuevas</span><span>{importResult.duplicates} duplicadas</span><span>{importResult.invalid} inválidas</span>{importResult.issues.slice(0,2).map((issue)=><p key={`${issue.index}-${issue.field}`}>Fila {issue.index+1}: {issue.message}</p>)}</div>}</aside></section>
        <div className="editorial-rule"><span>03</span><p>Guía para la persona operadora</p><i/></div>
        <section className="operator-guide panel"><ol><li><span>01</span><div><strong>Descarga el paquete</strong><p>Usa “Descargar .md” y compártelo con la persona que trabajará en Antigravity.</p></div></li><li><span>02</span><div><strong>Abre una tarea nueva en Antigravity</strong><p>Adjunta el archivo y pide: “Ejecuta la búsqueda de Calibra y entrega únicamente el JSON”.</p></div></li><li><span>03</span><div><strong>Deja que Gemini investigue</strong><p>Debe rotar fuentes, abrir cada página directa y descartar cualquier resultado que no pueda verificar.</p></div></li><li><span>04</span><div><strong>Importa el archivo resultante</strong><p>Arrástralo aquí. Calibra valida, deduplica y explica exactamente qué aceptó.</p></div></li><li><span>05</span><div><strong>Calibra en Radar</strong><p>Marca “Aplicaría” o “Descartar”, corrige el score y registra el motivo. Esa memoria se incluye en el siguiente paquete.</p></div></li><li><span>06</span><div><strong>Programa la rutina diaria</strong><p>En Antigravity, configura el paquete para las 07:30, zona America/Mexico_City. El propio archivo contiene las instrucciones y el nombre de entrega diario.</p></div></li></ol><aside><span className="schedule-dot"/><small>RUTINA PREPARADA</small><h3>07:30 · America/Mexico_City</h3><p>Antigravity busca y genera el JSON. La importación y cualquier aplicación siguen requiriendo aprobación humana.</p><a className="ghost link-button" href="/api/antigravity/export" download>Descargar paquete diario</a><em>Calibra no tiene acceso a la cuenta de Antigravity; la persona operadora activa la programación una sola vez.</em></aside></section>
        {agentRuns.length>0&&<><div className="editorial-rule"><span>04</span><p>Historial de entregas</p><i/></div><section className="panel run-history">{agentRuns.slice(0,5).map((run)=><div key={run.id}><span className={`run-state ${run.status}`}/><div><strong>{run.fileName}</strong><p>{new Date(run.createdAt).toLocaleString("es-MX")} · {run.total} registros</p></div><span>{run.inserted} nuevas</span><span>{run.duplicates} duplicadas</span><span>{run.invalid} inválidas</span></div>)}</section></>}
      </div>}

      {view==="pipeline" && <div className="page tool-page"><div className="page-title"><div><span className="kicker"><i/> ESTADO PERSISTENTE</span><h1>Pipeline de aplicaciones</h1><p>Los cambios sobreviven recargas y cada corrección humana queda asociada a la vacante original.</p></div><button className="primary" onClick={()=>go("evaluador")}>+ Nueva evaluación</button></div><section className="pipeline-summary">{["Identificada","Evaluada","Aplicada","En proceso"].map((stage)=><div key={stage}><span>{jobs.filter((j)=>j.status===stage).length}</span><p>{stage}</p></div>)}</section><section className="panel table-wrap"><table><thead><tr><th>VACANTE</th><th>SCORE</th><th>CV</th><th>DECISIÓN HUMANA</th><th>ESTADO</th><th>SIGUIENTE ACCIÓN</th></tr></thead><tbody>{jobs.map((job)=><tr key={job.id}><td><strong><a className="job-link" href={job.sourceUrl} target="_blank" rel="noreferrer">{job.title}</a></strong><span>{job.company} · {job.source}</span></td><td><em className="table-score">{job.humanScore??job.score}</em>{job.humanScore!==null&&<span>Agente: {job.score}</span>}</td><td><b className="cv-chip">{job.recommendedCv}</b></td><td><button className={`human-decision ${job.humanDecision==="Aplicaría"?"yes":job.humanDecision==="Descartar"?"no":"pending"}`} onClick={()=>{openFeedback(job,job.humanDecision==="Descartar"?"Descartar":"Aplicaría");go("radar")}}>{job.humanDecision}</button>{job.humanReason&&<span>{job.humanReason}</span>}</td><td><select value={job.status} onChange={(e)=>void updateStage(job.id,e.target.value as Stage)} className={`status ${stageColors[job.status]}`}>{Object.keys(stageColors).map((stage)=><option key={stage}>{stage}</option>)}</select></td><td><span>{job.nextAction}</span></td></tr>)}</tbody></table>{!jobs.length&&<div className="empty-state">No hay registros todavía.</div>}</section></div>}

      {view==="perfil" && <div className="page tool-page"><div className="page-title"><div><span className="kicker"><i/> FUENTE DE VERDAD</span><h1>Perfil y currículums</h1><p>El scoring utiliza hechos presentes en tus CVs; los gaps se muestran y nunca se inventan.</p></div></div><section className="profile-hero panel"><div className="profile-avatar large">MC</div><div><h2>Mario Casanova</h2><p>Senior Data Scientist · Data Engineer · Applied AI</p><div className="tags"><em>7+ años</em><em>CDMX · remoto</em><em>Inglés C1</em><em>Python + SQL</em></div></div><div className="completion"><strong>100%</strong><span>Perfil cargado</span></div></section><div className="cv-grid">{cvs.map((cv)=><article className="panel cv-card" key={cv.short}><span className={`cv-file ${cv.accent}`}>{cv.short}</span><div><small>CURRÍCULUM INDEXADO</small><h3>{cv.name}</h3><p>{cv.focus}</p><span>Actualizado {cv.updated}</span></div></article>)}</div><section className="panel truth-card"><div><span className="section-icon green">✓</span><div><h2>Scoring explicable activo</h2><p>Cada score conserva skills detectadas, gaps, modalidad, tipo de contrato, CV recomendado y el enlace de origen.</p></div></div><span>ACTIVO</span></section></div>}
    </section>
  </main>;
}
