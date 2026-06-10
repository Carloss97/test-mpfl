import { useCallback, useEffect, useRef, useState } from 'react';

function makeWorker() {
  if (typeof Worker === 'undefined') return null;
  return new Worker(new URL('./edgeAiWorker.js', import.meta.url), { type: 'module' });
}

/**
 * Hook para ejecutar el Edge AI Engine en un Web Worker.
 *
 * En equipos con GPU/media-alta (≥4 cores), offloadear la inferencia
 * al worker evita jank en el main thread durante el procesamiento de
 * cientos de muestras faciales.
 *
 * @param {Object} options
 * @param {boolean} options.enabled - si usar el worker (false → usa edgeAiEngine directo)
 * @param {Array} options.faceSamples - muestras faciales actuales
 * @param {Array} options.pointerSamples
 * @param {Array} options.taskEvents
 * @param {Object} options.calibrationProfile
 * @param {number} options.debounceMs - ms entre inferencias (default 500)
 * @returns {{ result: Object|null, status: string, error: string|null }}
 */
export function useEdgeAiWorker({
  enabled = false,
  faceSamples = [],
  pointerSamples = [],
  taskEvents = [],
  calibrationProfile = null,
  debounceMs = 500,
} = {}) {
  const workerRef = useRef(null);
  const timerRef = useRef(null);
  const latestSamplesRef = useRef(faceSamples);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  // Keep ref in sync
  latestSamplesRef.current = faceSamples;

  // Start/stop worker
  useEffect(() => {
    if (!enabled) {
      setResult(null);
      setStatus('disabled');
      return undefined;
    }

    const worker = makeWorker();
    if (!worker) {
      setStatus('unavailable');
      return undefined;
    }
    workerRef.current = worker;
    setStatus('ready');

    worker.onmessage = (event) => {
      const { type, payload, message } = event.data ?? {};
      if (type === 'result') {
        setResult(payload);
        setStatus('ready');
      }
      if (type === 'error') {
        setError(message);
        setStatus('error');
      }
    };

    worker.onerror = (err) => {
      setError(err?.message ?? 'Worker error');
      setStatus('error');
    };

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      worker.terminate();
      workerRef.current = null;
      setStatus('idle');
    };
  }, [enabled]);

  // Debounced inference trigger
  const triggerInference = useCallback(() => {
    if (!workerRef.current || status === 'error') return;
    const samples = latestSamplesRef.current;
    if (!samples || samples.length < 2) return;

    setStatus('inferring');
    workerRef.current.postMessage({
      type: 'infer',
      payload: {
        faceSamples: samples,
        pointerSamples,
        taskEvents,
        calibrationProfile,
        runtime: { delegate: 'CPU' },
      },
    });
  }, [pointerSamples, taskEvents, calibrationProfile, status]);

  // Debounced auto-trigger on faceSamples change
  const lastTriggerRef = useRef(0);
  useEffect(() => {
    if (!enabled || faceSamples.length < 2) return;

    const now = Date.now();
    const elapsed = now - lastTriggerRef.current;

    if (elapsed >= debounceMs) {
      lastTriggerRef.current = now;
      triggerInference();
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        lastTriggerRef.current = Date.now();
        triggerInference();
      }, debounceMs - elapsed);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [faceSamples, enabled, debounceMs, triggerInference]);

  return { result, status, error, triggerInference };
}