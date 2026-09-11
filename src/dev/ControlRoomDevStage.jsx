// ControlRoomDevStage.jsx — EXP-8 Sala de Control (C2/C3): surface DEV para smoke.
// Ruta: /dev/control-room (solo laboratorio). Telemetría no-op (en memoria).
//
// Modos:
//   - (default) o ?scenario=<id>  → MODO ÚNICO: un escenario directo (default CR-PRACTICE-01).
//     Para smoke de la sala (C2) y QA de un escenario concreto (p. ej. ?scenario=CR-L6-S01).
//   - ?mode=session                → MODO SESIÓN: flujo completo §4 (welcome → tutorial T1-T5
//     → evaluación 12 escenarios con intros de bloque → final). Para smoke del flujo (C3).
// El registro en la batería es C5; este stage se retira/conserva entonces.
import React from 'react';
import ControlRoomGame from '../tasks/original-games/control-room/controlRoomGame.jsx';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import '../tasks/original-games/control-room/controlRoom.css';

function readQuery() {
  if (typeof window === 'undefined') return { scenario: null, mode: null };
  try {
    const params = new URLSearchParams(window.location.search);
    return { scenario: params.get('scenario'), mode: params.get('mode') };
  } catch {
    return { scenario: null, mode: null };
  }
}

export default function ControlRoomDevStage() {
  const { t } = useLanguage();
  const { scenario, mode } = readQuery();
  const sessionMode = mode === 'session' && !scenario;
  return (
    <div className="control-room-dev" data-demo-phase="dev-control-room">
      <p className="control-room-dev__banner" role="note">
        {t(
          sessionMode
            ? 'DEV — EXP-8 Sala de Control C3: flujo de sesión completo (welcome → tutorial → evaluación → final). Sin batería; telemetría en memoria.'
            : 'DEV — EXP-8 Sala de Control C2: UI responsive (modo único). ?scenario=<id> fija el escenario; ?mode=session = flujo completo. Sin batería.',
          sessionMode
            ? 'DEV — EXP-8 Control Room C3: full session flow (welcome → tutorial → evaluation → final). No battery; in-memory telemetry.'
            : 'DEV — EXP-8 Control Room C2: responsive UI (single mode). ?scenario=<id> sets the scenario; ?mode=session = full flow. No battery.',
        )}
      </p>
      <div className="control-room-dev__stage">
        <ControlRoomGame
          active
          scenarioId={sessionMode ? undefined : (scenario ?? 'CR-PRACTICE-01')}
          onGameEvent={() => undefined}
          onComplete={() => undefined}
        />
      </div>
    </div>
  );
}
