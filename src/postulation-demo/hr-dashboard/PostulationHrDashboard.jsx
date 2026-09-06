import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import {
  HR_DASHBOARD_CANDIDATES,
  HR_DASHBOARD_STATUS,
  buildHrDashboardSummary,
  filterHrDashboardCandidates,
  getHrDashboardRoles,
} from './hrDashboardData.js';
import './postulationHrDashboard.css';

const ROLE_LABEL_EN = Object.freeze({
  'Analista de Operaciones': 'Operations Analyst',
  'Coordinación de Proyectos': 'Project Coordination',
  'Product Operations': 'Product Operations',
});

function pct(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${Math.round(numeric * 100)}%` : '—';
}

function formatDate(value, lang) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return lang === 'en' ? 'No date' : 'Sin fecha';
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'es-CL', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function StatusPill({ status, t }) {
  const config = HR_DASHBOARD_STATUS[status] ?? { label: 'Sin estado', labelEn: 'No status', tone: 'progress' };
  const label = config.labelEn ?? config.label;
  return <span className={`hr-dashboard__status hr-dashboard__status--${config.tone}`}>{t(config.label, label)}</span>;
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

function CandidateRow({ candidate, selected, onSelect, lang, t }) {
  return (
    <button
      type="button"
      className={`hr-dashboard__candidate ${selected ? 'hr-dashboard__candidate--selected' : ''}`}
      aria-label={`${lang === 'en' ? 'Open' : 'Abrir'} ${candidate.alias}`}
      aria-pressed={selected}
      onClick={() => onSelect(candidate.id)}
    >
      <span className="hr-dashboard__avatar" aria-hidden="true">{candidate.alias.slice(-3)}</span>
      <span className="hr-dashboard__candidate-main">
        <strong>{candidate.alias}</strong>
        <small title={t(candidate.role, candidate.roleEn ?? candidate.role)}>{t(candidate.role, candidate.roleEn ?? candidate.role)}</small>
      </span>
      <span className="hr-dashboard__candidate-progress">
        <strong>{candidate.completion.completed}/{candidate.completion.total}</strong>
        <small>{lang === 'en' ? 'games' : 'juegos'}</small>
      </span>
      <span className="hr-dashboard__candidate-quality">
        <strong>{pct(candidate.sessionQuality)}</strong>
        <small>{lang === 'en' ? 'quality' : 'calidad'}</small>
      </span>
      <span className="hr-dashboard__candidate-meta">
        <StatusPill status={candidate.status} t={t} />
        <small>{formatDate(candidate.completedAt, lang)}</small>
      </span>
      <span className="hr-dashboard__candidate-chevron" aria-hidden="true">›</span>
    </button>
  );
}

function ConstructBar({ construct, t }) {
  const score = construct.score == null ? null : Number(construct.score);
  return (
    <div className="hr-dashboard__construct">
      <div className="hr-dashboard__construct-head">
        <span>{t(construct.label, construct.labelEn ?? construct.label)}</span>
        <strong>{score == null ? t('Pendiente', 'Pending') : score}</strong>
      </div>
      <div
        className={`hr-dashboard__construct-track ${score == null ? 'hr-dashboard__construct-track--pending' : ''}`}
        role="meter"
        aria-label={`${t(construct.label, construct.labelEn ?? construct.label)}: ${score == null ? (t('pendiente', 'pending')) : `${score} ${t('de', 'of')} 100`}`}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={score ?? 0}
      >
        <i style={{ width: `${score ?? 0}%` }} />
      </div>
      <small>{score == null ? t('Sin evidencia aún', 'No evidence yet') : `${t('Confianza', 'Confidence')} ${pct(construct.confidence)}`}</small>
    </div>
  );
}

function CandidateDetail({ candidate, t, lang }) {
  if (!candidate) {
    return (
      <section className="hr-dashboard__detail hr-dashboard__detail--empty" aria-label={t('Detalle de evaluación', 'Evaluation detail')}>
        <strong>{t('No hay evaluaciones para estos filtros', 'No evaluations for these filters')}</strong>
        <p>{t('Prueba limpiando la búsqueda o cambiando el estado.', 'Try clearing the search or changing the status.')}</p>
      </section>
    );
  }

  const status = HR_DASHBOARD_STATUS[candidate.status];
  return (
    <section className="hr-dashboard__detail" aria-label={`${t('Detalle de', 'Detail of')} ${candidate.alias}`}>
      <div className="hr-dashboard__detail-head">
        <div className="hr-dashboard__detail-identity">
          <span className="hr-dashboard__detail-avatar" aria-hidden="true">{candidate.alias.slice(-3)}</span>
          <div>
            <span className="hr-dashboard__eyebrow">{t('Perfil de evidencia', 'Evidence profile')}</span>
            <h2>{candidate.alias}</h2>
            <p>{t(candidate.role, candidate.roleEn ?? candidate.role)} · {formatDate(candidate.completedAt, lang)}</p>
          </div>
        </div>
        <StatusPill status={candidate.status} t={t} />
      </div>

      <div className="hr-dashboard__coverage-note">
        <div>
          <span>{t('Cobertura', 'Coverage')}</span>
          <strong>{candidate.completion.completed}/{candidate.completion.total} {t('juegos', 'games')}</strong>
        </div>
        <div>
          <span>{t('Calidad de sesión', 'Session quality')}</span>
          <strong>{pct(candidate.sessionQuality)}</strong>
        </div>
        <div>
          <span>{t('Estado', 'Status')}</span>
          <strong>{status?.label ?? t('Sin estado', 'No status')}</strong>
        </div>
      </div>

      <p className="hr-dashboard__summary">{candidate.summary}</p>

      <div className="hr-dashboard__section-head">
        <div>
          <span className="hr-dashboard__eyebrow">{t('8 constructos', '8 constructs')}</span>
          <h3>{t('Mapa de capacidades', 'Capability map')}</h3>
        </div>
        <small>{t('Score provisional · no percentil', 'Provisional score · not a percentile')}</small>
      </div>
      <div className="hr-dashboard__construct-grid">
        {candidate.constructs.map((construct) => <ConstructBar key={construct.id} construct={construct} t={t} />)}
      </div>

      <div className="hr-dashboard__section-head">
        <div>
          <span className="hr-dashboard__eyebrow">{t('Actividad', 'Activity')}</span>
          <h3>{t('Resultados por juego', 'Results by game')}</h3>
        </div>
      </div>
      <div className="hr-dashboard__game-grid">
        {candidate.games.map((game) => (
          <article key={game.id} className="hr-dashboard__game-card">
            <span>{t(game.label, game.labelEn ?? game.label)}</span>
            <strong>{game.metric}</strong>
            <small>{game.value == null ? t('Resultado pendiente', 'Result pending') : `${t('Índice de juego', 'Game index')} ${game.value}`}</small>
          </article>
        ))}
      </div>

      <div className="hr-dashboard__review-grid">
        <article className="hr-dashboard__review-card">
          <span className="hr-dashboard__eyebrow">{t('Siguiente conversación', 'Next conversation')}</span>
          <h3>{t('Contexto para entrevista', 'Interview context')}</h3>
          <ul>
            {candidate.interviewPrompts.map((prompt) => <li key={prompt}>{prompt}</li>)}
          </ul>
        </article>
        <article className="hr-dashboard__review-card hr-dashboard__review-card--caveat">
          <span className="hr-dashboard__eyebrow">{t('Antes de interpretar', 'Before interpreting')}</span>
          <h3>{t('Caveats visibles', 'Visible caveats')}</h3>
          <ul>
            {candidate.caveats.map((caveat) => <li key={caveat}>{caveat}</li>)}
          </ul>
        </article>
      </div>
    </section>
  );
}

export default function PostulationHrDashboard({ candidates = HR_DASHBOARD_CANDIDATES, dataSource = 'synthetic' } = {}) {
  const { t, language } = useLanguage();
  const lang = language === 'en' ? 'en' : 'es';
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
        <a className="hr-dashboard__brand" href="/postulaciones?battery=original" aria-label={t('KRUMM prueba candidato', 'KRUMM candidate assessment')}>
          <span aria-hidden="true">K</span>
          <div><strong>KRUMM</strong><small>Talent intelligence</small></div>
        </a>
        <nav aria-label={t('Navegación HR', 'HR navigation')}>
          <a className="hr-dashboard__nav-link hr-dashboard__nav-link--active" href="/reclutador">{t('Evaluaciones', 'Evaluations')}</a>
          <a className="hr-dashboard__nav-link" href="/postulaciones?battery=original">{t('Prueba candidato', 'Candidate assessment')}</a>
        </nav>
        <div className="hr-dashboard__user">
          <span aria-hidden="true">HR</span>
          <div><strong>{t('Equipo Personas', 'People Team')}</strong><small>{dataSource === 'real' ? t('Sesiones reales (staging)', 'Live sessions (staging)') : dataSource === 'checking' ? t('Cargando sesiones…', 'Loading sessions…') : t('Entorno demo', 'Demo environment')}</small></div>
        </div>
      </header>

      <main className="hr-dashboard__main">
        <section className="hr-dashboard__hero" aria-labelledby="hr-dashboard-title">
          <div>
            <span className="hr-dashboard__eyebrow">{dataSource === 'real' ? t('Workspace HR · Sesiones reales', 'HR Workspace · Live sessions') : dataSource === 'checking' ? t('Workspace HR · Cargando sesiones…', 'HR Workspace · Loading sessions…') : t('Workspace HR · Datos sintéticos', 'HR Workspace · Synthetic data')}</span>
            <h1 id="hr-dashboard-title">{t('Panel de evaluaciones', 'Evaluation panel')}</h1>
            <p>{t('Revisa cobertura, calidad y señales agregadas sin perderte en detalles técnicos.', 'Review coverage, quality, and aggregated signals without getting lost in technical details.')}</p>
          </div>
          <div className="hr-dashboard__hero-actions">
            <span className="hr-dashboard__safe-badge">{t('Solo revisión humana', 'Human review only')}</span>
            <a href="/postulaciones?battery=original">{t('Volver a prueba candidato', 'Back to candidate assessment')}</a>
          </div>
        </section>

        <section className="hr-dashboard__metrics" aria-label={t('Resumen de evaluaciones', 'Evaluation summary')}>
          <MetricCard icon="◎" label={t('Evaluaciones', 'Evaluations')} value={summary.total} detail={`${summary.completed} ${t('completadas', 'completed')}`} />
          <MetricCard icon="✓" label={t('Listas para revisión', 'Ready for review')} value={summary.ready} detail={t('Con cobertura completa', 'With full coverage')} tone="green" />
          <MetricCard icon="!" label={t('Revisar caveats', 'Review caveats')} value={summary.needsReview} detail={t('Requiere contexto', 'Needs context')} tone="amber" />
          <MetricCard icon="◫" label={t('Cobertura promedio', 'Average coverage')} value={pct(summary.averageCoverage)} detail={t('Bloques completados', 'Completed blocks')} tone="cyan" />
        </section>

        <section className="hr-dashboard__filters" aria-label={t('Filtros de evaluaciones', 'Evaluation filters')}>
          <label className="hr-dashboard__search">
            <span>{t('Buscar evaluación', 'Search evaluation')}</span>
            <input
              type="search"
              value={query}
              placeholder={t('Alias o rol…', 'Alias or role…')}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label>
            <span>{t('Estado de revisión', 'Review status')}</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">{t('Todos los estados', 'All statuses')}</option>
              <option value="ready">{t('Listo para revisión', 'Ready for review')}</option>
              <option value="needs_review">{t('Revisar caveats', 'Review caveats')}</option>
              <option value="in_progress">{t('En progreso', 'In progress')}</option>
            </select>
          </label>
          <label>
            <span>{t('Rol objetivo', 'Target role')}</span>
            <select value={role} onChange={(event) => setRole(event.target.value)}>
              <option value="all">{t('Todos los roles', 'All roles')}</option>
              {roles.map((item) => <option value={item} key={item}>{t(item, ROLE_LABEL_EN[item] ?? item)}</option>)}
            </select>
          </label>
          <button type="button" onClick={clearFilters}>{t('Limpiar filtros', 'Clear filters')}</button>
        </section>

        <section className="hr-dashboard__workspace">
          <section className="hr-dashboard__queue" aria-label={t('Evaluaciones disponibles', 'Available evaluations')}>
            <div className="hr-dashboard__queue-head">
              <div>
                <span className="hr-dashboard__eyebrow">{t('Cola de revisión', 'Review queue')}</span>
                <h2>{t('Evaluaciones recientes', 'Recent evaluations')}</h2>
              </div>
              <strong>{filteredCandidates.length}</strong>
            </div>
            <div className="hr-dashboard__queue-columns" aria-hidden="true">
              <span>{t('Perfil', 'Profile')}</span><span>{t('Avance', 'Progress')}</span><span>{t('Calidad', 'Quality')}</span><span>{t('Estado', 'Status')}</span><span />
            </div>
            <div className="hr-dashboard__candidate-list">
              {filteredCandidates.map((candidate) => (
                <CandidateRow
                  key={candidate.id}
                  candidate={candidate}
                  selected={candidate.id === selectedCandidate?.id}
                  onSelect={setSelectedId}
                  lang={lang}
                  t={t}
                />
              ))}
              {filteredCandidates.length === 0 && (
                <div className="hr-dashboard__empty-list">
                  <strong>{t('Sin coincidencias', 'No matches')}</strong>
                  <p>{t('Prueba otra búsqueda o limpia los filtros.', 'Try another search or clear the filters.')}</p>
                </div>
              )}
            </div>
            <p className="hr-dashboard__queue-note">{t('Orden cronológico, no ranking de candidatos.', 'Chronological order, not candidate ranking.')}</p>
          </section>

          <CandidateDetail candidate={selectedCandidate} t={t} lang={lang} />
        </section>

        <footer className="hr-dashboard__governance">
          <div>
            <strong>{t('No ranking automático', 'No automatic ranking')}</strong>
            <span>{t('Los resultados orientan una revisión humana y deben contrastarse con entrevista y evidencia del rol.', 'Results guide a human review and must be contrasted with interview and role evidence.')}</span>
          </div>
          <span>{t('Datos agregados · Sin video · Sin rutas crudas · Sin decisión automática', 'Aggregated data · No video · No raw routes · No automated decision')}</span>
        </footer>
      </main>
    </div>
  );
}
