/**
 * Report Generator
 *
 * Compila los datos crudos de telemetría y los resultados del Edge AI Engine
 * en un reporte estructurado listo para revisión humana.
 *
 * Formatos soportados:
 *  - markdown: texto formateado para lectura
 *  - json: objeto estructurado programable
 *  - html: versión renderizable en navegador
 */

import { buildGestureInsights, AU_MAP, AU_REGIONS } from './gestureInsights.js';
import { runEdgeAIInference } from './edgeAiEngine.js';

const MIN_SAMPLES_FOR_REPORT = 20;

// ─── Helpers ───

function round(value, digits = 2) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function pct(value) {
  return `${Math.round(clamp(value) * 100)}%`;
}

function levelEmoji(level) {
  switch (level) {
    case 'strong': case 'high': return '🟢';
    case 'moderate': case 'medium': return '🟡';
    case 'low': return '🔴';
    default: return '⚪';
  }
}

function barChart(value, width = 20) {
  const filled = Math.round(clamp(value) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

// ─── Report builders ───

function buildMarkdownReport({ telemetry, edgeAIResult, calibrationProfile, sessionInfo = {} }) {
  const lines = [];

  // Header
  lines.push('# KRUMM Edge AI — Reporte de Sesión');
  lines.push('');
  lines.push(`**Generado:** ${new Date().toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'long' })}`);
  lines.push(`**Modelo:** krumm-edge-ai-v1.0.0 (explainable multidimensional rules)`);
  lines.push(`**Run ID:** ${sessionInfo.runId ?? 'N/A'}`);
  lines.push('');

  // ─── Sección 1: Resumen de sesión ───
  lines.push('## 1. Resumen de Sesión');
  lines.push('');
  lines.push('| Métrica | Valor |');
  lines.push('|---------|-------|');
  lines.push(`| Duración | ${sessionInfo.durationSeconds?.toFixed(1) ?? '—'}s |`);
  lines.push(`| Muestras faciales totales | ${telemetry.sampleCount ?? 0} |`);
  lines.push(`| Muestras utilizables | ${edgeAIResult?.featureExtraction?.usableFacialSamples ?? '—'} |`);
  lines.push(`| Presencia facial | ${pct(telemetry.facePresenceRatio ?? 0)} |`);
  lines.push(`| Confianza media detección | ${round((telemetry.meanConfidence ?? 0) * 100)}% |`);
  lines.push(`| FPS estimado | ${round(telemetry.fpsEstimate ?? 0, 1)} |`);
  lines.push(`| Calibración | ${calibrationProfile?.eligible ? '✓ Válida' : '✗ No elegible' + (calibrationProfile?.caveats?.length ? ` (${calibrationProfile.caveats.join(', ')})` : '')} |`);
  lines.push('');

  // ─── Sección 2: Edge AI Composite ───
  if (edgeAIResult) {
    const composite = edgeAIResult.composite;
    const confidence = edgeAIResult.confidence;

    lines.push('## 2. Score Compuesto');
    lines.push('');
    lines.push(`**Score:** ${composite?.score ?? '—'}% — ${levelEmoji(composite?.level)} ${composite?.level ?? '—'}`);
    lines.push('');
    lines.push('```');
    lines.push(barChart((composite?.score ?? 0) / 100, 30) + ` ${composite?.score ?? 0}%`);
    lines.push('```');
    lines.push('');
    lines.push(`**Confianza del modelo:** ${levelEmoji(confidence?.level)} ${confidence?.level ?? '—'} (${round((confidence?.score ?? 0) * 100, 1)}%)`);
    lines.push('');

    // Confidence factors
    if (confidence?.factors) {
      lines.push('| Factor de confianza | Valor |');
      lines.push('|-------------------|-------|');
      lines.push(`| Presencia facial | ${pct(confidence.factors.facePresenceRatio ?? 0)} |`);
      lines.push(`| Confianza detección | ${pct(confidence.factors.detectionConfidence ?? 0)} |`);
      lines.push(`| Muestras utilizables | ${pct(confidence.factors.usableSampleRatio ?? 0)} |`);
      lines.push(`| Calibración elegible | ${confidence.factors.calibrationEligible ? '✓ Sí' : '✗ No'} |`);
      lines.push(`| Cobertura de trials | ${pct(confidence.factors.trialCoverage ?? 0)} |`);
      lines.push('');
    }

    // ─── Sección 3: Canales de inferencia ───
    lines.push('## 3. Canales de Inferencia');
    lines.push('');

    if (edgeAIResult.channels) {
      for (const [name, channel] of Object.entries(edgeAIResult.channels)) {
        const emoji = levelEmoji(channel.level);
        lines.push(`### ${emoji} ${channel.label} — ${channel.score}% (${channel.level})`);
        lines.push('');
        lines.push('```');
        lines.push(barChart(channel.score / 100, 25) + ` ${channel.score}%`);
        lines.push('```');
        lines.push('');
        lines.push(`**Evidencia:** ${channel.evidence}`);
        lines.push('');

        if (channel.factors) {
          lines.push('| Factor | Valor |');
          lines.push('|--------|-------|');
          for (const [factorName, factorValue] of Object.entries(channel.factors)) {
            const formatted = typeof factorValue === 'number'
              ? (factorValue <= 1 && factorValue >= 0 ? pct(factorValue) : round(factorValue, 3))
              : factorValue;
            lines.push(`| ${factorName} | ${formatted} |`);
          }
          lines.push('');
        }
      }
    }

    // ─── Sección 4: Action Units (FACS) ───
    if (telemetry.insights) {
      const auScores = telemetry.insights.auScores ?? {};
      const auEntries = Object.entries(auScores)
        .filter(([, au]) => au.intensity > 0.01 || !au.note)
        .sort((a, b) => b[1].intensity - a[1].intensity);

      if (auEntries.length) {
        lines.push('## 4. Action Units (FACS)');
        lines.push('');
        lines.push('| AU | Label | Intensidad | Región |');
        lines.push('|----|-------|-----------|--------|');
        for (const [code, au] of auEntries) {
          const regionLabel = AU_REGIONS[au.region]?.label ?? au.region ?? '—';
          const note = au.note ? ` (${au.note})` : '';
          lines.push(`| ${code} | ${au.label}${note} | ${pct(au.intensity)} | ${regionLabel} |`);
        }
        lines.push('');
      }

      // Region summary
      const regionSummary = telemetry.insights.auRegionSummary ?? {};
      if (Object.keys(regionSummary).length) {
        lines.push('### Activación por Región');
        lines.push('');
        for (const [region, score] of Object.entries(regionSummary)) {
          lines.push(`- **${AU_REGIONS[region]?.label ?? region}:** ${pct(score)}`);
        }
        lines.push('');
      }
    }

    // ─── Sección 5: Proxies heurísticos ───
    if (telemetry.insights) {
      const insights = telemetry.insights;
      lines.push('## 5. Indicadores Heurísticos (Proxies)');
      lines.push('');
      lines.push('| Indicador | Valor |');
      lines.push('|-----------|-------|');
      lines.push(`| Tensión | ${pct(insights.tension ?? 0)} |`);
      lines.push(`| Atención | ${pct(insights.attention ?? 0)} |`);
      lines.push(`| Sorpresa | ${pct(insights.surprise ?? 0)} |`);
      lines.push(`| Fatiga | ${pct(insights.fatigue ?? 0)} |`);
      lines.push(`| Tolerancia a frustración | ${pct(insights.frustrationTolerance ?? 0)} |`);
      lines.push(`| Estrés | ${pct(insights.stress ?? 0)} |`);
      lines.push(`| Calma | ${pct(insights.calmness ?? 0)} |`);
      lines.push(`| Engagement | ${pct(insights.engagement ?? 0)} |`);
      lines.push(`| Aburrimiento | ${pct(insights.boredom ?? 0)} |`);
      lines.push(`| Confusión | ${pct(insights.confusion ?? 0)} |`);
      lines.push(`| Carga Cognitiva | ${pct(insights.cognitiveLoad ?? 0)} |`);
      lines.push('');
    }

    // ─── Sección 5.5: Emociones Básicas (Ekman) ───
    if (edgeAIResult.emotions) {
      const emo = edgeAIResult.emotions;
      lines.push('## 5.5. Emociones Básicas (Ekman)');
      lines.push('');
      lines.push(`**Dominante:** ${emo.dominant} (${Math.round(emo.dominantScore * 100)}%)`);
      lines.push(`**Confianza:** ${Math.round(emo.confidence * 100)}%`);
      lines.push('');
      lines.push('| Emoción | Probabilidad |');
      lines.push('|---------|-------------|');
      const probs = emo.probabilities ?? {};
      for (const [emotion, prob] of Object.entries(probs).sort((a, b) => b[1] - a[1])) {
        lines.push(`| ${emotion} | ${Math.round(prob * 100)}% |`);
      }
      lines.push('');
    }

    // ─── Sección 6: Caveats ───
    if (edgeAIResult.caveats?.length) {
      lines.push('## 6. Advertencias (Caveats)');
      lines.push('');
      for (const caveat of edgeAIResult.caveats) {
        lines.push(`- ⚠ ${caveat}`);
      }
      lines.push('');
    }
  }

  // ─── Footer ───
  lines.push('---');
  lines.push('');
  lines.push('*Reporte generado por KRUMM Edge AI. Las señales son observacionales y no constituyen un diagnóstico clínico ni una evaluación psicométrica. Uso exclusivo para revisión humana.*');
  lines.push('');

  return lines.join('\n');
}

function buildHtmlReport({ telemetry, edgeAIResult, calibrationProfile, sessionInfo = {} }) {
  const md = buildMarkdownReport({ telemetry, edgeAIResult, calibrationProfile, sessionInfo });
  // Simple markdown-to-HTML conversion
  let html = md
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Code blocks
    .replace(/```\n([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  // Table conversion (basic)
  html = html.replace(/<p>\|(.+?)\|<br>\|[-| ]+\|<br>((?:\|.+?\|<br>)*)/g, (match, header, rows) => {
    const headerCells = header.split('|').filter(Boolean).map(c => `<th>${c.trim()}</th>`).join('');
    const rowHtml = rows.split('<br>').filter(r => r.startsWith('|')).map(r => {
      const cells = r.split('|').filter(Boolean).map(c => `<td>${c.trim()}</td>`).join('');
      return `<tr>${cells}</tr>`;
    }).join('');
    return `<table><thead><tr>${headerCells}</tr></thead><tbody>${rowHtml}</tbody></table>`;
  });

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KRUMM Edge AI — Reporte de Sesión</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      max-width: 900px;
      margin: 0 auto;
      padding: 32px 20px;
      background: #0a1628;
      color: #e2e8f0;
      line-height: 1.7;
    }
    h1 { color: #4dd4ac; font-size: 1.8rem; border-bottom: 2px solid rgba(77,212,172,0.3); padding-bottom: 12px; }
    h2 { color: #74a7ff; font-size: 1.3rem; margin-top: 32px; }
    h3 { color: #ffd166; font-size: 1.05rem; margin-top: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 0.9rem; }
    th { background: rgba(255,255,255,0.08); padding: 8px 12px; text-align: left; font-weight: 700; color: #dff8ff; }
    td { padding: 6px 12px; border-bottom: 1px solid rgba(255,255,255,0.06); }
    pre { background: rgba(0,0,0,0.3); padding: 12px; border-radius: 10px; overflow-x: auto; font-size: 0.85rem; }
    code { font-family: 'JetBrains Mono', 'Fira Code', monospace; }
    hr { border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 24px 0; }
    strong { color: #f0f4ff; }
  </style>
</head>
<body>
  ${html}
</body>
</html>`;
}

function buildJsonReport({ telemetry, edgeAIResult, calibrationProfile, sessionInfo = {} }) {
  return {
    reportVersion: 'krumm_edge_report_v1',
    generatedAt: new Date().toISOString(),
    model: 'krumm-edge-ai-v1.0.0',
    session: {
      runId: sessionInfo.runId ?? null,
      durationMs: sessionInfo.durationMs ?? 0,
      sampleCount: telemetry.sampleCount ?? 0,
      facePresenceRatio: round(telemetry.facePresenceRatio ?? 0),
      meanDetectionConfidence: round(telemetry.meanConfidence ?? 0),
      fpsEstimate: round(telemetry.fpsEstimate ?? 0, 1),
      calibration: calibrationProfile ? {
        eligible: calibrationProfile.eligible ?? false,
        caveats: calibrationProfile.caveats ?? [],
      } : null,
    },
    edgeAI: edgeAIResult ? {
      composite: edgeAIResult.composite ?? null,
      confidence: edgeAIResult.confidence ?? null,
      channels: edgeAIResult.channels ?? {},
      caveats: edgeAIResult.caveats ?? [],
    } : null,
    actionUnits: telemetry.insights?.auScores
      ? Object.fromEntries(
          Object.entries(telemetry.insights.auScores)
            .filter(([, au]) => au.intensity > 0.01 || !au.note)
            .sort((a, b) => b[1].intensity - a[1].intensity)
            .map(([code, au]) => [code, {
              label: au.label,
              intensity: round(au.intensity),
              region: au.region,
              note: au.note ?? null,
            }]),
        )
      : {},
    auRegionSummary: telemetry.insights?.auRegionSummary
      ? Object.fromEntries(
          Object.entries(telemetry.insights.auRegionSummary).map(([region, score]) => [
            AU_REGIONS[region]?.label ?? region,
            round(score),
          ]),
        )
      : {},
    heuristicProxies: telemetry.insights ? {
      tension: round(telemetry.insights.tension ?? 0),
      attention: round(telemetry.insights.attention ?? 0),
      surprise: round(telemetry.insights.surprise ?? 0),
      fatigue: round(telemetry.insights.fatigue ?? 0),
      frustrationTolerance: round(telemetry.insights.frustrationTolerance ?? 0),
      stress: round(telemetry.insights.stress ?? 0),
      calmness: round(telemetry.insights.calmness ?? 0),
      engagement: round(telemetry.insights.engagement ?? 0),
      boredom: round(telemetry.insights.boredom ?? 0),
      confusion: round(telemetry.insights.confusion ?? 0),
      cognitiveLoad: round(telemetry.insights.cognitiveLoad ?? 0),
    } : {},
    governance: {
      humanReviewOnly: true,
      noAutomatedDecision: true,
      observationalOnly: true,
    },
  };
}

// ─── Main API ───

/**
 * Genera un reporte completo de la sesión.
 *
 * @param {Object} params
 * @param {Object} params.telemetry — objeto de telemetría (de useMemo)
 * @param {Object} params.edgeAIResult — resultado de runEdgeAIInference
 * @param {Object} params.calibrationProfile — perfil de calibración
 * @param {Object} params.sessionInfo — { runId, durationMs, durationSeconds }
 * @param {string} params.format — 'markdown' | 'html' | 'json'
 * @returns {string} Reporte en el formato solicitado
 */
export function generateReport({
  telemetry = {},
  edgeAIResult = null,
  calibrationProfile = null,
  sessionInfo = {},
  format = 'markdown',
} = {}) {
  // Ensure edgeAIResult exists — recompute if needed
  const aiResult = edgeAIResult;

  switch (format) {
    case 'html':
      return buildHtmlReport({ telemetry, edgeAIResult: aiResult, calibrationProfile, sessionInfo });
    case 'json':
      return JSON.stringify(
        buildJsonReport({ telemetry, edgeAIResult: aiResult, calibrationProfile, sessionInfo }),
        null,
        2,
      );
    case 'markdown':
    default:
      return buildMarkdownReport({ telemetry, edgeAIResult: aiResult, calibrationProfile, sessionInfo });
  }
}

/**
 * Verifica si hay suficientes muestras para generar un reporte significativo.
 */
export function hasEnoughSamples(telemetry = {}) {
  return (telemetry.sampleCount ?? 0) >= MIN_SAMPLES_FOR_REPORT;
}

export { MIN_SAMPLES_FOR_REPORT };