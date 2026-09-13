// t_90a5157c (V2 fase v3): fuente de datos del lado empresa (plan maestro §2,
// política demo + API opcional).
//   - Sin VITE_KRUMM_API_BASE (default, y siempre en tests/jsdom): modo demo
//     con DEMO_PROCESSES (3 procesos de la referencia) + banner "Demo workspace".
//   - Con API: 'checking' → GET /sessions (fetchCompanySessions, contract v1)
//     → 'real' (buildCompanyDataFromSessions: agregados por rol) o fallback
//     'demo' si el fetch falla/viene vacío (patrón HrDashboardRoot — nunca un
//     error vacío en la UI).
// A.2 (KRU-113): si hay sesión Cognito en sessionStorage (cognitoAuth), el
// GET /sessions lleva `Authorization: Bearer *** Token fresco o refresh único;
// si authada y la API responde 401 tras refresh → clearAuth + redirect al login
// (nunca demo silencioso bajo credenciales). Sin auth: comportamiento previo
// (showcase público → demo fallback).
// useCompanyData corre en CompanyWorkspace (V3RootApp), no en cada página: un
// fetch por mount y el shell necesita el source para el banner (plan V2 D4).
// t_9319e84d (V4): en modo demo la lista se DERIVA de mergeDemoProcesses(drafts)
// en cada render (D2): los procesos creados por el flujo de diseño
// (companyProcessStore, solo en memoria) aparecen en vivo en dashboard KPIs +
// /empresa/procesos. Modo real: sin merge (los drafts son dominio demo — no
// existe backend de procesos; follow-up plan V4 §4).
import { useEffect, useState } from 'react';
import { KRUMM_API_BASE } from '../postulation-demo/postulationDemoConfig.js';
import {
  buildCompanyDataFromSessions,
  fetchCompanySessions,
  mergeDemoProcesses,
} from './companyData.js';
import { useCompanyDraftProcesses } from './companyProcessStore.js';
import {
  clearAuth,
  getStoredAuth,
  isTokenFresh,
  refreshStoredAuth,
} from './cognitoAuth.js';

function defaultNavigate(to) {
  if (typeof window !== 'undefined') window.location.assign(to);
}

async function resolveToken(authed, { fetchImpl }) {
  if (!authed) return null;
  if (isTokenFresh(authed)) return authed.accessToken;
  if (!authed.refreshToken) return null;
  const refreshed = await refreshStoredAuth(authed, { fetchImpl });
  return refreshed?.accessToken ?? null;
}

export function useCompanyData({
  apiBase = KRUMM_API_BASE,
  fetchImpl = globalThis.fetch,
  enabled = true,
  navigate = defaultNavigate,
} = {}) {
  const drafts = useCompanyDraftProcesses();
  // Lectura única por mount: la navegación (login → /empresa) remonta el
  // workspace, que re-lee la sesión.
  const [authed] = useState(() => getStoredAuth());
  const [state, setState] = useState(() => (
    enabled && apiBase
      ? { source: 'checking', processes: [], sessions: [] }
      : { source: 'demo', processes: [], sessions: [] }
  ));

  useEffect(() => {
    if (!enabled || !apiBase) return undefined;
    let cancelled = false;
    const redirectToLogin = () => {
      if (!cancelled) navigate('/empresa/acceso');
    };
    (async () => {
      let token = await resolveToken(authed, { fetchImpl });
      if (authed && !token) {
        // Authada pero sin token recuperable (refresh falló/expiró).
        clearAuth();
        redirectToLogin();
        return;
      }
      let status = null;
      let sessions = await fetchCompanySessions({
        apiBase,
        fetchImpl,
        headers: token ? { Authorization: 'Bearer ' + token } : {},
        onResponse: (response) => { status = response.status; },
      });
      // 401 con token authado: retry único tras refresh (rotación de token).
      if (authed && token && !sessions && status === 401) {
        const refreshed = await refreshStoredAuth(authed, { fetchImpl });
        token = refreshed?.accessToken ?? null;
        if (!token) {
          clearAuth();
          redirectToLogin();
          return;
        }
        sessions = await fetchCompanySessions({
          apiBase,
          fetchImpl,
          headers: { Authorization: 'Bearer ' + token },
        });
      } else if (authed && !sessions && status === 403) {
        // A.2: token válido pero sin grupo recruiters/admins (gate en la
        // Lambda): refresh no lo resuelve → limpiar y volver al login.
        clearAuth();
        redirectToLogin();
        return;
      }
      if (cancelled) return;
      setState(sessions
        ? { source: 'real', processes: buildCompanyDataFromSessions(sessions), sessions }
        : { source: 'demo', processes: [], sessions: [] });
    })();
    return () => { cancelled = true; };
  }, [enabled, apiBase, fetchImpl, authed, navigate]);

  if (state.source === 'demo') {
    return { source: 'demo', processes: mergeDemoProcesses(drafts), sessions: [] };
  }
  return state;
}

export default useCompanyData;
