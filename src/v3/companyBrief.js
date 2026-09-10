// B3 (KRU-50, Recruiter Dashboard v1 Real): brief de entrevista + exports
// (Markdown/CSV). Módulo puro: sin fetch, sin estado; el único helper de DOM
// es downloadText (asercionado con mocks en tests).
//
// Cumplimiento R-6 — este módulo es una derivación DESCRIPTIVA de los datos
// agregados que /sessions ya devuelve (constructs, caveats, coverage):
//   - No agrega inferencia, constructos ni scores nuevos.
//   - score null = "sin señal" (nunca 0 ni 50) en UI, MD y CSV.
//   - availability provisto por buildRealReportModel ('provisional_score' |
//     'insufficient') — se repite, no se recalcula.
//   - Cada export incluye el watermark humanReviewOnly/noAutomatedDecision/
//     observationalOnly/privacySafe + disclaimer descriptivo.
//   - Los exports no contienen ningún dato crudo (ni lo contienen los inputs:
//     el report model ya pasó por validateRealSessionRowPrivacy).

export const BRIEF_FLAGS = Object.freeze({
  es: 'humanReviewOnly · noAutomatedDecision · observationalOnly · privacySafe',
  en: 'humanReviewOnly · noAutomatedDecision · observationalOnly · privacySafe',
});

export const BRIEF_DISCLAIMER = Object.freeze({
  es: 'Revisión humana únicamente. Los puntajes (0–100) son provisionales y descriptivos: no son percentiles, normas, diagnósticos ni decisiones de contratación.',
  en: 'Human review only. Scores (0–100) are provisional and descriptive: they are not percentiles, norms, diagnoses, or hiring decisions.',
});

export const BRIEF_TITLES = Object.freeze({
  doc: { es: 'Brief de entrevista', en: 'Interview brief' },
  process: { es: 'Proceso', en: 'Process' },
  generated: { es: 'Generado', en: 'Generated' },
  source: { es: 'Fuente', en: 'Source' },
  sourceValue: {
    es: 'datos agregados de sesión (sin datos crudos)',
    en: 'session aggregate data (no raw data included)',
  },
  overall: { es: 'Puntaje global (descriptivo)', en: 'Overall score (descriptive)' },
  noSignal: { es: 'sin señal', en: 'no signal' },
  coverage: { es: 'Cobertura', en: 'Coverage' },
  constructs: { es: 'Constructos', en: 'Constructs' },
  construct: { es: 'Constructo', en: 'Construct' },
  score: { es: 'Score', en: 'Score' },
  availability: { es: 'Disponibilidad', en: 'Availability' },
  prompts: { es: 'Prompts sugeridos', en: 'Suggested prompts' },
  notes: { es: 'Notas', en: 'Notes' },
});

export function pickLocalized(entry, language = 'es') {
  if (!entry || typeof entry !== 'object') return entry == null ? '' : String(entry);
  if (language === 'en') return entry.en ?? entry.es ?? '';
  return entry.es ?? entry.en ?? '';
}

// Brief de UN candidato (report model de buildRealReportModel).
// Devuelve { prompts: [{id, es, en}], notes: [{id, es, en}] } — listas
// estables y auditables; el idioma visible lo resuelve la UI/export.
export function buildInterviewBrief(model) {
  const prompts = [];
  const notes = [];
  if (!model || typeof model !== 'object') return { prompts, notes };

  prompts.push({
    id: 'opening',
    es: 'Pide que cuente cómo decidió y priorizó durante los ejercicios: ¿qué miró primero y por qué?',
    en: 'Ask them to walk through how they decided and prioritized during the exercises: what did they look at first, and why?',
  });

  const constructs = Array.isArray(model.constructs) ? model.constructs : [];
  for (const c of constructs) {
    if (!c || c.score == null) continue;
    prompts.push({
      id: `construct-${c.id ?? 'unknown'}`,
      es: `Sobre "${c.label}" (lectura descriptiva ${c.score}/100, provisional): pide una situación concreta donde haya aplicado esa capacidad y qué resultado obtuvo.`,
      en: `On "${c.labelEn}" (descriptive reading ${c.score}/100, provisional): ask for a concrete situation where they applied that capability and what the outcome was.`,
    });
  }
  for (const c of constructs) {
    if (!c || c.score != null) continue;
    notes.push({
      id: `no-signal-${c.id ?? 'unknown'}`,
      es: `${c.label}: sin señal en esta batería (no interpretar como bajo desempeño). Explorar experiencia relevante en la entrevista.`,
      en: `${c.labelEn}: no signal in this battery (do not interpret as low performance). Explore relevant experience in the interview.`,
    });
  }

  if (model.overall == null) {
    notes.push({
      id: 'no-overall',
      es: 'Sin puntaje global: no hubo juegos suficientes con señal para calcularlo.',
      en: 'No overall score: not enough games with signal to compute one.',
    });
  }

  const caveats = Array.isArray(model.caveats) ? model.caveats : [];
  if (caveats.length > 0) {
    notes.push({
      id: 'caveats',
      es: `Calidad de la señal con restricciones: ${caveats.map((c) => pickLocalized(c, 'es') || String(c)).join(' · ')}`,
      en: `Signal quality is constrained: ${caveats.map((c) => pickLocalized(c, 'en') || String(c)).join(' · ')}`,
    });
  }

  const cov = model.coverage;
  if (cov && Number(cov.total) > 0 && Number(cov.completed) < Number(cov.total)) {
    notes.push({
      id: 'coverage',
      es: `El candidato completó ${cov.completed}/${cov.total} juegos. Explorar el contexto de la sesión (no asumar abandono como señal).`,
      en: `The candidate completed ${cov.completed}/${cov.total} games. Explore the session context (do not assume abandonment as a signal).`,
    });
  }

  return { prompts, notes };
}

function processRoleText(process, language) {
  const role = process?.role;
  if (typeof role === 'string') return role;
  return pickLocalized(role, language);
}

// Export Markdown del proceso (todos sus candidatos). Determinista:
// generatedAt inyectable (tests/CI) — 'YYYY-MM-DD' o Date ISO.
export function buildBriefMarkdown({ process, candidates, language = 'es', generatedAt = null }) {
  const lang = language === 'en' ? 'en' : 'es';
  const T = BRIEF_TITLES;
  const dateStr = generatedAt
    ? (generatedAt instanceof Date ? generatedAt.toISOString() : String(generatedAt)).slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const lines = [];
  lines.push(`# ${T.doc[lang]} — ${processRoleText(process, lang)}`);
  lines.push('');
  lines.push(
    `**${T.process[lang]}:** ${process?.id ?? '—'} · ` +
    `**${T.generated[lang]}:** ${dateStr} · ` +
    `**${T.source[lang]}:** ${T.sourceValue[lang]}`,
  );
  lines.push('');
  lines.push(`> \`${BRIEF_FLAGS[lang]}\``);
  lines.push(`> ${BRIEF_DISCLAIMER[lang]}`);
  lines.push('');
  const list = Array.isArray(candidates) ? candidates : [];
  for (const model of list) {
    const { prompts, notes } = buildInterviewBrief(model);
    lines.push(`## ${model?.alias ?? '—'} · ${model?.status ?? '—'}`);
    lines.push('');
    lines.push(`**${T.overall[lang]}:** ${model?.overall == null ? `*${T.noSignal[lang]}*` : `${model.overall}/100`}`);
    if (model?.coverage && Number(model.coverage.total) > 0) {
      lines.push(`**${T.coverage[lang]}:** ${model.coverage.completed}/${model.coverage.total}`);
    }
    lines.push('');
    const constructs = Array.isArray(model?.constructs) ? model.constructs : [];
    if (constructs.length > 0) {
      lines.push(`### ${T.constructs[lang]}`);
      lines.push('');
      lines.push(`| ${T.construct[lang]} | ${T.score[lang]} | ${T.availability[lang]} |`);
      lines.push('|---|---|---|');
      for (const c of constructs) {
        const label = lang === 'en' ? (c.labelEn ?? c.label) : (c.label ?? c.labelEn);
        lines.push(`| ${label ?? c.id ?? '—'} | ${c.score == null ? '—' : c.score} | ${c.availability ?? '—'} |`);
      }
      lines.push('');
    }
    lines.push(`### ${T.prompts[lang]}`);
    lines.push('');
    prompts.forEach((p, i) => {
      lines.push(`${i + 1}. ${pickLocalized(p, lang)}`);
    });
    if (notes.length > 0) {
      lines.push('');
      lines.push(`### ${T.notes[lang]}`);
      lines.push('');
      for (const n of notes) lines.push(`- ${pickLocalized(n, lang)}`);
    }
    lines.push('');
    lines.push('---');
    lines.push('');
  }
  return lines.join('\n');
}

function csvField(value) {
  const s = value == null ? '' : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// Export CSV del proceso (formato largo: una fila por candidato×constructo).
// Solo agregados del report model (alias, status, fechas, scores 0–100,
// availability, caveats localizadas ES). Score null → celda vacía (nunca 0).
// BOM UTF-8 para Excel.
export function buildProcessCsv({ process, candidates }) {
  const header = [
    'process_id', 'role', 'candidate_alias', 'candidate_status', 'completed_at',
    'overall_score', 'construct_id', 'construct_label', 'construct_score',
    'construct_availability', 'caveats',
  ];
  const rows = [header];
  const role = processRoleText(process, 'es');
  const list = Array.isArray(candidates) ? candidates : [];
  for (const model of list) {
    const constructs = Array.isArray(model?.constructs) ? model.constructs : [];
    const caveatStr = (Array.isArray(model?.caveats) ? model.caveats : [])
      .map((c) => pickLocalized(c, 'es') || String(c))
      .join('; ');
    const base = [
      process?.id ?? '', role, model?.alias ?? '', model?.status ?? '',
      model?.completedAt ?? '', model?.overall == null ? '' : model.overall,
    ];
    if (constructs.length === 0) {
      rows.push([...base, '', '', '', '', caveatStr]);
    } else {
      for (const c of constructs) {
        rows.push([
          ...base,
          c.id ?? '', c.label ?? '',
          c.score == null ? '' : c.score,
          c.availability ?? '',
          caveatStr,
        ]);
      }
    }
  }
  const csv = rows.map((r) => r.map(csvField).join(',')).join('\n') + '\n';
  return `\uFEFF${csv}`;
}

// Descarga client-side (solo agregados; nada crudo sale del navegador).
export function downloadText(filename, text, mime = 'text/plain') {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { ok: true, filename };
}
