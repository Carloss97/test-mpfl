import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import PostulationDemoApp from './postulation-demo/PostulationDemoApp.jsx';
import { isPostulationDemoPath } from './postulation-demo/postulationDemoRoute.js';

const RootApp = isPostulationDemoPath(window.location.pathname)
  ? PostulationDemoApp
  : App;

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>,
);
