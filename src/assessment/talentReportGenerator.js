import { validateFinalAssessmentPayload } from './finalAssessmentPayload.js';

const REPORT_SCHEMA = 'krumm_talent_report_v1';

function pct(value) {
  if (value == null) return 'No disponible';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 'No disponible';
  return `${Math.round(numeric * 100)}%`;
}

function scoreLabel(value) {
  if (value == null) return 'No medido';
  const numeric = Number(value);
  return Number.isFinite(numeric) ? String(Math.round(numeric)) : 'No medido';
}

function finiteLabel(value, digits = 3) {
  if (value == null) return 'No disponible';
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(digits) : 'No disponible';
}

function availabilityLabel(value) {
  if (value === 'provisional_score') return 'Lectura preliminar';
  if (value === 'descriptive_only') return 'Solo descriptivo';
  if (value === 'insufficient') return 'Evidencia insuficiente';
  if (value === 'not_measured') return 'No medido';
  return 'Sin clasificar';
}

function hasOriginalTalentFramework(payload = {}) {
  return Boolean(payload?.talentFramework?.constructs)
    && (
      String(payload?.batteryId ?? '').includes('original_games')
      || Boolean(payload?.behavioral?.originalGameFeatureVector)
    );
}

function frameworkConstructs(payload = {}) {
  const framework = payload?.talentFramework ?? {};
  const constructs = framework.constructs ?? {};
  return (framework.constructOrder ?? Object.keys(constructs))
    .map((id) => ({ id, ...constructs[id] }))
    .filter((entry) => entry.id);
}

function formatDurationMs(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return '—';
  if (numeric >= 1000) {
    const seconds = numeric / 1000;
    return `${seconds < 10 ? seconds.toFixed(1) : Math.round(seconds)}s`;
  }
  return `${Math.round(numeric)}ms`;
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
        confidence: payload.talentProfile?.globalSummary?.confidence ?? null,
        humanReviewOnly: true,
      },
      quality: payload.quality,
      dimensions: payload.talentProfile?.dimensions ?? {},
      gameSummary: payload.behavioral?.gameSummary ?? {},
      gameResults: payload.behavioral?.gameResults ?? [],
      gameCorrelation: payload.behavioral?.gameCorrelationAggregate ?? {},
      originalGameFeatureVector: payload.behavioral?.originalGameFeatureVector ?? null,
      talentFramework: payload.talentFramework ?? null,
      adaptiveDifficulty: payload.behavioral?.adaptiveDifficultyTrace ?? [],
      governance: payload.governance,
      technicalAppendix: {
        featureVectorType: payload.behavioral?.featureVectorV2?.type ?? null,
        featureVectorVersion: payload.behavioral?.featureVectorV2?.version ?? null,
        originalGameFeatureVectorType: payload.behavioral?.originalGameFeatureVector?.type ?? null,
        talentFrameworkSchema: payload.talentFramework?.schemaVersion ?? null,
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
  const originalFramework = hasOriginalTalentFramework(payload);
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
  if (originalFramework) {
    const constructList = frameworkConstructs(payload);
    const scoredCount = constructList.filter((entry) => entry.score != null).length;
    const descriptiveCount = constructList.filter((entry) => entry.availability === 'descriptive_only').length;
    lines.push(descriptiveCount === 0
      ? `Este reporte resume señales agregadas de la batería original para revisión humana. Los ${scoredCount} constructos tienen lectura preliminar de demo con confianza informada por constructo.`
      : `Este reporte resume señales agregadas de la batería original para revisión humana. ${scoredCount} constructos tienen lectura preliminar de demo y ${descriptiveCount} lectura(s) requieren interpretación descriptiva prudente.`);
    lines.push('Confianza global del perfil: no aplica para esta batería experimental; la confianza se informa por constructo en el mapa de evidencia para evitar mezclar el perfil DG legacy con los juegos originales.');
  } else {
    lines.push(`Este reporte resume señales observacionales para revisión humana. Fortalezas observadas: ${strengths(payload).join(', ') || 'sin fortalezas dominantes por sobre umbral'}. Áreas a revisar: ${watchAreas(payload).join(', ') || 'sin áreas críticas bajo umbral'}.`);
    lines.push(`Confianza global del perfil: ${pct(payload.talentProfile?.globalSummary?.confidence)}.`);
  }
  lines.push('');
  lines.push('## 3. Calidad de señal');
  lines.push(`- Muestras: ${payload.quality?.sampleCount ?? 0}`);
  lines.push(`- Rostro presente: ${pct(payload.quality?.facePresenceRatio)}`);
  lines.push(`- Confianza facial media: ${pct(payload.quality?.meanConfidence)}`);
  lines.push(`- Trials correlacionados: ${payload.quality?.correlatedTrialCount ?? 0}`);
  lines.push(`- Caveats: ${caveatText(payload.quality?.caveats ?? [])}`);
  lines.push('');
  if (originalFramework) {
    lines.push('## 4. Mapa de evidencia KRUMM — batería original');
    lines.push('| Constructo | Estado | Score | Confianza por constructo | Narrativa |');
    lines.push('|---|---|---:|---:|---|');
    for (const entry of frameworkConstructs(payload)) {
      lines.push(`| ${entry.label ?? entry.id} | ${availabilityLabel(entry.availability)} | ${scoreLabel(entry.score)} | ${pct(entry.confidence)} | ${entry.narrative ?? ''} |`);
    }
    lines.push('Nota: se omite el perfil DG global porque no corresponde a los juegos originales. No hay percentiles, normas, cortes ni ranking automático.');
    lines.push('');
  } else {
    lines.push('## 4. Perfil de habilidades');
    lines.push('| Habilidad | Score | Confianza | Evidencia | Caveats |');
    lines.push('|---|---:|---:|---|---|');
    for (const entry of dimensions(payload)) {
      lines.push(`| ${entry.label} | ${scoreLabel(entry.score)} | ${pct(entry.confidence)} | ${evidenceText(entry)} | ${caveatText(entry.caveats)} |`);
    }
    lines.push('');
  }
  lines.push('## 5. Resultados por juego');
  if (payload.behavioral?.gameResults?.length) {
    lines.push('| Juego | Estado | Métrica principal | Precisión / eficiencia relevante | Tiempo |');
    lines.push('|---|---|---|---|---:|');
    for (const block of payload.behavioral.gameResults) {
      const result = block.result ?? {};
      let primary = `${result.completedTrialCount ?? result.trialCount ?? block.trialCount ?? 0} ensayo(s)`;
      let precision = result.accuracy != null ? pct(result.accuracy) : 'No aplica';
      if (block.gameId === 'laser_puzzle') {
        primary = `${result.solvedLevels ?? 0}/${result.levelCount ?? 0} mapas resueltos`;
        precision = Number(result.levelCount) > 0 ? `Precisión ${pct((Number(result.solvedLevels) || 0) / Number(result.levelCount))}; eficiencia ${pct(result.solutionEfficiency)}` : 'No aplica';
      } else if (block.gameId === 'passenger_routes') {
        primary = `${result.passengersDelivered ?? 0}/${result.destinationCount ?? 0} entregas`;
        precision = Number(result.destinationCount) > 0 ? `Precisión ${pct((Number(result.passengersDelivered) || 0) / Number(result.destinationCount))}; eficiencia ruta ${pct(result.routeEfficiency)}` : 'No aplica';
      } else if (block.gameId === 'balloon_risk') {
        primary = `${result.roundsCompleted ?? 0}/${result.totalRounds ?? 0} rondas`;
        precision = `Eficiencia riesgo ${pct(result.riskEfficiency ?? result.score)}`;
      } else if (block.gameId === 'team_coordination') {
        primary = `${result.completedScenarioCount ?? 0}/${result.scenarioCount ?? 0} escenarios`;
        precision = `Coordinación ${pct(result.score)}; adaptabilidad ${pct(result.adaptabilityScore)}`;
      }
      lines.push(`| ${block.label ?? block.gameId ?? 'Juego'} | ${block.status ?? 'completed'} | ${primary} | ${precision} | ${formatDurationMs(result.timeMs ?? result.meanReactionTimeMs)} |`);
    }
  } else {
    lines.push(`- Trials completados: ${perf.completedTrialCount ?? 0}/${perf.trialCount ?? 0}`);
    lines.push(`- Accuracy: ${pct(perf.accuracy)}`);
    lines.push(`- RT medio: ${Math.round(perf.meanReactionTimeMs ?? 0)}ms`);
    lines.push(`- Score medio: ${pct(perf.meanScore)}`);
    lines.push(`- Search efficiency: ${pct(game.visualSearch?.searchEfficiency)}`);
  }
  lines.push('');
  lines.push('## 6. Correlación cámara + tarea');
  lines.push(`- Trials correlacionados: ${correlation.completedTrialCount ?? 0}`);
  lines.push(`- Delta postura durante reacción: ${finiteLabel(correlation.meanReactionPostureDelta)}`);
  lines.push(`- Delta presencia facial durante reacción: ${finiteLabel(correlation.meanReactionFacePresenceDelta)}`);
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
  lines.push(`- Feature vector juegos originales: ${payload.behavioral?.originalGameFeatureVector?.type ?? 'no disponible'} ${payload.behavioral?.originalGameFeatureVector?.version ?? ''}`.trim());
  lines.push(`- Framework R-6: ${payload.talentFramework?.schemaVersion ?? 'no disponible'} ${payload.talentFramework?.version ?? ''}`.trim());
  lines.push(`- Edge AI: ${payload.edgeAI?.modelVersion ?? 'no disponible'}`);
  lines.push(`- Composite Edge AI: ${scoreLabel(payload.edgeAI?.composite?.score)}`);
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
