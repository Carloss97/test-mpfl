// ControlRoomDevStage.jsx — EXP-8 Sala de Control (C2): surface DEV para smoke de la UI
// responsive (3 tiers, compositor, a11y) SIN registrar el juego en la batería (el registro
// es C5). Sigue el patrón de src/dev/BombDevStage.jsx.
//
// Ruta: /dev/control-room (solo laboratorio). ?scenario=<id> fija el escenario a renderizar
// (default: práctica CR-PRACTICE-01, determinista y sin timeout). La telemetría es no-op
// (en memoria); el agregado de onComplete se descarta.
//
// Se renderiza ControlRoomGame directamente (no dentro de PostulationGameStage) para
// verificar el layout responsive propio del módulo a viewport completo (el ajuste al stage
// de la batería es C5).
import React from 'react';
import ControlRoomGame from '../tasks/original-games/control-room/controlRoomGame.jsx';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import '../tasks/original-games/control-room/controlRoom.css';

function readScenarioFromQuery() {
  if (typeof window === 'undefined') return null;
  try {
    const value = new URLSearchParams(window.location.search).get('scenario');
    return value && value !== '' ? value : null;
  } catch {
    return null;
  }
}

export default function ControlRoomDevStage() {
  const { t } = useLanguage();
  const scenario = readScenarioFromQuery();
  return (
    <div className="control-room-dev" data-demo-phase="dev-control-room">
      <p className="control-room-dev__banner" role="note">
        {t(
          'DEV — laboratorio EXP-8 Sala de Control C2: UI responsive (sin batería; telemetría en memoria).',
          'DEV — EXP-8 Control Room C2 lab: responsive UI (no battery; in-memory telemetry).',
        )}
      </p>
      <div className="control-room-dev__stage">
        <ControlRoomGame
          active
          scenarioId={scenario ?? undefined}
          onGameEvent={() => undefined}
          onComplete={() => undefined}
        />
      </div>
    </div>
  );
}
