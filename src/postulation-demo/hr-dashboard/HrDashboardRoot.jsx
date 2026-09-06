import React, { useEffect, useState } from 'react';
import PostulationHrDashboard from './PostulationHrDashboard.jsx';
import { HR_DASHBOARD_CANDIDATES } from './hrDashboardData.js';
import { fetchRealHrCandidates } from './hrDashboardApi.js';
import { KRUMM_API_BASE } from '../postulationDemoConfig.js';

/**
 * HrDashboardRoot — raiz de /reclutador.
 * Si hay API backend configurada (VITE_KRUMM_API_BASE) intenta cargar las
 * sesiones REALES guardadas por los candidatos (GET /sessions). Si el fetch
 * falla o devuelve vacío, cae a los datos sintéticos etiquetados (sin romper
 * el panel). dataSource informa al dashboard qué mostrar en el encabezado:
 *   - 'checking'  -> cargando sesiones reales
 *   - 'real'      -> sesiones reales de la API
 *   - 'synthetic' -> entorno demo (datos sintéticos)
 */
export default function HrDashboardRoot() {
  const [realCandidates, setRealCandidates] = useState(null);
  const [dataSource, setDataSource] = useState(KRUMM_API_BASE ? 'checking' : 'synthetic');

  useEffect(() => {
    if (!KRUMM_API_BASE) return undefined;
    let cancelled = false;
    fetchRealHrCandidates({ apiBase: KRUMM_API_BASE }).then((candidates) => {
      if (cancelled) return;
      if (candidates) {
        setRealCandidates(candidates);
        setDataSource('real');
      } else {
        setDataSource('synthetic');
      }
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <PostulationHrDashboard
      candidates={realCandidates ?? HR_DASHBOARD_CANDIDATES}
      dataSource={dataSource}
    />
  );
}
