// BombDevStage.jsx — EXP-7 BOMB (B2, t_2fdada28): surface DEV para smoke del
// panel + HUD sin registrar el juego en la batería (el registro es B5).
//
// Ruta: /dev/bomb (solo laboratory; no hay evaluación ni telemetría enviada:
// onGameEvent/onCompleteDemo son no-ops). El stage usa PostulationGameStage
// real (chrome compartido: progress header, sfx-toggle, corner) para que el
// smoke verifique el mundo dentro de su contexto final.
import React from 'react';
import PostulationGameStage from '../postulation-demo/PostulationGameStage.jsx';
import BombDefusalGame from '../tasks/original-games/bomb/bombGame.jsx';
import { useLanguage } from '../i18n/LanguageContext.jsx';

const BOMB_DEV_BLOCK = Object.freeze({
  gameId: 'bomb_defusal',
  label: 'Desactivación (EXP-7 B2)',
  shortLabel: 'Bomb',
  skill: 'procedural_memory',
  phase: 'dev',
  durationLabel: 'dev',
  trialCount: 1,
  visible: true,
});

export default function BombDevStage() {
  const { t } = useLanguage();
  return (
    <div className="postulation-demo postulation-demo--gameplay" data-demo-phase="dev-bomb">
      <p className="bomb-dev-banner" role="note">
        {t(
          'DEV — laboratorio EXP-7 BOMB B2: sin evaluación, sin telemetría enviada.',
          'DEV — EXP-7 BOMB B2 lab: no evaluation, no telemetry sent.',
        )}
      </p>
      <PostulationGameStage
        blocks={[BOMB_DEV_BLOCK]}
        gameComponents={{ bomb_defusal: BombDefusalGame }}
        onGameEvent={() => undefined}
        onCompleteDemo={() => undefined}
        onAbortDemo={() => undefined}
      />
    </div>
  );
}
