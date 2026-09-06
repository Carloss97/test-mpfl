import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HrDashboardRoot from './HrDashboardRoot.jsx';

// En jsdom, import.meta.env no existe -> KRUMM_API_BASE = null -> el wrapper no
// llama a fetch y renderiza el fallback sintetico. El path "API configurada" se
// cubre en hrDashboardApi.test.js (fetch) y en PostulationHrDashboard.test.jsx
// (candidatos reales como prop).
describe('HrDashboardRoot (B1)', () => {
  it('sin API configurada: renderiza el panel sintetico sin llamar a fetch', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('no debe llamarse'));
    render(<HrDashboardRoot />);
    await waitFor(() => expect(screen.getByRole('heading', { name: /Panel de evaluaciones/i })).toBeInTheDocument());
    expect(screen.getByText(/Workspace HR · Datos sintéticos/i)).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
