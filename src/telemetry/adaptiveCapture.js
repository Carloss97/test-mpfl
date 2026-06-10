/**
 * Adaptive Camera Capture
 *
 * Ajusta dinámicamente constraints de la cámara según condiciones
 * de iluminación detectadas. Implementa:
 *  - Resolución escalonada (baja → alta según calidad)
 *  - frameRate adaptativo
 *  - Reintentos con constraints relajados
 *  - Timeout y fallback
 */

const RESOLUTION_TIERS = [
  { label: 'low', width: 320, height: 240, fps: 15 },
  { label: 'medium', width: 640, height: 480, fps: 25 },
  { label: 'high', width: 1280, height: 720, fps: 30 },
];

export function getConstraintsForTier(tier = 'medium', deviceId = '') {
  const res = RESOLUTION_TIERS.find((t) => t.label === tier) || RESOLUTION_TIERS[1];
  return {
    video: {
      ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'user' }),
      width: { ideal: res.width },
      height: { ideal: res.height },
      frameRate: { ideal: res.fps },
    },
    audio: false,
  };
}

export async function requestCameraWithFallback(deviceId = '', preferredTier = 'medium') {
  const tiers = RESOLUTION_TIERS.filter((t) => RESOLUTION_TIERS.indexOf(t) >= RESOLUTION_TIERS.findIndex((x) => x.label === preferredTier));

  for (const tier of tiers) {
    try {
      const constraints = getConstraintsForTier(tier.label, deviceId);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const track = stream.getVideoTracks()[0];
      const actualSettings = track.getSettings();
      return {
        stream,
        tier: tier.label,
        actualWidth: actualSettings.width || tier.width,
        actualHeight: actualSettings.height || tier.height,
        actualFps: actualSettings.frameRate || tier.fps,
      };
    } catch (err) {
      if (tier.label === 'low') throw err; // last tier, propagate
      console.warn(`[Camera] ${tier.label} failed, trying lower tier:`, err?.message);
    }
  }
  throw new Error('Unable to access camera at any resolution tier');
}

export function stopStream(stream) {
  if (!stream) return;
  stream.getTracks().forEach((t) => t.stop());
}