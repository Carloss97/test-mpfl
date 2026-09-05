const EMPTY_POINTER_SUMMARY = Object.freeze({
  sampleCount: 0,
  durationMs: 0,
  totalDistancePx: 0,
  straightLineDistancePx: 0,
  pathEfficiency: 0,
  meanSpeedPxPerMs: 0,
  maxSpeedPxPerMs: 0,
  meanAccelerationPxPerMs2: 0,
  maxAccelerationPxPerMs2: 0,
  meanJerkPxPerMs3: 0,
  maxJerkPxPerMs3: 0,
  curvatureRad: 0,
  correctionCount: 0,
  dwellTimeMs: 0,
  deviationRmsPx: 0,
});

function round(value, digits = 5) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function distance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function perpendicularDistanceToLine(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return 0;
  return Math.abs(dy * point.x - dx * point.y + end.x * start.y - end.y * start.x) / length;
}

function angleBetween(a, b) {
  const magA = Math.hypot(a.vx, a.vy);
  const magB = Math.hypot(b.vx, b.vy);
  if (magA === 0 || magB === 0) return 0;
  const dot = a.vx * b.vx + a.vy * b.vy;
  const cos = Math.min(1, Math.max(-1, dot / (magA * magB)));
  return Math.acos(cos);
}

function normalizeSamples(samples = []) {
  return samples
    .map((sample) => ({
      timestamp: Number(sample.timestamp),
      x: Number(sample.x),
      y: Number(sample.y),
    }))
    .filter((sample) => Number.isFinite(sample.timestamp) && Number.isFinite(sample.x) && Number.isFinite(sample.y))
    .sort((a, b) => a.timestamp - b.timestamp);
}

export function normalizePointerSample(rawEvent) {
  return {
    timestamp: Number(rawEvent.timeStamp ?? rawEvent.timestamp ?? performance.now()),
    x: Number(rawEvent.clientX ?? rawEvent.x ?? 0),
    y: Number(rawEvent.clientY ?? rawEvent.y ?? 0),
  };
}

export function buildPointerKinematics(samples = []) {
  const normalized = normalizeSamples(samples);

  if (normalized.length < 2) {
    return {
      ...EMPTY_POINTER_SUMMARY,
      sampleCount: normalized.length,
    };
  }

  const start = normalized[0];
  const end = normalized.at(-1);
  const durationMs = Math.max(0, end.timestamp - start.timestamp);
  const segments = [];

  for (let index = 1; index < normalized.length; index += 1) {
    const previous = normalized[index - 1];
    const current = normalized[index];
    const dt = current.timestamp - previous.timestamp;
    if (dt <= 0) continue;
    const dx = current.x - previous.x;
    const dy = current.y - previous.y;
    const dist = Math.hypot(dx, dy);
    segments.push({
      distance: dist,
      speed: dist / dt,
      vx: dx / dt,
      vy: dy / dt,
      duration: dt,
      endedAt: current.timestamp,
    });
  }

  const totalDistancePx = segments.reduce((sum, segment) => sum + segment.distance, 0);
  const straightLineDistancePx = distance(start, end);
  const speeds = segments.map((segment) => segment.speed);
  const accelerations = [];
  const accelerationEvents = [];
  let curvatureRad = 0;
  let correctionCount = 0;
  let dwellTimeMs = 0;

  for (const segment of segments) {
    if (segment.distance < 1) dwellTimeMs += segment.duration;
  }

  for (let index = 1; index < segments.length; index += 1) {
    const previous = segments[index - 1];
    const current = segments[index];
    const dt = current.endedAt - previous.endedAt;
    const angle = angleBetween(previous, current);
    curvatureRad += angle;
    if (angle > Math.PI / 4) correctionCount += 1;
    if (dt > 0) {
      const acceleration = Math.abs(current.speed - previous.speed) / dt;
      accelerations.push(acceleration);
      accelerationEvents.push({ value: acceleration, endedAt: current.endedAt });
    }
  }

  const jerks = [];
  for (let index = 1; index < accelerationEvents.length; index += 1) {
    const previous = accelerationEvents[index - 1];
    const current = accelerationEvents[index];
    const dt = current.endedAt - previous.endedAt;
    if (dt > 0) jerks.push(Math.abs(current.value - previous.value) / dt);
  }

  const deviationSquared = normalized.map((sample) => perpendicularDistanceToLine(sample, start, end) ** 2);
  const deviationRmsPx = Math.sqrt(deviationSquared.reduce((sum, value) => sum + value, 0) / normalized.length);

  return {
    sampleCount: normalized.length,
    durationMs: round(durationMs),
    totalDistancePx: round(totalDistancePx),
    straightLineDistancePx: round(straightLineDistancePx),
    pathEfficiency: totalDistancePx > 0 ? round(straightLineDistancePx / totalDistancePx) : 0,
    meanSpeedPxPerMs: durationMs > 0 ? round(totalDistancePx / durationMs) : 0,
    maxSpeedPxPerMs: speeds.length ? round(Math.max(...speeds)) : 0,
    meanAccelerationPxPerMs2: accelerations.length
      ? round(accelerations.reduce((sum, value) => sum + value, 0) / accelerations.length)
      : 0,
    maxAccelerationPxPerMs2: accelerations.length ? round(Math.max(...accelerations)) : 0,
    meanJerkPxPerMs3: jerks.length ? round(jerks.reduce((sum, value) => sum + value, 0) / jerks.length) : 0,
    maxJerkPxPerMs3: jerks.length ? round(Math.max(...jerks)) : 0,
    curvatureRad: round(curvatureRad),
    correctionCount,
    dwellTimeMs: round(dwellTimeMs),
    deviationRmsPx: round(deviationRmsPx),
  };
}

function overshootCount(samples, target) {
  if (!target || samples.length < 2) return 0;
  const start = samples[0];
  const tx = Number(target.x);
  const ty = Number(target.y);
  if (!Number.isFinite(tx) || !Number.isFinite(ty)) return 0;
  const vx = tx - start.x;
  const vy = ty - start.y;
  const targetLenSq = vx * vx + vy * vy;
  if (targetLenSq === 0) return 0;
  let count = 0;
  for (const sample of samples.slice(1)) {
    const projection = ((sample.x - start.x) * vx + (sample.y - start.y) * vy) / targetLenSq;
    if (projection > 1.05) count += 1;
  }
  return count;
}

export function summarizePointerTrial(samples = [], { shownAt = -Infinity, responseAt = Infinity, target = null, click = null } = {}) {
  const trialSamples = normalizeSamples(samples).filter((sample) => sample.timestamp >= shownAt && sample.timestamp <= responseAt);
  const summary = buildPointerKinematics(trialSamples);
  const clickDistance = click && target ? distance({ x: Number(click.x), y: Number(click.y) }, { x: Number(target.x), y: Number(target.y) }) : null;
  const radius = Number(target?.radius ?? 0);

  return {
    ...summary,
    shownAt: Number.isFinite(Number(shownAt)) ? Number(shownAt) : null,
    responseAt: Number.isFinite(Number(responseAt)) ? Number(responseAt) : null,
    clickDistanceToTargetPx: clickDistance === null ? null : round(clickDistance),
    hit: clickDistance !== null && radius > 0 ? clickDistance <= radius : null,
    overshootCount: overshootCount(trialSamples, target),
    privacy: {
      rawPointerPathStored: false,
      aggregateOnly: true,
    },
  };
}
