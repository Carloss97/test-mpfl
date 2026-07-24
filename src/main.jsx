import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import PostulationDemoApp from './postulation-demo/PostulationDemoApp.jsx';
import PostulationHrDashboard from './postulation-demo/hr-dashboard/PostulationHrDashboard.jsx';
import { isPostulationDemoPath, isPostulationHrDashboardPath } from './postulation-demo/postulationDemoRoute.js';
import { LanguageProvider } from './i18n/LanguageContext.jsx';
import LanguageToggle from './i18n/LanguageToggle.jsx';

const RootApp = isPostulationHrDashboardPath(window.location.pathname)
  ? PostulationHrDashboard
  : isPostulationDemoPath(window.location.pathname)
    ? PostulationDemoApp
    : App;

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LanguageProvider>
      <RootApp />
      <LanguageToggle />
    </LanguageProvider>
  </React.StrictMode>,
);
