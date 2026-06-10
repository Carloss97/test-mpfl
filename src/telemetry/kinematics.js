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

export function normalizePointerSample(rawEvent) {
  return {
    timestamp: Number(rawEvent.timeStamp ?? rawEvent.timestamp ?? performance.now()),
    x: Number(rawEvent.clientX ?? rawEvent.x ?? 0),
    y: Number(rawEvent.clientY ?? rawEvent.y ?? 0),
  };
}

export function buildPointerKinematics(samples = []) {
  const normalized = samples
    .map((sample) => ({
      timestamp: Number(sample.timestamp),
      x: Number(sample.x),
      y: Number(sample.y),
    }))
    .filter((sample) => Number.isFinite(sample.timestamp) && Number.isFinite(sample.x) && Number.isFinite(sample.y))
    .sort((a, b) => a.timestamp - b.timestamp);

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
    const dist = distance(previous, current);
    segments.push({
      distance: dist,
      speed: dist / dt,
      endedAt: current.timestamp,
    });
  }

  const totalDistancePx = segments.reduce((sum, segment) => sum + segment.distance, 0);
  const straightLineDistancePx = distance(start, end);
  const speeds = segments.map((segment) => segment.speed);
  const accelerations = [];

  for (let index = 1; index < segments.length; index += 1) {
    const previous = segments[index - 1];
    const current = segments[index];
    const dt = current.endedAt - previous.endedAt;
    if (dt > 0) {
      accelerations.push(Math.abs(current.speed - previous.speed) / dt);
    }
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
    deviationRmsPx: round(deviationRmsPx),
  };
}
