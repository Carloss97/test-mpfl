// BombDevStage.jsx — EXP-7 BOMB (B2/B3): surface DEV para smoke del juego
// (panel + HUD + fases de niveles) sin registrar el juego en la batería (el registro
// es B5).
//
// Ruta: /dev/bomb (solo laboratory). ?seed=<int> fija el seed de sesión para
// verificar determinismo (mismo seed + config => misma forma/secuencia, spec §15).
// El stage usa PostulationGameStage real (chrome compartido: progress header,
// sfx-toggle, corner) para que el smoke verifique el mundo dentro de su contexto
// final; onCompleteDemo/onGameEvent son no-ops en dev.
import React from 'react';
import PostulationGameStage from '../postulation-demo/PostulationGameStage.jsx';
import BombDefusalGame from '../tasks/original-games/bomb/bombGame.jsx';
import { useLanguage } from '../i18n/LanguageContext.jsx';

const BOMB_DEV_BLOCK = Object.freeze({
  gameId: 'bomb_defusal',
  label: 'Desactivación (EXP-7 B4)',
  shortLabel: 'Bomb',
  skill: 'procedural_memory',
  phase: 'dev',
  durationLabel: 'dev',
  trialCount: 1,
  visible: true,
});

function readSeedFromQuery() {
  if (typeof window === 'undefined') return null;
  try {
    const value = new URLSearchParams(window.location.search).get('seed');
    if (value == null || value === '' || Number.isNaN(Number(value))) return null;
    return Number(value);
  } catch {
    return null;
  }
}

export default function BombDevStage() {
  const { t } = useLanguage();
  const seed = readSeedFromQuery();
  return (
    <div className="postulation-demo postulation-demo--gameplay" data-demo-phase="dev-bomb">
      <p className="bomb-dev-banner" role="note">
        {t(
          'DEV — laboratorio EXP-7 BOMB B4: tutorial T1-T5 + welcome (§4.1/§4.2/§4.3). Sin batería; telemetría solo en memoria.',
          'DEV — EXP-7 BOMB B4 lab: tutorial T1-T5 + welcome (§4.1/§4.2/§4.3). No battery; in-memory telemetry only.',
        )}
      </p>
      <PostulationGameStage
        blocks={[BOMB_DEV_BLOCK]}
        gameComponents={{ bomb_defusal: (props) => <BombDefusalGame {...props} seed={seed} /> }}
        onGameEvent={() => undefined}
        onCompleteDemo={() => undefined}
        onAbortDemo={() => undefined}
      />
    </div>
  );
}
