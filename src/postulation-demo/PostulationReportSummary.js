function pct(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  return `${Math.round(numeric * 100)}%`;
}

function score(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric) : 0;
}

function safeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function getPostulationQualityCards(artifacts = null) {
  const quality = artifacts?.assessmentSession?.qualitySummary ?? artifacts?.payload?.quality ?? {};
  const consent = artifacts?.assessmentSession?.consent ?? {};
  const validationOk = artifacts?.payload?.validation?.ok === true && artifacts?.validation?.ok !== false;
  return [
    { label: 'Validación', value: validationOk ? 'Aprobada' : 'Bloqueada', tone: validationOk ? 'ok' : 'danger' },
    { label: 'Cámara local', value: consent.camera ? 'Activada' : 'Con caveats', tone: consent.camera ? 'ok' : 'warn' },
    { label: 'Muestras', value: String(quality.sampleCount ?? 0), tone: safeNumber(quality.sampleCount) >= 20 ? 'ok' : 'warn' },
    { label: 'Rostro presente', value: pct(quality.facePresenceRatio), tone: safeNumber(quality.facePresenceRatio) >= 0.7 ? 'ok' : 'warn' },
    { label: 'Confianza facial', value: pct(quality.meanConfidence), tone: safeNumber(quality.meanConfidence) >= 0.55 ? 'ok' : 'warn' },
    { label: 'Trials correlacionados', value: String(quality.correlatedTrialCount ?? 0), tone: safeNumber(quality.correlatedTrialCount) > 0 ? 'ok' : 'warn' },
  ];
}

export function getPostulationGameCards(artifacts = null, completedDemo = null) {
  const blocks = artifacts?.assessmentSession?.blocks ?? completedDemo?.blocks?.map((entry, index) => ({
    index,
    gameId: entry.block?.gameId,
    label: entry.block?.label,
    result: entry.summary,
    trialCount: entry.block?.trialCount,
  })) ?? [];
  return blocks.map((block, index) => {
    const result = block.result ?? {};
    const accuracy = result.accuracy ?? (result.totalTrials ? result.trials?.filter?.((trial) => trial.correct)?.length / result.totalTrials : null);
    const scoreValue = result.score ?? result.meanScore ?? null;
    const meanRt = result.meanReactionTimeMs ?? result.meanRT ?? result.correctGoRT ?? null;
    return {
      id: block.gameId ?? `game-${index}`,
      label: block.label ?? block.gameId ?? 'Juego',
      status: block.status ?? 'completed',
      trialCount: result.trialCount ?? result.completedTrialCount ?? result.totalTrials ?? block.trialCount ?? 0,
      accuracy: Number.isFinite(Number(accuracy)) ? pct(accuracy) : '—',
      score: Number.isFinite(Number(scoreValue)) ? pct(scoreValue) : '—',
      meanRt: Number.isFinite(Number(meanRt)) && Number(meanRt) > 0 ? `${Math.round(Number(meanRt))}ms` : '—',
    };
  });
}

export function getTopTalentDimensions(artifacts = null, limit = 6) {
  const dimensions = Object.values(artifacts?.talentProfile?.dimensions ?? artifacts?.payload?.talentProfile?.dimensions ?? {});
  return dimensions
    .filter(Boolean)
    .sort((a, b) => score(b.score) - score(a.score))
    .slice(0, limit)
    .map((dimension) => ({
      id: dimension.id,
      label: dimension.label ?? dimension.id,
      score: score(dimension.score),
      confidence: pct(dimension.confidence),
      evidence: (dimension.evidence ?? []).slice(0, 2),
      caveats: dimension.caveats ?? [],
      interpretation: dimension.interpretation ?? 'Señal observacional para revisión humana.',
    }));
}

export function getPostulationCaveats(artifacts = null) {
  const quality = artifacts?.assessmentSession?.qualitySummary ?? artifacts?.payload?.quality ?? {};
  const edge = artifacts?.assessmentSession?.edgeAI ?? artifacts?.payload?.edgeAI ?? {};
  return [...new Set([...(quality.caveats ?? []), ...(edge.caveats ?? [])])];
}

export function formatPostulationScore(value) {
  return `${score(value)}`;
}
