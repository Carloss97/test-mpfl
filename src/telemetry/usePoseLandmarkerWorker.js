import { useEffect, useRef, useState, useCallback } from 'react';

function makeWorker() {
  return new Worker(new URL('../telemetry/poseLandmarkerWorker.js', import.meta.url), { type: 'module' });
}

export function usePoseLandmarkerWorker({ videoRef, active = false, fps = 8, onSample } = {}) {
  const workerRef = useRef(null);
  const animationRef = useRef(0);
  const pendingRef = useRef(false);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const stopLoop = useCallback(() => {
    if (animationRef.current) { cancelAnimationFrame(animationRef.current); animationRef.current = 0; }
    pendingRef.current = false;
  }, []);

  // Init worker
  useEffect(() => {
    if (!active) { stopLoop(); return undefined; }
    const worker = makeWorker();
    workerRef.current = worker;
    setStatus('loading');
    worker.onmessage = (e) => {
      const { type, sample, message } = e.data ?? {};
      if (type === 'ready') setStatus('ready');
      if (type === 'pose') { pendingRef.current = false; onSample?.(sample); }
      if (type === 'pose-empty') pendingRef.current = false;
      if (type === 'error') { setError(message); setStatus('error'); }
    };
    worker.onerror = (err) => { setError(err?.message); setStatus('error'); };
    worker.postMessage({ type: 'init' });
    return () => { stopLoop(); worker.terminate(); workerRef.current = null; setStatus('idle'); };
  }, [active, stopLoop, onSample]);

  // Frame loop — reads videoRef.current inside tick, not as dep
  useEffect(() => {
    if (!active || status !== 'ready') return;

    const interval = 1000 / fps;
    let lastTime = 0;

    const tick = (now) => {
      animationRef.current = requestAnimationFrame(tick);
      if (now - lastTime < interval || pendingRef.current) return;
      const video = videoRef?.current;
      if (!video || video.readyState < 2 || video.videoWidth === 0) return;
      lastTime = now;
      pendingRef.current = true;
      try {
        createImageBitmap(video).then(bitmap => {
          workerRef.current?.postMessage({ type: 'frame', payload: { bitmap, timestamp: now } }, [bitmap]);
        }).catch(() => { pendingRef.current = false; });
      } catch (e) { pendingRef.current = false; }
    };
    animationRef.current = requestAnimationFrame(tick);
    return stopLoop;
  }, [active, status, fps, stopLoop]); // NOT videoRef — read inside tick

  return { status, error };
}