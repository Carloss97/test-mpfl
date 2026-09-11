import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/krumm-tokens.css';
import App from './App.jsx';
import PostulationDemoApp from './postulation-demo/PostulationDemoApp.jsx';
import LandingPage from './landing/LandingPage.jsx';
import BombDevStage from './dev/BombDevStage.jsx';
import ControlRoomDevStage from './dev/ControlRoomDevStage.jsx';
import {
  isPostulationDemoPath,
  isLegacyPostulationPath,
  isLegacyPostulationHrPath,
  normalizeLegacyPostulationPath,
  resolveV5Cutover,
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

// V5 cutover (t_0184d2e6, fase v3 §2): las rutas reemplazadas redirigen a las
// nuevas con navegación real (location.replace: la URL cambia y no queda
// doble entrada en el historial):
//   /reclutador*        → /empresa   (hr-dashboard v1 borrado en V5)
//   /postulaciones*     → /candidato (landing interna borrada en V5) — solo sin
//                          invite (con ?invite=… se conserva el flujo) y sin
//                          ?fixture=1 (reporte QA).
// El search/hash originales se conservan (p. ej. ?lang=en).
const v5Cutover = resolveV5Cutover(effectivePath, window.location.search);
if (v5Cutover) {
  window.location.replace(v5Cutover + window.location.search + window.location.hash);
}

const isTechnicalAppPath = effectivePath.startsWith('/tecnico');
// EXP-7 BOMB (B2, t_2fdada28): laboratorio dev del panel + HUD (sin batería,
// sin evaluación). Queda disponible hasta que B5 registre el juego en la
// batería original; se puede retirar entonces si el smoke lo hace vía fixture.
const isDevBombPath = effectivePath === '/dev/bomb' || effectivePath.startsWith('/dev/bomb/');
// EXP-8 Sala de Control (C2, t_a2d9f478): laboratorio dev de la UI responsive (sin
// batería). Se retira/conserva según C5; ?scenario=<id> fija el escenario.
const isDevControlRoomPath = effectivePath === '/dev/control-room' || effectivePath.startsWith('/dev/control-room/');
// Orden de prioridad (plan fase v3 §2, actualizado en V5): las rutas de
// producto /postulaciones* (flujo de evaluación, entrada con invite o fixture)
// y /tecnico* no cambian; las 12 rutas de la fase v3 (V0–V4) van antes del
// default LandingPage. /reclutador y /postulaciones sin invite/fixture nunca
// llegan a renderizarse (cutover arriba).
const RootApp = isPostulationDemoPath(effectivePath)
  ? PostulationDemoApp
  : isDevBombPath
    ? BombDevStage
    : isDevControlRoomPath
      ? ControlRoomDevStage
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
      {v5Cutover ? null : <RootApp />}
    </LanguageProvider>
  </React.StrictMode>,
);
