// t_90a5157c (V2 fase v3): fuente de datos del lado empresa (plan maestro §2,
// política demo + API opcional).
//   - Sin VITE_KRUMM_API_BASE (default, y siempre en tests/jsdom): modo demo
//     con DEMO_PROCESSES (3 procesos de la referencia) + banner "Demo workspace".
//   - Con API: 'checking' → GET /sessions (fetchCompanySessions, contract v1)
//     → 'real' (buildCompanyDataFromSessions: agregados por rol) o fallback
//     'demo' si el fetch falla/viene vacío (patrón HrDashboardRoot — nunca un
//     error vacío en la UI).
// useCompanyData corre en CompanyWorkspace (V3RootApp), no en cada página: un
// fetch por mount y el shell necesita el source para el banner (plan V2 D4).
import { useEffect, useState } from 'react';
import { KRUMM_API_BASE } from '../postulation-demo/postulationDemoConfig.js';
import { buildCompanyDataFromSessions, DEMO_PROCESSES, fetchCompanySessions } from './companyData.js';

export function useCompanyData({ apiBase = KRUMM_API_BASE, fetchImpl = globalThis.fetch, enabled = true } = {}) {
  const [state, setState] = useState(() => (
    enabled && apiBase
      ? { source: 'checking', processes: [] }
      : { source: 'demo', processes: DEMO_PROCESSES }
  ));

  useEffect(() => {
    if (!enabled || !apiBase) return undefined;
    let cancelled = false;
    fetchCompanySessions({ apiBase, fetchImpl }).then((sessions) => {
      if (cancelled) return;
      setState(sessions
        ? { source: 'real', processes: buildCompanyDataFromSessions(sessions) }
        : { source: 'demo', processes: DEMO_PROCESSES });
    });
    return () => { cancelled = true; };
  }, [enabled, apiBase, fetchImpl]);

  return state;
}

export default useCompanyData;
