const RECONSTRUCTIVE_KEYS = new Set([
  'landmarks',
  'faceLandmarks',
  'facialLandmarks',
  'normalizedLandmarks',
  'worldLandmarks',
  'imageData',
  'bitmap',
  'frame',
]);

function cloneSafeObject(value) {
  if (!value || typeof value !== 'object' || ArrayBuffer.isView(value)) return value;
  if (Array.isArray(value)) return value.map(cloneSafeObject);
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !RECONSTRUCTIVE_KEYS.has(key))
      .map(([key, nested]) => [key, cloneSafeObject(nested)]),
  );
}

export function sanitizeFaceSampleForAggregation(sample = {}) {
  return cloneSafeObject(sample) ?? {};
}

export function containsReconstructiveTelemetry(value) {
  if (!value || typeof value !== 'object') return false;
  if (ArrayBuffer.isView(value)) return true;
  if (Array.isArray(value)) return value.some(containsReconstructiveTelemetry);
  return Object.entries(value).some(([key, nested]) => (
    RECONSTRUCTIVE_KEYS.has(key) || containsReconstructiveTelemetry(nested)
  ));
}
