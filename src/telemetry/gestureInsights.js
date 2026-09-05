const BLENDSHAPE_SETS = Object.freeze({
  browDown: ['browDownLeft', 'browDownRight'],
  browInnerUp: ['browInnerUp'],
  browOuterUp: ['browOuterUpLeft', 'browOuterUpRight'],
  eyeSquint: ['eyeSquintLeft', 'eyeSquintRight'],
  eyeWide: ['eyeWideLeft', 'eyeWideRight'],
  eyeBlink: ['eyeBlinkLeft', 'eyeBlinkRight'],
  cheekSquint: ['cheekSquintLeft', 'cheekSquintRight'],
  noseSneer: ['noseSneerLeft', 'noseSneerRight'],
  mouthPress: ['mouthPressLeft', 'mouthPressRight'],
  mouthSmile: ['mouthSmileLeft', 'mouthSmileRight'],
  mouthFrown: ['mouthFrownLeft', 'mouthFrownRight'],
  mouthDimple: ['mouthDimpleLeft', 'mouthDimpleRight'],
  mouthStretch: ['mouthStretchLeft', 'mouthStretchRight'],
  mouthFunnel: ['mouthFunnel', 'mouthPucker'],
  jawForward: ['jawForward'],
  jawOpen: ['jawOpen'],
});

/**
 * FACS Action Unit (AU) mapping from MediaPipe blendshapes.
 * MediaPipe blendshapes are regressed approximations — they
 * are NOT true FACS-certified AUs, but they correlate strongly
 * enough to serve as proxy signals for in-browser telemetry.
 * Intensity is derived directly from the blendshape score (0–1).
 */
export const AU_MAP = Object.freeze({
  // Upper face
  AU1:  { blendshapes: ['browInnerUp'],        label: 'Inner Brow Raiser',         side: 'bilateral', region: 'upper' },
  AU2:  { blendshapes: ['browOuterUpLeft', 'browOuterUpRight'], label: 'Outer Brow Raiser',         side: 'bilateral', region: 'upper' },
  AU4:  { blendshapes: ['browDownLeft', 'browDownRight'],      label: 'Brow Lowerer',               side: 'bilateral', region: 'upper' },
  // Mid face
  AU5:  { blendshapes: ['eyeWideLeft', 'eyeWideRight'],        label: 'Upper Lid Raiser',           side: 'bilateral', region: 'mid' },
  AU6:  { blendshapes: ['cheekSquintLeft', 'cheekSquintRight'],label: 'Cheek Raiser',                side: 'bilateral', region: 'mid' },
  AU7:  { blendshapes: ['eyeSquintLeft', 'eyeSquintRight'],    label: 'Lid Tightener',              side: 'bilateral', region: 'mid' },
  AU9:  { blendshapes: ['noseSneerLeft', 'noseSneerRight'],    label: 'Nose Wrinkler',              side: 'bilateral', region: 'mid' },
  AU43: { blendshapes: ['eyeBlinkLeft', 'eyeBlinkRight'],      label: 'Eye Closure (partial)',      side: 'bilateral', region: 'mid', note: 'partial blink proxy' },
  // Lower face — mouth
  AU10: { blendshapes: ['mouthUpperUpLeft', 'mouthUpperUpRight'], label: 'Upper Lip Raiser',        side: 'bilateral', region: 'lower', note: 'mouthUpperUp proxy' },
  AU12: { blendshapes: ['mouthSmileLeft', 'mouthSmileRight'],  label: 'Lip Corner Puller',           side: 'bilateral', region: 'lower' },
  AU14: { blendshapes: ['mouthDimpleLeft', 'mouthDimpleRight'],label: 'Dimpler',                      side: 'bilateral', region: 'lower' },
  AU15: { blendshapes: ['mouthFrownLeft', 'mouthFrownRight'],  label: 'Lip Corner Depressor',        side: 'bilateral', region: 'lower' },
  AU16: { blendshapes: ['mouthLowerDownLeft', 'mouthLowerDownRight'], label: 'Lower Lip Depressor',  side: 'bilateral', region: 'lower', note: 'mouthLowerDown proxy' },
  AU17: { blendshapes: ['mouthChinUp'],                         label: 'Chin Raiser',                 side: 'bilateral', region: 'lower', note: 'mouthChinUp proxy' },
  AU18: { blendshapes: ['mouthFunnel', 'mouthPucker'],         label: 'Lip Puckerer',                side: 'bilateral', region: 'lower' },
  AU20: { blendshapes: ['mouthStretchLeft', 'mouthStretchRight'],label: 'Lip Stretcher',              side: 'bilateral', region: 'lower' },
  AU22: { blendshapes: ['mouthFunnel'],                         label: 'Lip Funneler',               side: 'bilateral', region: 'lower' },
  AU23: { blendshapes: ['mouthPressLeft', 'mouthPressRight'],  label: 'Lip Tightener',               side: 'bilateral', region: 'lower' },
  AU24: { blendshapes: ['mouthPressLeft', 'mouthPressRight'],  label: 'Lip Pressor',                 side: 'bilateral', region: 'lower', note: 'same bs as AU23' },
  AU25: { blendshapes: ['mouthClose'],                          label: 'Lips Part',                  side: 'bilateral', region: 'lower', note: 'inverse of jawOpen' },
  AU26: { blendshapes: ['jawOpen'],                             label: 'Jaw Drop',                    side: 'bilateral', region: 'lower' },
  AU27: { blendshapes: ['jawForward'],                          label: 'Jaw Thrust',                  side: 'bilateral', region: 'lower' },
  AU28: { blendshapes: ['mouthRollLower', 'mouthRollUpper'],    label: 'Lip Suck',                    side: 'bilateral', region: 'lower', note: 'mouthRoll proxy' },
  // Blink
  AU45: { blendshapes: ['eyeBlinkLeft', 'eyeBlinkRight'],      label: 'Blink',                       side: 'bilateral', region: 'mid' },
  // Asymmetry indicators (use left/right diff)
  AU_L12: { blendshapes: ['mouthSmileLeft'],                    label: 'Smile Left (asym)',          side: 'left',     region: 'lower', note: 'unilateral smile' },
  AU_R12: { blendshapes: ['mouthSmileRight'],                   label: 'Smile Right (asym)',         side: 'right',    region: 'lower', note: 'unilateral smile' },
  AU_L14: { blendshapes: ['mouthDimpleLeft'],                   label: 'Dimpler Left (asym)',        side: 'left',     region: 'lower', note: 'unilateral dimpler' },
  AU_R14: { blendshapes: ['mouthDimpleRight'],                  label: 'Dimpler Right (asym)',       side: 'right',    region: 'lower', note: 'unilateral dimpler' },
});

/**
 * Region-based AU groups for higher-level indicators.
 */
export const AU_REGIONS = Object.freeze({
  upper: { label: 'Upper Face', aus: [] },
  mid:   { label: 'Mid Face',   aus: [] },
  lower: { label: 'Lower Face', aus: [] },
});

// Populate regions
for (const [auCode, def] of Object.entries(AU_MAP)) {
  if (AU_REGIONS[def.region]) {
    AU_REGIONS[def.region].aus = [...AU_REGIONS[def.region].aus, auCode];
  }
}

const MICROGESTURE_GROUPS = Object.freeze({
  browTension:     ['browInnerUp', 'browDownLeft', 'browDownRight', 'browOuterUpLeft', 'browOuterUpRight'],
  jawActivation:   ['jawOpen', 'jawForward', 'jawLeft', 'jawRight'],
  ocularTension:   ['eyeSquintLeft', 'eyeSquintRight', 'eyeWideLeft', 'eyeWideRight', 'eyeBlinkLeft', 'eyeBlinkRight'],
  mouthPressure:   ['mouthPressLeft', 'mouthPressRight', 'mouthFunnel', 'mouthPucker'],
  smileIntensity:  ['mouthSmileLeft', 'mouthSmileRight', 'cheekSquintLeft', 'cheekSquintRight'],
  frownIntensity:  ['mouthFrownLeft', 'mouthFrownRight', 'browDownLeft', 'browDownRight'],
  noseActivation:  ['noseSneerLeft', 'noseSneerRight'],
  lipMovement:     ['mouthStretchLeft', 'mouthStretchRight', 'mouthDimpleLeft', 'mouthDimpleRight', 'mouthRollLower', 'mouthRollUpper'],
  eyeAsymmetry:    ['eyeBlinkLeft', 'eyeBlinkRight'], // diff between L/R
  mouthAsymmetry:  ['mouthSmileLeft', 'mouthSmileRight', 'mouthFrownLeft', 'mouthFrownRight'],
});

export const GROUP_LABELS = Object.freeze({
  browTension:     'Tensión de cejas',
  jawActivation:   'Activación mandibular',
  ocularTension:   'Tensión ocular',
  mouthPressure:   'Presión labial',
  smileIntensity:  'Intensidad de sonrisa',
  frownIntensity:  'Intensidad de ceño',
  noseActivation:  'Activación nasal',
  lipMovement:     'Movimiento labial',
  eyeAsymmetry:    'Asimetría ocular',
  mouthAsymmetry:  'Asimetría bucal',
});

function clamp(value, min = 0, max = 1) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function meanBlendshape(samples, names) {
  if (!samples.length || !names.length) return 0;
  let sum = 0;
  for (const sample of samples) {
    let sampleSum = 0;
    for (const name of names) {
      sampleSum += Number(sample?.blendshapes?.[name] ?? 0);
    }
    sum += sampleSum / names.length;
  }
  return sum / samples.length;
}

function round(value, digits = 4) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/**
 * Compute AU scores from a set of samples.
 * Returns an object keyed by AU code with { intensity, label, region, blendshapeSources }.
 */
export function computeAUs(samples = []) {
  const usable = samples.filter((s) => s?.quality?.facePresent);
  if (!usable.length) {
    return Object.fromEntries(
      Object.keys(AU_MAP).map((code) => [code, { intensity: 0, label: AU_MAP[code].label, region: AU_MAP[code].region }])
    );
  }

  return Object.fromEntries(
    Object.entries(AU_MAP).map(([code, def]) => {
      const bsNames = def.blendshapes;
      if (!bsNames.length) return [code, { intensity: 0, label: def.label, region: def.region, note: def.note }];
      const intensity = round(meanBlendshape(usable, bsNames));
      return [code, { intensity, label: def.label, region: def.region, blendshapeSources: bsNames }];
    })
  );
}

/**
 * Return region-aggregated AU intensities.
 */
export function computeAURegionSummary(auScores = {}) {
  const regions = { upper: [], mid: [], lower: [] };
  for (const [code, au] of Object.entries(auScores)) {
    if (regions[au.region]) {
      regions[au.region].push(au.intensity);
    }
  }
  return Object.fromEntries(
    Object.entries(regions).map(([region, intensities]) => [
      region,
      intensities.length ? round(intensities.reduce((s, v) => s + v, 0) / intensities.length) : 0,
    ])
  );
}

/**
 * Compute 4 microgesture group scores from samples.
 */
export function computeMicrogestureGroups(samples = []) {
  const usable = samples.filter((s) => s?.quality?.facePresent);
  if (!usable.length) {
    return Object.fromEntries(
      Object.entries(MICROGESTURE_GROUPS).map(([name]) => [name, { avg: 0, label: GROUP_LABELS[name] }])
    );
  }

  return Object.fromEntries(
    Object.entries(MICROGESTURE_GROUPS).map(([name, bsNames]) => [
      name,
      { avg: round(meanBlendshape(usable, bsNames)), label: GROUP_LABELS[name] },
    ])
  );
}

export function buildGestureInsights(samples = []) {
  const usableSamples = samples.filter((sample) => sample?.quality?.facePresent);
  if (!usableSamples.length) {
    return {
      sampleCount: samples.length,
      usableSampleCount: 0,
      tension: 0,
      attention: 0,
      surprise: 0,
      fatigue: 0,
      frustrationTolerance: 0,
      stress: 0,
      calmness: 0,
      engagement: 0,
      boredom: 0,
      confusion: 0,
      cognitiveLoad: 0,
      auScores: computeAUs([]),
      auRegionSummary: computeAURegionSummary(computeAUs([])),
      microgestureGroups: computeMicrogestureGroups([]),
    };
  }
  const browDown = meanBlendshape(usableSamples, BLENDSHAPE_SETS.browDown);
  const browInnerUp = meanBlendshape(usableSamples, BLENDSHAPE_SETS.browInnerUp);
  const browOuterUp = meanBlendshape(usableSamples, BLENDSHAPE_SETS.browOuterUp);
  const eyeSquint = meanBlendshape(usableSamples, BLENDSHAPE_SETS.eyeSquint);
  const eyeWide = meanBlendshape(usableSamples, BLENDSHAPE_SETS.eyeWide);
  const eyeBlink = meanBlendshape(usableSamples, BLENDSHAPE_SETS.eyeBlink);
  const cheekSquint = meanBlendshape(usableSamples, BLENDSHAPE_SETS.cheekSquint);
  const noseSneer = meanBlendshape(usableSamples, BLENDSHAPE_SETS.noseSneer);
  const mouthPress = meanBlendshape(usableSamples, BLENDSHAPE_SETS.mouthPress);
  const mouthSmile = meanBlendshape(usableSamples, BLENDSHAPE_SETS.mouthSmile);
  const mouthFrown = meanBlendshape(usableSamples, BLENDSHAPE_SETS.mouthFrown);
  const mouthDimple = meanBlendshape(usableSamples, BLENDSHAPE_SETS.mouthDimple);
  const mouthStretch = meanBlendshape(usableSamples, BLENDSHAPE_SETS.mouthStretch);
  const mouthFunnel = meanBlendshape(usableSamples, BLENDSHAPE_SETS.mouthFunnel);
  const jawForward = meanBlendshape(usableSamples, BLENDSHAPE_SETS.jawForward);
  const jawOpen = meanBlendshape(usableSamples, BLENDSHAPE_SETS.jawOpen);

  const tension = clamp((browDown + eyeSquint + mouthPress + jawForward) / 4);
  const attention = clamp(((eyeWide + browInnerUp) / 2) - (eyeBlink * 0.5));
  const surprise = clamp((eyeWide + browInnerUp + jawOpen + mouthFunnel) / 4);
  const fatigue = clamp((eyeBlink * 0.5) + (eyeSquint * 0.3) + ((1 - eyeWide) * 0.2));
  const frustrationTolerance = clamp(1 - tension);
  const stress = clamp((tension + mouthPress + noseSneer) / 3);
  const smile = clamp((mouthSmile + mouthDimple + cheekSquint) / 3);
  const frown = clamp((mouthFrown + browDown) / 2);
  const calmness = clamp(1 - ((tension + surprise) / 2));
  const engagement = clamp((attention * 0.6) + (smile * 0.4) - (fatigue * 0.2));
  const boredom = clamp(((1 - attention) * 0.7) + (eyeBlink * 0.3));
  const confusion = clamp((browInnerUp + browOuterUp + mouthFunnel + mouthStretch) / 4);
  const cognitiveLoad = clamp((browDown + eyeSquint + jawForward + mouthPress) / 4);

    // New proxies
    const valence = clamp((smile - frown + 1) / 2); // -1 to 1 mapped to 0-1
    const arousal = clamp((eyeWide + jawOpen + browInnerUp + browOuterUp) / 4);
    const dominance = clamp(((1 - browDown) + (1 - jawForward) + (1 - mouthPress)) / 3);
    const sincerity = clamp(1 - Math.abs(mouthSmile - cheekSquint)); // Duchenne marker
    const asymmetry = clamp(Math.abs(
      meanBlendshape(usableSamples, ['mouthSmileLeft']) - meanBlendshape(usableSamples, ['mouthSmileRight']) +
      meanBlendshape(usableSamples, ['eyeBlinkLeft']) - meanBlendshape(usableSamples, ['eyeBlinkRight'])
    ) / 2);

    const auScores = computeAUs(usableSamples);
    const auRegionSummary = computeAURegionSummary(auScores);
    const microgestureGroups = computeMicrogestureGroups(usableSamples);

    return {
      sampleCount: samples.length,
      usableSampleCount: usableSamples.length,
      tension, attention, surprise, fatigue, frustrationTolerance,
      stress, calmness, engagement, boredom, confusion, cognitiveLoad,
      valence, arousal, dominance, sincerity, asymmetry,
      smile, frown,
      auScores,
      auRegionSummary,
      microgestureGroups,
    };
}