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
import LanguageToggle from './i18n/LanguageToggle.jsx';

// Redirige rutas legacy /postulaciones-demo* a producción conservando query/hash.
// Así fixtures guardados y enlaces en circulación no se rompen.
const currentPath = window.location.pathname;
if (isLegacyPostulationPath(currentPath) || isLegacyPostulationHrPath(currentPath)) {
  const target = normalizeLegacyPostulationPath(currentPath)
    + window.location.search
    + window.location.hash;
  window.history.replaceState(window.history.state, '', target);
}

const effectivePath = window.location.pathname;
// `/` → landing pública; `/tecnico` → la app técnica (Edge AI / debug); rutas prod por defecto.
const isLandingPath = effectivePath === '/' || effectivePath === '';
const isTechnicalAppPath = effectivePath.startsWith('/tecnico');
const RootApp = isPostulationHrDashboardPath(effectivePath)
  ? PostulationHrDashboard
  : isPostulationDemoPath(effectivePath)
    ? PostulationDemoApp
    : isTechnicalAppPath
      ? App
      : LandingPage;

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LanguageProvider>
      <RootApp />
      <LanguageToggle />
    </LanguageProvider>
  </React.StrictMode>,
);
