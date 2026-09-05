import { useCallback, useEffect, useRef, useState } from 'react';

function makeWorker() {
  return new Worker(new URL('../telemetry/pipelineWorker.js', import.meta.url), { type: 'module' });
}

/**
 * Hook para ejecutar el pipeline completo en un Web Worker.
 *
 * Reemplaza useEdgeAiWorker + runEdgeAIInference directo.
 * Un solo worker que recibe faceSamples y devuelve todo: features, AUs,
 * channels, emotions, captureQuality, headPose, ML prediction.
 */
export function usePipelineWorker({
  enabled = false,
  faceSamples = [],
  pointerSamples = [],
  taskEvents = [],
  calibrationProfile = null,
  debounceMs = 400,
} = {}) {
  const workerRef = useRef(null);
  const timerRef = useRef(null);
  const lastSentRef = useRef(0);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const sendInference = useCallback(() => {
    const worker = workerRef.current;
    if (!worker || status === 'error') return;
    if (!faceSamples || faceSamples.length < 2) return;

    setStatus('inferring');
    worker.postMessage({
      type: 'infer',
      payload: { faceSamples, pointerSamples, taskEvents, calibrationProfile },
    });
  }, [faceSamples, pointerSamples, taskEvents, calibrationProfile, status]);

  // Start/stop worker
  useEffect(() => {
    if (!enabled) { setResult(null); setStatus('disabled'); return undefined; }

    const w = makeWorker();
    workerRef.current = w;
    setStatus('ready');

    w.onmessage = (event) => {
      const { type, payload, message } = event.data ?? {};
      if (type === 'result') { setResult(payload); setStatus('ready'); }
      if (type === 'error') { setError(message); setStatus('error'); }
    };
    w.onerror = (err) => { setError(err?.message ?? 'Worker error'); setStatus('error'); };

    return () => { if (timerRef.current) clearTimeout(timerRef.current); w.terminate(); workerRef.current = null; setStatus('idle'); };
  }, [enabled]);

  // Debounced trigger
  useEffect(() => {
    if (!enabled || faceSamples.length < 2) return;
    const now = performance.now();
    const elapsed = now - lastSentRef.current;

    if (elapsed >= debounceMs) {
      lastSentRef.current = now;
      sendInference();
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => { lastSentRef.current = performance.now(); sendInference(); }, debounceMs - elapsed);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [faceSamples, enabled, debounceMs, sendInference]);

  return { result, status, error, trigger: sendInference };
}