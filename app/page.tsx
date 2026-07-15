"use client";

import { useMemo, useState } from "react";

type View = "inicio" | "evaluador" | "radar" | "pipeline" | "perfil";
type Stage = "Identificada" | "Evaluada" | "Confirmada" | "Aplicada" | "En proceso" | "Oferta" | "Descartada";

const nav: { id: View; label: string; icon: string }[] = [
  { id: "inicio", label: "Inicio", icon: "⌂" },
  { id: "evaluador", label: "Evaluador", icon: "✦" },
  { id: "radar", label: "Radar diario", icon: "◎" },
  { id: "pipeline", label: "Pipeline", icon: "▦" },
  { id: "perfil", label: "Perfil y CVs", icon: "◉" },
];

const cvs = [
  { short: "SDS", name: "Senior Data Scientist", accent: "violet", focus: "ML, estadística, LLMs", updated: "Jul 2026" },
  { short: "SDE", name: "Senior Data Engineer", accent: "blue", focus: "Pipelines, cloud, dbt", updated: "Jul 2026" },
  { short: "SDA", name: "Senior Data Analyst", accent: "amber", focus: "BI, SQL, analítica", updated: "Jul 2026" },
  { short: "SBA", name: "Senior Business Analyst", accent: "green", focus: "Estrategia, KPIs, negocio", updated: "Jul 2026" },
];

const initialJobs: { company: string; role: string; source: string; score: number; stage: Stage; cv: string; next: string }[] = [
  { company: "Turing", role: "Data Scientist / Engineer", source: "Talent network", score: 68, stage: "Identificada", cv: "SDS", next: "Confirmar proyecto y compensación" },
  { company: "Vacante de prueba", role: "Senior AI & Data Engineer", source: "Demo", score: 86, stage: "Evaluada", cv: "SDE", next: "Revisar requisito de Kubernetes" },
  { company: "Proceso de ejemplo", role: "Lead Data Scientist", source: "Demo", score: 81, stage: "Aplicada", cv: "SDS", next: "Seguimiento en 3 días" },
];

const samplePosting = `Senior AI & Data Engineer — Remote LATAM
Buscamos una persona senior con experiencia en Python, SQL, machine learning, LLMs y RAG. Construirá pipelines de datos con dbt y Snowflake, desplegará soluciones en GCP y colaborará con producto. Experiencia deseable con Kubernetes. Contrato remoto, compensación competitiva en USD.`;

const stageColors: Record<Stage, string> = {
  Identificada: "slate", Evaluada: "violet", Confirmada: "green", Aplicada: "blue", "En proceso": "amber", Oferta: "green", Descartada: "red",
};

function scoreFromText(text: string) {
  const lowered = text.toLowerCase();
  const skills = ["python", "sql", "machine learning", "llm", "rag", "dbt", "snowflake", "gcp", "azure", "spark", "power bi"];
  const matched = skills.filter((skill) => lowered.includes(skill));
  const remote = /remote|remoto|latam|worldwide/.test(lowered);
  const senior = /senior|staff|lead/.test(lowered);
  const score = Math.min(96, 48 + matched.length * 5 + (remote ? 8 : 0) + (senior ? 5 : 0));
  const cv = /pipeline|dbt|snowflake|spark|data engineer/.test(lowered) ? "SDE" : /business|stakeholder|strategy/.test(lowered) ? "SBA" : /dashboard|power bi|analyst/.test(lowered) ? "SDA" : "SDS";
  return { score, matched, remote, cv };
}

export default function Home() {
  const [view, setView] = useState<View>("inicio");
  const [posting, setPosting] = useState("");
  const [analysis, setAnalysis] = useState<ReturnType<typeof scoreFromText> | null>(null);
  const [jobs, setJobs] = useState(initialJobs);
  const [toast, setToast] = useState("");

  const stats = useMemo(() => ({
    active: jobs.filter((job) => !["Descartada", "Oferta"].includes(job.stage)).length,
    strong: jobs.filter((job) => job.score >= 75).length,
    applications: jobs.filter((job) => ["Aplicada", "En proceso", "Oferta"].includes(job.stage)).length,
  }), [jobs]);

  function go(id: View) { setView(id); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function flash(message: string) { setToast(message); window.setTimeout(() => setToast(""), 2600); }
  function runAnalysis() {
    if (posting.trim().length < 40) { flash("Pega una descripción un poco más completa."); return; }
    setAnalysis(scoreFromText(posting));
  }
  function addToPipeline() {
    if (!analysis) return;
    setJobs((current) => [{ company: "Nueva oportunidad", role: "Vacante recién evaluada", source: "Evaluador", score: analysis.score, stage: "Evaluada", cv: analysis.cv, next: "Confirmar el gap principal" }, ...current]);
    flash("Vacante agregada al pipeline");
  }
  function updateStage(index: number, stage: Stage) {
    setJobs((current) => current.map((job, i) => i === index ? { ...job, stage } : job));
  }

  return (
    <main className="app-shell">
      {toast && <div className="toast" role="status">✓ {toast}</div>}
      <aside className="sidebar">
        <button className="brand" onClick={() => go("inicio")} aria-label="Ir al inicio">
          <span className="brand-mark">J.</span><span>Jossette</span><em>WORK / 01</em>
        </button>
        <div className="workspace-label">ESPACIO DE MARIO</div>
        <nav aria-label="Navegación principal">
          {nav.map((item) => <button key={item.id} className={view === item.id ? "nav-item active" : "nav-item"} onClick={() => go(item.id)}><span>{item.icon}</span>{item.label}{item.id === "radar" && <b>3</b>}</button>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="agent-card"><span className="pulse"/><div><strong>Radar autónomo</strong><small>Última revisión · hoy 06:30</small></div></div>
          <button className="user-card" onClick={() => go("perfil")}><span>MC</span><div><strong>Mario Casanova</strong><small>4 CVs activos</small></div><i>⌄</i></button>
        </div>
      </aside>

      <section className="main-area">
        <header className="topbar"><div><span className="eyebrow">{view === "inicio" ? "JUEVES, 10 DE JULIO" : "ESPACIO DE TRABAJO"}</span><strong>{nav.find((item) => item.id === view)?.label}</strong></div><button className="icon-button" aria-label="Notificaciones">♢<span /></button></header>

        {view === "inicio" && <div className="page dashboard">
          <section className="hero">
            <div><span className="kicker"><i/> TU BÚSQUEDA, EN MOVIMIENTO</span><h1>Buenos días, Mario.</h1><p>Encontramos <strong>3 oportunidades nuevas</strong> y hay una aplicación que necesita seguimiento.</p></div>
            <button className="primary" onClick={() => go("radar")}>Revisar oportunidades <span>→</span></button>
          </section>

          <section className="metric-grid">
            <article><span className="metric-icon violet">◎</span><div><small>OPORTUNIDADES ACTIVAS</small><strong>{stats.active}</strong><p><b>+3</b> desde ayer</p></div></article>
            <article><span className="metric-icon green">↗</span><div><small>MATCH ALTO</small><strong>{stats.strong}</strong><p>Score mayor a 75</p></div></article>
            <article><span className="metric-icon blue">✉</span><div><small>APLICACIONES</small><strong>{stats.applications}</strong><p>Este mes</p></div></article>
            <article><span className="metric-icon amber">◷</span><div><small>POR ATENDER</small><strong>2</strong><p>Próximas 48 horas</p></div></article>
          </section>

          <div className="editorial-rule"><span>01</span><p>Oportunidades y próximos movimientos</p><i /></div>
          <section className="content-grid">
            <article className="panel opportunities"><div className="panel-head"><div><span className="section-icon violet">✦</span><div><h2>Las mejores de hoy</h2><p>Priorizadas para tu perfil</p></div></div><button onClick={() => go("radar")}>Ver todas →</button></div>
              {[
                ["Nimbus Labs", "Senior AI Engineer", "Remoto · LATAM", 91, "SDE"],
                ["Datafold", "Staff Data Scientist", "Remoto · Worldwide", 87, "SDS"],
                ["Fintual", "Senior Analytics Engineer", "Remoto · México", 82, "SDA"],
              ].map((job, i) => <div className="opportunity" key={job[0] as string}><div className={`company-logo c${i}`}>{String(job[0]).slice(0, 1)}</div><div className="job-copy"><strong>{job[1]}</strong><span>{job[0]} · {job[2]}</span><div className="tags"><em>{job[4]} recomendado</em><em>Publicada hoy</em></div></div><div className="score-ring"><b>{job[3]}</b><small>match</small></div><button aria-label={`Abrir ${job[1]}`} onClick={() => { setPosting(samplePosting); go("evaluador"); }}>→</button></div>)}
            </article>

            <article className="panel next-actions"><div className="panel-head"><div><span className="section-icon amber">◷</span><div><h2>Siguientes acciones</h2><p>Lo que mueve tu pipeline</p></div></div></div>
              <div className="action-item urgent"><span>!</span><div><strong>Dar seguimiento a aplicación</strong><p>Proceso de ejemplo · Lead Data Scientist</p><small>Vence hoy</small></div><button onClick={() => go("pipeline")}>Abrir</button></div>
              <div className="action-item"><span>?</span><div><strong>Confirmar experiencia en Kubernetes</strong><p>Vacante de prueba · Senior AI Engineer</p><small>Antes de aplicar</small></div><button onClick={() => go("pipeline")}>Resolver</button></div>
              <div className="action-item"><span>+</span><div><strong>Evaluar una vacante</strong><p>Pega el texto y obtén una recomendación</p></div><button onClick={() => go("evaluador")}>Evaluar</button></div>
            </article>
          </section>

          <div className="editorial-rule compact"><span>02</span><p>El sistema</p><i /></div>
          <section className="workflow"><div><span>◎</span><p><strong>Radar</strong><small>Encuentra y deduplica</small></p></div><i>→</i><div><span>✦</span><p><strong>Evaluador</strong><small>Compara contra tus CVs</small></p></div><i>→</i><div><span>▦</span><p><strong>Pipeline</strong><small>Conserva contexto y próximos pasos</small></p></div><b>Un solo flujo, con aprobación humana antes de aplicar</b></section>
        </div>}

        {view === "evaluador" && <div className="page tool-page">
          <div className="page-title"><div><span className="kicker"><i/> EVALUACIÓN EN SEGUNDOS</span><h1>¿Vale la pena aplicar?</h1><p>Pega una vacante. Jossette la compara con tu perfil, tus restricciones y cuatro versiones de CV.</p></div><button className="ghost" onClick={() => setPosting(samplePosting)}>Usar vacante de ejemplo</button></div>
          <div className="evaluator-layout">
            <article className="panel paste-panel"><label htmlFor="posting">DESCRIPCIÓN DE LA VACANTE</label><textarea id="posting" value={posting} onChange={(e) => setPosting(e.target.value)} placeholder="Pega aquí el texto completo de la vacante…"/><div className="textarea-foot"><span>{posting.length.toLocaleString()} caracteres</span><button className="primary" onClick={runAnalysis}>Analizar vacante <span>✦</span></button></div></article>
            <aside className="panel profile-summary"><span className="mini-label">PERFIL ACTIVO</span><div className="profile-avatar">MC</div><h3>Mario Casanova</h3><p>Senior Data · AI · Analytics</p><div className="profile-facts"><span>✓ Remoto LATAM / worldwide</span><span>✓ Senior, Staff o Lead</span><span>✓ Python · SQL · ML · LLM</span><span>× IoT, hardware y smart home</span></div><button className="text-button" onClick={() => go("perfil")}>Ver configuración →</button></aside>
          </div>
          {analysis && <section className="analysis panel">
            <div className="verdict"><div className="big-score"><strong>{analysis.score}</strong><small>/100</small></div><div><span className="match-pill">MATCH {analysis.score >= 80 ? "ALTO" : analysis.score >= 65 ? "MEDIO" : "BAJO"}</span><h2>{analysis.score >= 75 ? "Sí, aplica." : "Aplica con cautela."}</h2><p>Tu experiencia cubre la mayor parte del núcleo técnico. Conviene confirmar el gap principal antes de invertir tiempo en adaptar el CV.</p></div><button className="primary" onClick={addToPipeline}>Agregar al pipeline</button></div>
            <div className="analysis-grid"><div><small>MATCH TÉCNICO</small><strong>{Math.min(96, analysis.score + 2)}%</strong><p>{analysis.matched.slice(0, 6).join(" · ") || "Experiencia transferible"}</p></div><div><small>MODALIDAD</small><strong>{analysis.remote ? "Compatible" : "Por confirmar"}</strong><p>{analysis.remote ? "Remoto / LATAM detectado" : "No se detectó ubicación clara"}</p></div><div><small>CV RECOMENDADO</small><strong>{analysis.cv}</strong><p>{cvs.find((cv) => cv.short === analysis.cv)?.name}</p></div><div><small>PREGUNTA CLAVE</small><strong>Gap a confirmar</strong><p>¿El requisito de Kubernetes es indispensable o deseable?</p></div></div>
          </section>}
        </div>}

        {view === "radar" && <div className="page tool-page">
          <div className="page-title"><div><span className="kicker"><i/> BÚSQUEDA AUTÓNOMA</span><h1>Radar diario</h1><p>Una evolución del agente existente: fuentes auditables, deduplicación y evaluación antes de mostrarte ruido.</p></div><button className="primary" onClick={() => flash("Revisión iniciada · te avisaremos al terminar")}>Buscar ahora <span>↻</span></button></div>
          <section className="radar-status panel"><div className="radar-orbit"><span>◎</span></div><div><span className="match-pill">AGENTE ACTIVO</span><h2>8 fuentes configuradas</h2><p>Última revisión hoy a las 06:30 · 47 vacantes revisadas · 3 nuevas · 12 duplicadas</p></div><div className="source-dots"><span>LinkedIn</span><span>RemoteOK</span><span>Himalayas</span><span>WWR</span><span>HN</span></div></section>
          <section className="radar-grid">
            <article className="panel"><div className="panel-head"><div><span className="section-icon violet">◎</span><div><h2>Resultados de hoy</h2><p>Ordenados por viabilidad</p></div></div></div>{[91,87,82].map((score, i) => <div className="radar-row" key={score}><span className="rank">0{i+1}</span><div><strong>{["Senior AI Engineer", "Staff Data Scientist", "Senior Analytics Engineer"][i]}</strong><p>{["Nimbus Labs · LATAM", "Datafold · Worldwide", "Fintual · México"][i]}</p></div><em>{score} match</em><button onClick={() => { setPosting(samplePosting); go("evaluador"); }}>Evaluar →</button></div>)}</article>
            <article className="panel filters"><div className="panel-head"><div><span className="section-icon blue">☷</span><div><h2>Filtros activos</h2><p>Configuración de Mario</p></div></div><button onClick={() => go("perfil")}>Editar</button></div><div className="filter-row"><span>Modalidad</span><strong>Remoto LATAM / worldwide</strong></div><div className="filter-row"><span>Seniority</span><strong>Senior · Staff · Lead</strong></div><div className="filter-row"><span>Antigüedad</span><strong>Últimos 7 días</strong></div><div className="filter-row"><span>Exclusiones</span><strong>IoT · hardware · devices</strong></div><div className="filter-row"><span>Compensación</span><strong>Por confirmar</strong></div></article>
          </section>
        </div>}

        {view === "pipeline" && <div className="page tool-page">
          <div className="page-title"><div><span className="kicker"><i/> TODO EN UN SOLO LUGAR</span><h1>Pipeline de aplicaciones</h1><p>Cada vacante conserva su score, CV, duda pendiente y siguiente acción.</p></div><button className="primary" onClick={() => go("evaluador")}>+ Nueva evaluación</button></div>
          <section className="pipeline-summary">{["Identificada", "Evaluada", "Aplicada", "En proceso"].map((stage) => <div key={stage}><span>{jobs.filter((j) => j.stage === stage).length}</span><p>{stage}</p></div>)}</section>
          <section className="panel table-wrap"><table><thead><tr><th>VACANTE</th><th>SCORE</th><th>CV</th><th>ESTADO</th><th>SIGUIENTE ACCIÓN</th></tr></thead><tbody>{jobs.map((job, index) => <tr key={`${job.company}-${index}`}><td><strong>{job.role}</strong><span>{job.company} · {job.source}</span></td><td><em className="table-score">{job.score}</em></td><td><b className="cv-chip">{job.cv}</b></td><td><select value={job.stage} onChange={(e) => updateStage(index, e.target.value as Stage)} className={`status ${stageColors[job.stage]}`}>{Object.keys(stageColors).map((stage) => <option key={stage}>{stage}</option>)}</select></td><td><span>{job.next}</span></td></tr>)}</tbody></table></section>
        </div>}

        {view === "perfil" && <div className="page tool-page">
          <div className="page-title"><div><span className="kicker"><i/> FUENTE DE VERDAD</span><h1>Perfil y currículums</h1><p>El evaluador elige la narrativa más adecuada sin inventar experiencia.</p></div><button className="ghost" onClick={() => flash("Perfil listo para edición en la siguiente versión")}>Editar perfil</button></div>
          <section className="profile-hero panel"><div className="profile-avatar large">MC</div><div><h2>Mario Casanova</h2><p>Senior Data Scientist · Data Engineer · Applied AI</p><div className="tags"><em>7+ años</em><em>CDMX · remoto</em><em>Inglés C1</em><em>Python + SQL</em></div></div><div className="completion"><strong>92%</strong><span>Perfil completo</span></div></section>
          <div className="cv-grid">{cvs.map((cv) => <article className="panel cv-card" key={cv.short}><span className={`cv-file ${cv.accent}`}>{cv.short}</span><div><small>CURRÍCULUM ACTIVO</small><h3>{cv.name}</h3><p>{cv.focus}</p><span>Actualizado {cv.updated}</span></div><button onClick={() => flash(`${cv.name} seleccionado`)}>•••</button></article>)}</div>
          <section className="panel truth-card"><div><span className="section-icon green">✓</span><div><h2>Regla de veracidad activa</h2><p>Jossette solo recomienda logros y habilidades presentes en tus CVs. Los gaps se señalan; nunca se rellenan con experiencia inventada.</p></div></div><span>ACTIVA</span></section>
        </div>}
      </section>
    </main>
  );
}
