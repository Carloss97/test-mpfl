import { describe, expect, it, vi } from 'vitest';
import { fetchRealHrCandidates } from './hrDashboardApi.js';

const CANDS = [{ id: 's-1', alias: 'h-1', scores: [70, null], games: [], status: 'ready' }];

describe('fetchRealHrCandidates (B1/B2 — HR dashboard con datos reales)', () => {
  it('devuelve los candidatos reales de GET /sessions', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ candidates: CANDS, total: 1, hasMore: false }) });
    const out = await fetchRealHrCandidates({ apiBase: 'https://api.example/staging', fetchImpl, limit: 10 });
    expect(out).toEqual(CANDS);
    expect(fetchImpl).toHaveBeenCalledWith('https://api.example/staging/sessions?limit=10', expect.objectContaining({ headers: expect.any(Object) }));
  });

  it('devuelve null ante error HTTP, lista vacía o fallo de red (fallback a sintéticos)', async () => {
    expect(await fetchRealHrCandidates({ apiBase: 'https://x', fetchImpl: vi.fn().mockResolvedValue({ ok: false, status: 500 }) })).toBeNull();
    expect(await fetchRealHrCandidates({ apiBase: 'https://x', fetchImpl: vi.fn().mockResolvedValue({ ok: true, json: async () => ({ candidates: [], total: 0 }) }) })).toBeNull();
    expect(await fetchRealHrCandidates({ apiBase: 'https://x', fetchImpl: vi.fn().mockRejectedValue(new Error('network')) })).toBeNull();
  });

  it('devuelve null sin apiBase configurado (modo local)', async () => {
    const fetchImpl = vi.fn();
    expect(await fetchRealHrCandidates({ apiBase: null, fetchImpl })).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
