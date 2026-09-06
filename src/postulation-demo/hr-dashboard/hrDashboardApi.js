// hrDashboardApi.js — Lectura de sesiones REALES para el panel HR (B1/B2).
// GET {apiBase}/sessions?limit=N -> { candidates, total, hasMore }
// (mismo shape que HR_DASHBOARD_CANDIDATES; el backend ya mapea payload->fila).
// Devuelve null en cualquier fallo para que la UI caiga a datos sintéticos
// etiquetados, nunca a un error vacío.

export async function fetchRealHrCandidates({ apiBase, fetchImpl = globalThis.fetch, limit = 50 } = {}) {
  if (!apiBase || typeof fetchImpl !== 'function') return null;
  try {
    const response = await fetchImpl(`${apiBase}/sessions?limit=${Number(limit) || 50}`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    const body = typeof response.json === 'function' ? await response.json() : null;
    const candidates = Array.isArray(body?.candidates) ? body.candidates : null;
    return candidates && candidates.length > 0 ? candidates : null;
  } catch {
    return null;
  }
}

export default fetchRealHrCandidates;
