import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import PostulationDemoApp from './postulation-demo/PostulationDemoApp.jsx';
import PostulationHrDashboard from './postulation-demo/hr-dashboard/PostulationHrDashboard.jsx';
import LandingPage from './landing/LandingPage.jsx';
import {
  isPostulationDemoPath,
  isPostulationHrDashboardPath,
  isLegacyPostulationPath,
  isLegacyPostulationHrPath,
  normalizeLegacyPostulationPath,
} from './postulation-demo/postulationDemoRoute.js';
import { LanguageProvider } from './i18n/LanguageContext.jsx';

// Redirige rutas legacy /postulaciones-demo* a producción conservando query/hash.
const currentPath = window.location.pathname;
if (isLegacyPostulationPath(currentPath) || isLegacyPostulationHrPath(currentPath)) {
  const target = normalizeLegacyPostulationPath(currentPath)
    + window.location.search
    + window.location.hash;
  window.history.replaceState(window.history.state, '', target);
}

const effectivePath = window.location.pathname;
const isLandingPath = effectivePath === '/' || effectivePath === '';
const isTechnicalAppPath = effectivePath.startsWith('/tecnico');
const RootApp = isPostulationHrDashboardPath(effectivePath)
  ? PostulationHrDashboard
  : isPostulationDemoPath(effectivePath)
    ? PostulationDemoApp
    : isTechnicalAppPath
      ? App
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
