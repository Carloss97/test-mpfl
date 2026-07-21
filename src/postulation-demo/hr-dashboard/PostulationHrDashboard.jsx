import React, { useEffect, useMemo, useState } from 'react';
import {
  HR_DASHBOARD_CANDIDATES,
  HR_DASHBOARD_STATUS,
  buildHrDashboardSummary,
  filterHrDashboardCandidates,
  getHrDashboardRoles,
} from './hrDashboardData.js';
import './postulationHrDashboard.css';

function pct(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${Math.round(numeric * 100)}%` : '—';
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function StatusPill({ status }) {
  const config = HR_DASHBOARD_STATUS[status] ?? { label: 'Sin estado', tone: 'progress' };
  return <span className={`hr-dashboard__status hr-dashboard__status--${config.tone}`}>{config.label}</span>;
}

function MetricCard({ icon, label, value, detail, tone = 'indigo' }) {
  return (
    <article className={`hr-dashboard__metric hr-dashboard__metric--${tone}`}>
      <span className="hr-dashboard__metric-icon" aria-hidden="true">{icon}</span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </article>
  );
}

function CandidateRow({ candidate, selected, onSelect }) {
  return (
    <button
      type="button"
      className={`hr-dashboard__candidate ${selected ? 'hr-dashboard__candidate--selected' : ''}`}
      aria-label={`Abrir ${candidate.alias}`}
      aria-pressed={selected}
      onClick={() => onSelect(candidate.id)}
    >
      <span className="hr-dashboard__avatar" aria-hidden="true">{candidate.alias.slice(-3)}</span>
      <span className="hr-dashboard__candidate-main">
        <strong>{candidate.alias}</strong>
        <small title={candidate.role}>{candidate.role}</small>
      </span>
      <span className="hr-dashboard__candidate-progress">
        <strong>{candidate.completion.completed}/{candidate.completion.total}</strong>
        <small>juegos</small>
      </span>
      <span className="hr-dashboard__candidate-quality">
        <strong>{pct(candidate.sessionQuality)}</strong>
        <small>calidad</small>
      </span>
      <span className="hr-dashboard__candidate-meta">
        <StatusPill status={candidate.status} />
        <small>{formatDate(candidate.completedAt)}</small>
      </span>
      <span className="hr-dashboard__candidate-chevron" aria-hidden="true">›</span>
    </button>
  );
}

function ConstructBar({ construct }) {
  const score = construct.score == null ? null : Number(construct.score);
  return (
    <div className="hr-dashboard__construct">
      <div className="hr-dashboard__construct-head">
        <span>{construct.label}</span>
        <strong>{score == null ? 'Pendiente' : score}</strong>
      </div>
      <div
        className={`hr-dashboard__construct-track ${score == null ? 'hr-dashboard__construct-track--pending' : ''}`}
        role="meter"
        aria-label={`${construct.label}: ${score == null ? 'pendiente' : `${score} de 100`}`}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={score ?? 0}
      >
        <i style={{ width: `${score ?? 0}%` }} />
      </div>
      <small>{score == null ? 'Sin evidencia aún' : `Confianza ${pct(construct.confidence)}`}</small>
    </div>
  );
}

function CandidateDetail({ candidate }) {
  if (!candidate) {
    return (
      <section className="hr-dashboard__detail hr-dashboard__detail--empty" aria-label="Detalle de evaluación">
        <strong>No hay evaluaciones para estos filtros</strong>
        <p>Prueba limpiando la búsqueda o cambiando el estado.</p>
      </section>
    );
  }

  const status = HR_DASHBOARD_STATUS[candidate.status];
  return (
    <section className="hr-dashboard__detail" aria-label={`Detalle de ${candidate.alias}`}>
      <div className="hr-dashboard__detail-head">
        <div className="hr-dashboard__detail-identity">
          <span className="hr-dashboard__detail-avatar" aria-hidden="true">{candidate.alias.slice(-3)}</span>
          <div>
            <span className="hr-dashboard__eyebrow">Perfil de evidencia</span>
            <h2>{candidate.alias}</h2>
            <p>{candidate.role} · {formatDate(candidate.completedAt)}</p>
          </div>
        </div>
        <StatusPill status={candidate.status} />
      </div>

      <div className="hr-dashboard__coverage-note">
        <div>
          <span>Cobertura</span>
          <strong>{candidate.completion.completed}/{candidate.completion.total} juegos</strong>
        </div>
        <div>
          <span>Calidad de sesión</span>
          <strong>{pct(candidate.sessionQuality)}</strong>
        </div>
        <div>
          <span>Estado</span>
          <strong>{status?.label ?? 'Sin estado'}</strong>
        </div>
      </div>

      <p className="hr-dashboard__summary">{candidate.summary}</p>

      <div className="hr-dashboard__section-head">
        <div>
          <span className="hr-dashboard__eyebrow">8 constructos</span>
          <h3>Mapa de capacidades</h3>
        </div>
        <small>Score provisional · no percentil</small>
      </div>
      <div className="hr-dashboard__construct-grid">
        {candidate.constructs.map((construct) => <ConstructBar key={construct.id} construct={construct} />)}
      </div>

      <div className="hr-dashboard__section-head">
        <div>
          <span className="hr-dashboard__eyebrow">Actividad</span>
          <h3>Resultados por juego</h3>
        </div>
      </div>
      <div className="hr-dashboard__game-grid">
        {candidate.games.map((game) => (
          <article key={game.id} className="hr-dashboard__game-card">
            <span>{game.label}</span>
            <strong>{game.metric}</strong>
            <small>{game.value == null ? 'Resultado pendiente' : `Índice de juego ${game.value}`}</small>
          </article>
        ))}
      </div>

      <div className="hr-dashboard__review-grid">
        <article className="hr-dashboard__review-card">
          <span className="hr-dashboard__eyebrow">Siguiente conversación</span>
          <h3>Contexto para entrevista</h3>
          <ul>
            {candidate.interviewPrompts.map((prompt) => <li key={prompt}>{prompt}</li>)}
          </ul>
        </article>
        <article className="hr-dashboard__review-card hr-dashboard__review-card--caveat">
          <span className="hr-dashboard__eyebrow">Antes de interpretar</span>
          <h3>Caveats visibles</h3>
          <ul>
            {candidate.caveats.map((caveat) => <li key={caveat}>{caveat}</li>)}
          </ul>
        </article>
      </div>
    </section>
  );
}

export default function PostulationHrDashboard({ candidates = HR_DASHBOARD_CANDIDATES } = {}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [role, setRole] = useState('all');
  const initialCandidates = useMemo(() => filterHrDashboardCandidates(candidates), [candidates]);
  const [selectedId, setSelectedId] = useState(
    initialCandidates.find((candidate) => candidate.status !== 'in_progress')?.id ?? initialCandidates[0]?.id ?? null,
  );
  const roles = useMemo(() => getHrDashboardRoles(candidates), [candidates]);
  const summary = useMemo(() => buildHrDashboardSummary(candidates), [candidates]);
  const filteredCandidates = useMemo(() => filterHrDashboardCandidates(candidates, {
    query,
    status,
    role,
  }), [candidates, query, role, status]);

  useEffect(() => {
    if (filteredCandidates.some((candidate) => candidate.id === selectedId)) return;
    setSelectedId(
      filteredCandidates.find((candidate) => candidate.status !== 'in_progress')?.id
      ?? filteredCandidates[0]?.id
      ?? null,
    );
  }, [filteredCandidates, selectedId]);

  const selectedCandidate = filteredCandidates.find((candidate) => candidate.id === selectedId)
    ?? filteredCandidates[0]
    ?? null;

  const clearFilters = () => {
    setQuery('');
    setStatus('all');
    setRole('all');
  };

  return (
    <div className="hr-dashboard">
      <header className="hr-dashboard__topbar">
        <a className="hr-dashboard__brand" href="/postulaciones-demo?battery=original" aria-label="KRUMM demo candidato">
          <span aria-hidden="true">K</span>
          <div><strong>KRUMM</strong><small>Talent intelligence</small></div>
        </a>
        <nav aria-label="Navegación HR">
          <a className="hr-dashboard__nav-link hr-dashboard__nav-link--active" href="/postulaciones-demo/hr">Evaluaciones</a>
          <a className="hr-dashboard__nav-link" href="/postulaciones-demo?battery=original">Demo candidato</a>
        </nav>
        <div className="hr-dashboard__user">
          <span aria-hidden="true">HR</span>
          <div><strong>Equipo Personas</strong><small>Entorno demo</small></div>
        </div>
      </header>

      <main className="hr-dashboard__main">
        <section className="hr-dashboard__hero" aria-labelledby="hr-dashboard-title">
          <div>
            <span className="hr-dashboard__eyebrow">Workspace HR · Datos sintéticos</span>
            <h1 id="hr-dashboard-title">Panel de evaluaciones</h1>
            <p>Revisa cobertura, calidad y señales agregadas sin perderte en detalles técnicos.</p>
          </div>
          <div className="hr-dashboard__hero-actions">
            <span className="hr-dashboard__safe-badge">Solo revisión humana</span>
            <a href="/postulaciones-demo?battery=original">Volver a demo candidato</a>
          </div>
        </section>

        <section className="hr-dashboard__metrics" aria-label="Resumen de evaluaciones">
          <MetricCard icon="◎" label="Evaluaciones" value={summary.total} detail={`${summary.completed} completadas`} />
          <MetricCard icon="✓" label="Listas para revisión" value={summary.ready} detail="Con cobertura completa" tone="green" />
          <MetricCard icon="!" label="Revisar caveats" value={summary.needsReview} detail="Requiere contexto" tone="amber" />
          <MetricCard icon="◫" label="Cobertura promedio" value={pct(summary.averageCoverage)} detail="Bloques completados" tone="cyan" />
        </section>

        <section className="hr-dashboard__filters" aria-label="Filtros de evaluaciones">
          <label className="hr-dashboard__search">
            <span>Buscar evaluación</span>
            <input
              type="search"
              value={query}
              placeholder="Alias o rol…"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label>
            <span>Estado de revisión</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">Todos los estados</option>
              <option value="ready">Listo para revisión</option>
              <option value="needs_review">Revisar caveats</option>
              <option value="in_progress">En progreso</option>
            </select>
          </label>
          <label>
            <span>Rol objetivo</span>
            <select value={role} onChange={(event) => setRole(event.target.value)}>
              <option value="all">Todos los roles</option>
              {roles.map((item) => <option value={item} key={item}>{item}</option>)}
            </select>
          </label>
          <button type="button" onClick={clearFilters}>Limpiar filtros</button>
        </section>

        <section className="hr-dashboard__workspace">
          <section className="hr-dashboard__queue" aria-label="Evaluaciones disponibles">
            <div className="hr-dashboard__queue-head">
              <div>
                <span className="hr-dashboard__eyebrow">Cola de revisión</span>
                <h2>Evaluaciones recientes</h2>
              </div>
              <strong>{filteredCandidates.length}</strong>
            </div>
            <div className="hr-dashboard__queue-columns" aria-hidden="true">
              <span>Perfil</span><span>Avance</span><span>Calidad</span><span>Estado</span><span />
            </div>
            <div className="hr-dashboard__candidate-list">
              {filteredCandidates.map((candidate) => (
                <CandidateRow
                  key={candidate.id}
                  candidate={candidate}
                  selected={candidate.id === selectedCandidate?.id}
                  onSelect={setSelectedId}
                />
              ))}
              {filteredCandidates.length === 0 && (
                <div className="hr-dashboard__empty-list">
                  <strong>Sin coincidencias</strong>
                  <p>Prueba otra búsqueda o limpia los filtros.</p>
                </div>
              )}
            </div>
            <p className="hr-dashboard__queue-note">Orden cronológico, no ranking de candidatos.</p>
          </section>

          <CandidateDetail candidate={selectedCandidate} />
        </section>

        <footer className="hr-dashboard__governance">
          <div>
            <strong>No ranking automático</strong>
            <span>Los resultados orientan una revisión humana y deben contrastarse con entrevista y evidencia del rol.</span>
          </div>
          <span>Datos agregados · Sin video · Sin rutas crudas · Sin decisión automática</span>
        </footer>
      </main>
    </div>
  );
}
