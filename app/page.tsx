"use client";

import { useEffect, useMemo, useState } from "react";

type View = "inicio" | "evaluador" | "radar" | "pipeline" | "perfil";
type Stage = "Identificada" | "Evaluada" | "Confirmada" | "Aplicada" | "En proceso" | "Oferta" | "Descartada";
type Analysis = {
  score: number; technicalScore: number; experienceScore: number; careerScore: number; verdict: string;
  recommendedCv: string; matchedSkills: string[]; gaps: string[]; nextAction: string; eligible: boolean;
  evidence: { remote: boolean; contractor: boolean; location: string; disqualifiers: string[] };
};
type Job = {
  id: string; source: string; sourceUrl: string; title: string; company: string; location: string; description: string;
  publishedAt: string | null; employmentType: string; salary: string; score: number; technicalScore: number;
  experienceScore: number; careerScore: number; verdict: string; recommendedCv: string; matchedSkills: string[];
  gaps: string[]; evidence: Analysis["evidence"]; status: Stage; nextAction: string; isNew: boolean;
};
type SearchRun = { status: string; scanned: number; inserted: number; duplicates: number; rejected: number; completedAt: string | null };

const nav: { id: View; label: string; icon: string }[] = [
  { id: "inicio", label: "Inicio", icon: "⌂" }, { id: "evaluador", label: "Evaluador", icon: "✦" },
  { id: "radar", label: "Radar diario", icon: "◎" }, { id: "pipeline", label: "Pipeline", icon: "▦" },
  { id: "perfil", label: "Perfil y CVs", icon: "◉" },
];
const cvs = [
  { short: "SDS", name: "Senior Data Scientist", accent: "violet", focus: "ML, estadística, LLMs", updated: "Jul 2026" },
  { short: "SDE", name: "Senior Data Engineer", accent: "blue", focus: "Pipelines, cloud, dbt", updated: "Jul 2026" },
  { short: "SDA", name: "Senior Data Analyst", accent: "amber", focus: "BI, SQL, analítica", updated: "Jul 2026" },
  { short: "SBA", name: "Senior Business Analyst", accent: "green", focus: "Estrategia, KPIs, negocio", updated: "Jul 2026" },
];
const stageColors: Record<Stage, string> = { Identificada:"slate", Evaluada:"violet", Confirmada:"green", Aplicada:"blue", "En proceso":"amber", Oferta:"green", Descartada:"red" };

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

  async function loadJobs() {
    try {
      const response = await fetch("/api/jobs", { cache: "no-store" });
      const data = await response.json() as { jobs?: Job[]; lastRun?: SearchRun; error?: string };
      if (!response.ok) throw new Error(data.error || "No fue posible cargar el radar.");
      setJobs(data.jobs || []); setLastRun(data.lastRun || null);
    } catch (error) { flash(error instanceof Error ? error.message : "No fue posible cargar las vacantes."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void loadJobs(); }, []);

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

  return <main className="app-shell">
    {toast && <div className="toast" role="status">✓ {toast}</div>}
    <aside className="sidebar">
      <button className="brand" onClick={() => go("inicio")} aria-label="Ir al inicio"><span className="brand-mark">J.</span><span>Jossette</span><em>WORK / 02</em></button>
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
        <div className="editorial-rule compact"><span>02</span><p>El sistema operativo</p><i/></div><section className="workflow"><div><span>◎</span><p><strong>Radar</strong><small>APIs + verificación directa</small></p></div><i>→</i><div><span>✦</span><p><strong>Evaluador</strong><small>Compara contra evidencia de CV</small></p></div><i>→</i><div><span>▦</span><p><strong>Pipeline</strong><small>Persiste estados y próximos pasos</small></p></div><b>Sin autoaplicar · Mario conserva la decisión final</b></section>
      </div>}

      {view==="evaluador" && <div className="page tool-page">
        <div className="page-title"><div><span className="kicker"><i/> SCORING EXPLICABLE</span><h1>¿Vale la pena aplicar?</h1><p>La vacante se contrasta con evidencia extraída de tus cuatro CVs y con tus filtros no negociables.</p></div><button className="ghost" onClick={()=>{setPosting("");setPostingTitle("");setPostingCompany("");setAnalysis(null);setSelectedJobId(null)}}>Limpiar</button></div>
        <div className="evaluator-layout"><article className="panel paste-panel"><div className="manual-meta"><input value={postingTitle} onChange={(e)=>setPostingTitle(e.target.value)} placeholder="Título del puesto (opcional)" aria-label="Título del puesto"/><input value={postingCompany} onChange={(e)=>setPostingCompany(e.target.value)} placeholder="Empresa (opcional)" aria-label="Empresa"/></div><label htmlFor="posting">DESCRIPCIÓN DE LA VACANTE</label><textarea id="posting" value={posting} onChange={(e)=>setPosting(e.target.value)} placeholder="Pega aquí el texto completo de una vacante real…"/><div className="textarea-foot"><span>{posting.length.toLocaleString()} caracteres</span><button className="primary" disabled={analyzing} onClick={runAnalysis}>{analyzing?"Analizando…":"Analizar vacante"}<span>✦</span></button></div></article><aside className="panel profile-summary"><span className="mini-label">REGLAS ACTIVAS</span><div className="profile-avatar">MC</div><h3>Mario Casanova</h3><p>Senior Data · AI · Analytics</p><div className="profile-facts"><span>✓ Contrato / freelance / B2B</span><span>✓ Remoto LATAM o worldwide</span><span>✓ Senior, Staff o Lead</span><span>× FTE, EOR, híbrido u onsite</span></div><button className="text-button" onClick={()=>go("perfil")}>Ver fuente de verdad →</button></aside></div>
        {analysis&&<section className="analysis panel"><div className="verdict"><div className="big-score"><strong>{analysis.score}</strong><small>/100</small></div><div><span className="match-pill">{analysis.verdict.toUpperCase()}</span><h2>{analysis.eligible?(analysis.score>=75?"Sí, merece atención.":"Revísala con cautela."):"No pasa los filtros duros."}</h2><p>{analysis.eligible?`Match técnico ${analysis.technicalScore}%. ${analysis.gaps.length?`Antes de aplicar conviene confirmar ${analysis.gaps[0]}.`:"No se detectó un gap técnico crítico."}`:"La modalidad, el tipo de contrato o la geografía requieren confirmación antes de continuar."}</p></div><button className="primary" onClick={addToPipeline}>{selectedJobId?"Marcar evaluada":"Guardar en pipeline"}</button></div><div className="analysis-grid"><div><small>MATCH TÉCNICO</small><strong>{analysis.technicalScore}%</strong><p>{analysis.matchedSkills.slice(0,6).join(" · ")||"Sin evidencia suficiente"}</p></div><div><small>EXPERIENCIA</small><strong>{analysis.experienceScore}%</strong><p>Alineación con trayectoria y seniority</p></div><div><small>CV RECOMENDADO</small><strong>{analysis.recommendedCv}</strong><p>{cvs.find((cv)=>cv.short===analysis.recommendedCv)?.name}</p></div><div><small>PREGUNTA CLAVE</small><strong>{analysis.gaps[0]||"Tipo de contrato"}</strong><p>{analysis.nextAction}</p></div></div></section>}
      </div>}

      {view==="radar" && <div className="page tool-page">
        <div className="page-title"><div><span className="kicker"><i/> DESCUBRIMIENTO REAL</span><h1>Radar diario</h1><p>Consulta fuentes estructuradas, aplica tus filtros, elimina duplicados y conserva evidencia de cada decisión.</p></div><button className="primary" disabled={syncing} onClick={runSearch}>{syncing?"Buscando…":"Buscar ahora"}<span>↻</span></button></div>
        <section className="radar-status panel"><div className="radar-orbit"><span>◎</span></div><div><span className="match-pill">{syncing?"BÚSQUEDA EN CURSO":"RADAR OPERATIVO"}</span><h2>Himalayas, Remotive y verificación directa</h2><p>{lastRun?`${lastRun.scanned} revisadas · ${lastRun.inserted} nuevas · ${lastRun.duplicates} duplicadas · ${lastRun.rejected} descartadas por filtros`:`La primera carga incluye tres oportunidades verificadas directamente.`}</p></div><div className="source-dots"><a href="https://himalayas.app" target="_blank" rel="noreferrer">Himalayas</a><a href="https://remotive.com" target="_blank" rel="noreferrer">Remotive</a><span>ATS directos</span></div></section>
        <section className="radar-grid"><article className="panel"><div className="panel-head"><div><span className="section-icon violet">◎</span><div><h2>Resultados reales</h2><p>{jobs.length} oportunidades guardadas</p></div></div></div>{loading?<div className="empty-state">Cargando resultados…</div>:jobs.length?jobs.map((job,i)=><div className="radar-row" key={job.id}><span className="rank">{String(i+1).padStart(2,"0")}</span><div><strong>{job.title}</strong><p>{job.company} · {job.location} · {job.source}</p></div><em>{job.score} match</em><button onClick={()=>evaluateJob(job)}>Evaluar →</button></div>):<div className="empty-state">No se encontraron vacantes que pasen los filtros.</div>}</article><article className="panel filters"><div className="panel-head"><div><span className="section-icon blue">☷</span><div><h2>Filtros activos</h2><p>Configuración de Mario</p></div></div></div><div className="filter-row"><span>Modalidad</span><strong>Remoto LATAM / worldwide</strong></div><div className="filter-row"><span>Contratación</span><strong>Contractor · freelance · B2B</strong></div><div className="filter-row"><span>Seniority</span><strong>Senior · Staff · Lead</strong></div><div className="filter-row"><span>Exclusiones</span><strong>FTE · EOR · híbrido · onsite</strong></div><div className="filter-row"><span>Datos</span><strong>Persistencia y deduplicación activas</strong></div></article></section>
      </div>}

      {view==="pipeline" && <div className="page tool-page"><div className="page-title"><div><span className="kicker"><i/> ESTADO PERSISTENTE</span><h1>Pipeline de aplicaciones</h1><p>Los cambios sobreviven recargas y quedan asociados a la vacante original.</p></div><button className="primary" onClick={()=>go("evaluador")}>+ Nueva evaluación</button></div><section className="pipeline-summary">{["Identificada","Evaluada","Aplicada","En proceso"].map((stage)=><div key={stage}><span>{jobs.filter((j)=>j.status===stage).length}</span><p>{stage}</p></div>)}</section><section className="panel table-wrap"><table><thead><tr><th>VACANTE</th><th>SCORE</th><th>CV</th><th>ESTADO</th><th>SIGUIENTE ACCIÓN</th></tr></thead><tbody>{jobs.map((job)=><tr key={job.id}><td><strong><a className="job-link" href={job.sourceUrl} target="_blank" rel="noreferrer">{job.title}</a></strong><span>{job.company} · {job.source}</span></td><td><em className="table-score">{job.score}</em></td><td><b className="cv-chip">{job.recommendedCv}</b></td><td><select value={job.status} onChange={(e)=>void updateStage(job.id,e.target.value as Stage)} className={`status ${stageColors[job.status]}`}>{Object.keys(stageColors).map((stage)=><option key={stage}>{stage}</option>)}</select></td><td><span>{job.nextAction}</span></td></tr>)}</tbody></table>{!jobs.length&&<div className="empty-state">No hay registros todavía.</div>}</section></div>}

      {view==="perfil" && <div className="page tool-page"><div className="page-title"><div><span className="kicker"><i/> FUENTE DE VERDAD</span><h1>Perfil y currículums</h1><p>El scoring utiliza hechos presentes en tus CVs; los gaps se muestran y nunca se inventan.</p></div></div><section className="profile-hero panel"><div className="profile-avatar large">MC</div><div><h2>Mario Casanova</h2><p>Senior Data Scientist · Data Engineer · Applied AI</p><div className="tags"><em>7+ años</em><em>CDMX · remoto</em><em>Inglés C1</em><em>Python + SQL</em></div></div><div className="completion"><strong>100%</strong><span>Perfil cargado</span></div></section><div className="cv-grid">{cvs.map((cv)=><article className="panel cv-card" key={cv.short}><span className={`cv-file ${cv.accent}`}>{cv.short}</span><div><small>CURRÍCULUM INDEXADO</small><h3>{cv.name}</h3><p>{cv.focus}</p><span>Actualizado {cv.updated}</span></div></article>)}</div><section className="panel truth-card"><div><span className="section-icon green">✓</span><div><h2>Scoring explicable activo</h2><p>Cada score conserva skills detectadas, gaps, modalidad, tipo de contrato, CV recomendado y el enlace de origen.</p></div></div><span>ACTIVO</span></section></div>}
    </section>
  </main>;
}
