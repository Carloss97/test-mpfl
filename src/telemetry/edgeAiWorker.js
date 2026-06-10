/**
 * Edge AI Inference Worker
 *
 * Corre el motor de inferencia edgeAiEngine en un Web Worker separado
 * para no bloquear el main thread. Recibe batches de faceSamples y
 * devuelve resultados de inferencia vía postMessage.
 *
 * Comunicación:
 *   main → worker: { type: 'infer', payload: { faceSamples, pointerSamples, taskEvents, calibrationProfile } }
 *   worker → main: { type: 'result', payload: <edgeAI output> }
 *                 { type: 'error', message: string }
 */

import { runEdgeAIInference } from './edgeAiEngine.js';

self.onmessage = async (event) => {
  const { type, payload } = event.data ?? {};

  if (type !== 'infer') {
    postMessage({ type: 'error', message: `Unknown message type: ${type}` });
    return;
  }

  try {
    const { faceSamples = [], pointerSamples = [], taskEvents = [], calibrationProfile = null, runtime = {} } = payload ?? {};

    const result = runEdgeAIInference({
      faceSamples,
      pointerSamples,
      taskEvents,
      calibrationProfile,
      runtime: { ...runtime, worker: true },
    });

    postMessage({ type: 'result', payload: result });
  } catch (error) {
    postMessage({ type: 'error', message: error?.message ?? String(error) });
  }
};