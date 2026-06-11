import { useCallback, useEffect, useRef, useState } from 'react';

function makeWorker() {
  return new Worker(new URL('./faceLandmarkerWorker.js', import.meta.url), { type: 'module' });
}

/**
 * Hook para manejar el worker de MediaPipe Face Landmarker.
 *
 * @param {Object} options
 * @param {React.Ref} options.videoRef
 * @param {boolean} options.active
 * @param {Function} options.onSample
 * @param {number} options.fps - frames por segundo objetivo
 * @param {string} options.preferredDelegate - 'GPU', 'CPU', o 'AUTO'
 * @returns {{ status: string, delegate: string|null, error: string|null }}
 */
export function useFaceLandmarkerWorker({
  videoRef,
  active,
  onSample,
  fps = 15,
  preferredDelegate = 'GPU',
}) {
  const workerRef = useRef(null);
  const animationRef = useRef(0);
  const pendingFrameRef = useRef(false);
  const lastSentRef = useRef(0);
  const [status, setStatus] = useState('idle');
  const [delegate, setDelegate] = useState(null);
  const [error, setError] = useState(null);

  const stopLoop = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = 0;
    }
    pendingFrameRef.current = false;
  }, []);

  useEffect(() => {
    if (!active) {
      stopLoop();
      return undefined;
    }

    const worker = makeWorker();
    workerRef.current = worker;
    setStatus('loading-model');
    setError(null);

    worker.onmessage = (event) => {
      const { type, sample, message, delegate: workerDelegate, landmarks } = event.data ?? {};
      if (type === 'ready') {
        setStatus('ready');
        setDelegate(workerDelegate);
      }
      if (type === 'sample') {
        pendingFrameRef.current = false;
        onSample?.(sample, landmarks);
      }
      if (type === 'frame-skipped') {
        pendingFrameRef.current = false;
      }
      if (type === 'frame-error') {
        pendingFrameRef.current = false;
        setError(message);
      }
      if (type === 'warning') {
        console.warn('[FaceLandmarker worker]', message);
      }
      if (type === 'error') {
        pendingFrameRef.current = false;
        setStatus('error');
        setError(message);
        console.error('[FaceLandmarker worker]', message);
      }
    };

    worker.onerror = (err) => {
      pendingFrameRef.current = false;
      setStatus('error');
      setError(err?.message ?? 'Worker error');
    };

    // Init with preferred delegate
    worker.postMessage({ type: 'init', payload: { preferredDelegate } });

    return () => {
      stopLoop();
      worker.terminate();
      workerRef.current = null;
      setStatus('idle');
    };
  }, [active, onSample, stopLoop, preferredDelegate]);

  useEffect(() => {
    if (!active || !workerRef.current || status !== 'ready') return undefined;

    const frameIntervalMs = 1000 / fps;
    const tick = async (now) => {
      const video = videoRef.current;
      const worker = workerRef.current;
      const hasVideo = video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;

      if (worker && hasVideo && !pendingFrameRef.current && now - lastSentRef.current >= frameIntervalMs) {
        try {
          const bitmap = await createImageBitmap(video);
          const targetWorker = workerRef.current;
          if (!targetWorker) { bitmap?.close?.(); return; }
          pendingFrameRef.current = true;
          lastSentRef.current = now;
          targetWorker.postMessage(
            { type: 'frame', payload: { bitmap, timestamp: now } },
            [bitmap],
          );
        } catch (captureError) {
          setError(captureError?.message ?? String(captureError));
        }
      }

      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);
    return stopLoop;
  }, [active, fps, status, stopLoop, videoRef]);

  return { status, delegate, error };
}