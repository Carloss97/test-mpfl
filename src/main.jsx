import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/krumm-tokens.css';
import App from './App.jsx';
import PostulationDemoApp from './postulation-demo/PostulationDemoApp.jsx';
import PostulationHrDashboard from './postulation-demo/hr-dashboard/HrDashboardRoot.jsx';
import LandingPage from './landing/LandingPage.jsx';
import {
  isPostulationDemoPath,
  isPostulationHrDashboardPath,
  isLegacyPostulationPath,
  isLegacyPostulationHrPath,
  normalizeLegacyPostulationPath,
} from './postulation-demo/postulationDemoRoute.js';
import { LanguageProvider } from './i18n/LanguageContext.jsx';
import V3RootApp from './v3/V3RootApp.jsx';
import { resolveV3Route } from './v3/v3Routes.js';

// Redirige rutas legacy /postulaciones-demo* a producción conservando query/hash.
const currentPath = window.location.pathname;
if (isLegacyPostulationPath(currentPath) || isLegacyPostulationHrPath(currentPath)) {
  const target = normalizeLegacyPostulationPath(currentPath)
    + window.location.search
    + window.location.hash;
  window.history.replaceState(window.history.state, '', target);
}

const effectivePath = window.location.pathname;
const isTechnicalAppPath = effectivePath.startsWith('/tecnico');
// Orden de prioridad (plan fase v3 §2): las rutas de producto existentes
// (/postulaciones*, /reclutador, /tecnico*) no cambian; las 12 rutas nuevas de
// la fase v3 (V0: shells + placeholders; V1–V4: contenido real) van antes del
// default LandingPage. V5 hará el cutover (/reclutador → /empresa, etc.).
const RootApp = isPostulationHrDashboardPath(effectivePath)
  ? PostulationHrDashboard
  : isPostulationDemoPath(effectivePath)
    ? PostulationDemoApp
    : isTechnicalAppPath
      ? App
      : resolveV3Route(effectivePath)
        ? V3RootApp
        : LandingPage;

// LanguageToggle se oculta del árbol principal: se renderiza dentro de cada página
// en su header (landing: nav) para evitar el botón flotante sobre contenido.
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LanguageProvider>
      <RootApp />
    </LanguageProvider>
  </React.StrictMode>,
);
