import { validateFinalAssessmentPayload } from './finalAssessmentPayload.js';

const REPORT_SCHEMA = 'krumm_talent_report_v1';

function pct(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '0%';
  return `${Math.round(numeric * 100)}%`;
}

function score(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric) : 0;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function dimensions(payload) {
  return Object.values(payload?.talentProfile?.dimensions ?? {});
}

function strengths(payload) {
  return payload?.talentProfile?.globalSummary?.strengths ?? [];
}

function watchAreas(payload) {
  return payload?.talentProfile?.globalSummary?.watchAreas ?? [];
}

function evidenceText(entry) {
  return (entry.evidence ?? []).join('; ') || 'Sin evidencia suficiente';
}

function caveatText(caveats = []) {
  return caveats.length ? caveats.join(', ') : 'Sin caveats críticos';
}

function buildJsonReport(payload) {
  return {
    schemaVersion: REPORT_SCHEMA,
    runId: payload.runId,
    batteryId: payload.batteryId,
    generatedAt: payload.generatedAt,
    participant: payload.participant,
    sections: {
      cover: {
        title: 'KRUMM — Reporte de Evaluación Gamificada',
        modelVersion: payload.edgeAI?.modelVersion ?? null,
      },
      executiveSummary: {
        strengths: strengths(payload),
        watchAreas: watchAreas(payload),
        confidence: payload.talentProfile?.globalSummary?.confidence ?? 0,
        humanReviewOnly: true,
      },
      quality: payload.quality,
      dimensions: payload.talentProfile?.dimensions ?? {},
      gameResults: payload.behavioral?.gameSummary ?? {},
      gameCorrelation: payload.behavioral?.gameCorrelationAggregate ?? {},
      adaptiveDifficulty: payload.behavioral?.adaptiveDifficultyTrace ?? [],
      governance: payload.governance,
      technicalAppendix: {
        featureVectorType: payload.behavioral?.featureVectorV2?.type ?? null,
        featureVectorVersion: payload.behavioral?.featureVectorV2?.version ?? null,
        edgeModelVersion: payload.edgeAI?.modelVersion ?? null,
      },
    },
  };
}

function buildMarkdownReport(payload) {
  const game = payload.behavioral?.gameSummary ?? {};
  const perf = game.performance ?? {};
  const correlation = payload.behavioral?.gameCorrelationAggregate ?? {};
  const adaptiveTrace = payload.behavioral?.adaptiveDifficultyTrace ?? [];
  const lines = [];
  lines.push('# KRUMM — Reporte de Evaluación Gamificada');
  lines.push('');
  lines.push('## 1. Portada');
  lines.push(`- Participante: ${payload.participant?.aliasHash ?? 'sin alias'}`);
  lines.push(`- Rol objetivo declarado: ${payload.participant?.declaredRoleTarget ?? 'no declarado'}`);
  lines.push(`- Batería: ${payload.batteryId}`);
  lines.push(`- Fecha: ${payload.generatedAt}`);
  lines.push(`- Modelo: ${payload.edgeAI?.modelVersion ?? 'no disponible'}`);
  lines.push('');
  lines.push('## 2. Resumen ejecutivo');
  lines.push(`Este reporte resume señales observacionales para revisión humana. Fortalezas observadas: ${strengths(payload).join(', ') || 'sin fortalezas dominantes por sobre umbral'}. Áreas a revisar: ${watchAreas(payload).join(', ') || 'sin áreas críticas bajo umbral'}.`);
  lines.push(`Confianza global del perfil: ${pct(payload.talentProfile?.globalSummary?.confidence ?? 0)}.`);
  lines.push('');
  lines.push('## 3. Calidad de señal');
  lines.push(`- Muestras: ${payload.quality?.sampleCount ?? 0}`);
  lines.push(`- Rostro presente: ${pct(payload.quality?.facePresenceRatio ?? 0)}`);
  lines.push(`- Confianza facial media: ${pct(payload.quality?.meanConfidence ?? 0)}`);
  lines.push(`- Trials correlacionados: ${payload.quality?.correlatedTrialCount ?? 0}`);
  lines.push(`- Caveats: ${caveatText(payload.quality?.caveats ?? [])}`);
  lines.push('');
  lines.push('## 4. Perfil de habilidades');
  lines.push('| Habilidad | Score | Confianza | Evidencia | Caveats |');
  lines.push('|---|---:|---:|---|---|');
  for (const entry of dimensions(payload)) {
    lines.push(`| ${entry.label} | ${score(entry.score)} | ${pct(entry.confidence)} | ${evidenceText(entry)} | ${caveatText(entry.caveats)} |`);
  }
  lines.push('');
  lines.push('## 5. Resultados por juego');
  lines.push(`- Trials completados: ${perf.completedTrialCount ?? 0}/${perf.trialCount ?? 0}`);
  lines.push(`- Accuracy: ${pct(perf.accuracy ?? 0)}`);
  lines.push(`- RT medio: ${Math.round(perf.meanReactionTimeMs ?? 0)}ms`);
  lines.push(`- Score medio: ${pct(perf.meanScore ?? 0)}`);
  lines.push(`- Search efficiency: ${pct(game.visualSearch?.searchEfficiency ?? 0)}`);
  lines.push('');
  lines.push('## 6. Correlación cámara + tarea');
  lines.push(`- Trials correlacionados: ${correlation.completedTrialCount ?? 0}`);
  lines.push(`- Delta postura durante reacción: ${Number(correlation.meanReactionPostureDelta ?? 0).toFixed(3)}`);
  lines.push(`- Delta presencia facial durante reacción: ${Number(correlation.meanReactionFacePresenceDelta ?? 0).toFixed(3)}`);
  lines.push('Estas correlaciones son agregadas; no contienen ventanas crudas, landmarks ni trayectoria de puntero.');
  lines.push('');
  lines.push('## 7. Dificultad adaptativa');
  if (adaptiveTrace.length) {
    adaptiveTrace.forEach((entry, index) => {
      lines.push(`- Recomendación ${index + 1}: ${entry.direction} (${entry.previousLevel ?? '—'} → ${entry.nextLevel ?? '—'}), razones: ${(entry.reasonCodes ?? []).join(', ') || 'sin razones'}.`);
    });
  } else {
    lines.push('- Sin recomendaciones adaptativas registradas.');
  }
  lines.push('');
  lines.push('## 8. Interpretación para revisión humana');
  lines.push('Las habilidades reportadas son indicadores observacionales derivados de desempeño, cámara y telemetría agregada. Deben interpretarse con los caveats de señal y contexto de tarea.');
  lines.push('');
  lines.push('## 9. Gobernanza y privacidad');
  lines.push('- Reporte para revisión humana: sí.');
  lines.push('- Sin decisión automatizada: sí.');
  lines.push('- No se exportó video.');
  lines.push('- No se exportaron frames.');
  lines.push('- No se exportaron landmarks crudos.');
  lines.push('- No se exportaron trayectorias crudas de puntero.');
  lines.push('- No se exportaron eventos crudos de juego.');
  lines.push('');
  lines.push('## 10. Apéndice técnico');
  lines.push(`- Feature vector: ${payload.behavioral?.featureVectorV2?.type ?? 'no disponible'} ${payload.behavioral?.featureVectorV2?.version ?? ''}`.trim());
  lines.push(`- Edge AI: ${payload.edgeAI?.modelVersion ?? 'no disponible'}`);
  lines.push(`- Composite Edge AI: ${score(payload.edgeAI?.composite?.score ?? 0)}`);
  return lines.join('\n');
}

function markdownToHtml(markdown) {
  const lines = markdown.split('\n');
  const html = lines.map((line) => {
    if (line.startsWith('# ')) return `<h1>${escapeHtml(line.slice(2))}</h1>`;
    if (line.startsWith('## ')) return `<h2>${escapeHtml(line.slice(3))}</h2>`;
    if (line.startsWith('- ')) return `<li>${escapeHtml(line.slice(2))}</li>`;
    if (line.startsWith('|')) return `<pre>${escapeHtml(line)}</pre>`;
    if (!line.trim()) return '';
    return `<p>${escapeHtml(line)}</p>`;
  }).join('\n');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>KRUMM Reporte</title></head><body>${html}</body></html>`;
}

export function generateTalentReport({ payload, format = 'markdown' } = {}) {
  const validation = validateFinalAssessmentPayload(payload);
  if (!validation.ok) {
    throw new Error(`Unsafe final assessment payload: ${validation.violations.join(', ')}`);
  }
  if (format === 'json') {
    return {
      format,
      mimeType: 'application/json',
      fileName: `${payload.runId ?? 'assessment'}-talent-report.json`,
      content: buildJsonReport(payload),
    };
  }
  const markdown = buildMarkdownReport(payload);
  if (format === 'html') {
    return {
      format,
      mimeType: 'text/html',
      fileName: `${payload.runId ?? 'assessment'}-talent-report.html`,
      content: markdownToHtml(markdown),
    };
  }
  return {
    format: 'markdown',
    mimeType: 'text/markdown',
    fileName: `${payload.runId ?? 'assessment'}-talent-report.md`,
    content: markdown,
  };
}
