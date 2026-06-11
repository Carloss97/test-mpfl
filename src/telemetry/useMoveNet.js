import { useEffect, useRef, useState, useCallback } from 'react';

let runtimePromise = null;

async function ensureMoveNetRuntime() {
  if (!runtimePromise) {
    runtimePromise = (async () => {
      const tf = await import('@tensorflow/tfjs');
      const moveNetDetector = await import('@tensorflow-models/pose-detection/dist/movenet/detector.js');
      const moveNetConstants = await import('@tensorflow-models/pose-detection/dist/movenet/constants.js');
      await tf.ready();
      try { await tf.setBackend('webgl'); }
      catch { try { await tf.setBackend('cpu'); } catch { /* keep current backend */ } }
      await tf.ready();
      return { tf, moveNetDetector, moveNetConstants };
    })();
  }
  return runtimePromise;
}

function extractMetrics(pose, videoWidth = 1, videoHeight = 1) {
  const kp = pose?.keypoints;
  if (!kp || kp.length < 17) return null;
  const normalizedKeypoints = kp.map((p, index) => ({
    ...p,
    index,
    xNorm: videoWidth > 0 ? p.x / videoWidth : 0,
    yNorm: videoHeight > 0 ? p.y / videoHeight : 0,
  }));
  const leftShoulder = kp[5];
  const rightShoulder = kp[6];
  if (!leftShoulder || !rightShoulder || (leftShoulder.score ?? 0) < 0.25 || (rightShoulder.score ?? 0) < 0.25) return null;

  const dx = rightShoulder.x - leftShoulder.x;
  const dy = rightShoulder.y - leftShoulder.y;
  const shoulderAngle = Math.atan2(dy, dx) * (180 / Math.PI);
  const shoulderWidthPx = Math.hypot(dx, dy);
  const confidence = ((leftShoulder.score ?? 0) + (rightShoulder.score ?? 0)) / 2;
  const symmetry = Math.max(0, Math.min(1, 1 - Math.abs(shoulderAngle) / 30));

  const visible = [kp[0], kp[1], kp[2], kp[3], kp[4], kp[5], kp[6], kp[7], kp[8], kp[9], kp[10]]
    .filter((p) => (p?.score ?? 0) >= 0.25).length;

  return {
    source: 'movenet_lightning_coco17_npm_main_thread',
    shoulderAngle: Math.round(shoulderAngle * 10) / 10,
    shoulderWidthPx: Math.round(shoulderWidthPx * 10) / 10,
    symmetry: Math.round(symmetry * 100) / 100,
    confidence: Math.round(confidence * 100) / 100,
    upperBodyCoverage: Math.round((visible / 11) * 100) / 100,
    visibleUpperBodyKeypoints: visible,
    leftShoulder: { x: leftShoulder.x, y: leftShoulder.y, xNorm: normalizedKeypoints[5].xNorm, yNorm: normalizedKeypoints[5].yNorm },
    rightShoulder: { x: rightShoulder.x, y: rightShoulder.y, xNorm: normalizedKeypoints[6].xNorm, yNorm: normalizedKeypoints[6].yNorm },
    keypoints: kp,
    normalizedKeypoints,
  };
}

export function useMoveNet({ videoRef, active = false, fps = 6, onSample } = {}) {
  const detectorRef = useRef(null);
  const animRef = useRef(0);
  const lastTimeRef = useRef(0);
  const pendingRef = useRef(false);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const stop = useCallback(() => {
    if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = 0; }
    pendingRef.current = false;
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!active) { stop(); setStatus('idle'); return undefined; }
    setStatus('loading');
    setError(null);

    (async () => {
      try {
        const { moveNetDetector, moveNetConstants } = await ensureMoveNetRuntime();
        if (cancelled) return;
        detectorRef.current = await moveNetDetector.load({
          modelType: moveNetConstants.SINGLEPOSE_LIGHTNING,
          enableSmoothing: true,
          minPoseScore: 0.2,
        });
        if (!cancelled) setStatus('ready');
      } catch (err) {
        if (!cancelled) { setError(err?.message ?? String(err)); setStatus('error'); }
      }
    })();

    return () => { cancelled = true; stop(); detectorRef.current = null; setStatus('idle'); };
  }, [active, stop]);

  useEffect(() => {
    if (!active || status !== 'ready') return undefined;
    const interval = 1000 / fps;

    const tick = async (now) => {
      animRef.current = requestAnimationFrame(tick);
      if (pendingRef.current || now - lastTimeRef.current < interval) return;
      const video = videoRef?.current;
      const detector = detectorRef.current;
      if (!video || !detector || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) return;

      lastTimeRef.current = now;
      pendingRef.current = true;
      try {
        const poses = await detector.estimatePoses(video, { maxPoses: 1, flipHorizontal: false });
        const metrics = poses?.length ? extractMetrics(poses[0], video.videoWidth, video.videoHeight) : null;
        if (metrics) onSample?.({ timestamp: now, metrics, keypoints: metrics.keypoints });
      } catch (err) {
        setError(err?.message ?? String(err));
      } finally {
        pendingRef.current = false;
      }
    };

    animRef.current = requestAnimationFrame(tick);
    return stop;
  }, [active, status, fps, videoRef, stop, onSample]);

  return { status, error };
}
