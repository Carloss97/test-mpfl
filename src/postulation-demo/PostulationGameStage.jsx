import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SimpleRTTask from '../tasks/SimpleRTTask.jsx';
import PrecisionTargetingTask from '../tasks/PrecisionTargetingTask.jsx';
import GoNoGoTask from '../tasks/GoNoGoTask.jsx';
import ColorInterferenceTask from '../tasks/ColorInterferenceTask.jsx';
import VisualSearchTask from '../tasks/VisualSearchTask.jsx';
import LaserPuzzlePostulationTask from '../tasks/original-games/LaserPuzzlePostulationTask.jsx';
import BalloonRiskPostulationTask from '../tasks/original-games/BalloonRiskPostulationTask.jsx';
import PassengerRouteOptimizationTask from '../tasks/original-games/PassengerRouteOptimizationTask.jsx';
import TeamCoordinationPostulationTask from '../tasks/original-games/TeamCoordinationPostulationTask.jsx';
import BehindTheScenesMiniHud from './BehindTheScenesMiniHud.jsx';
import { POSTULATION_DEMO_BATTERY, listVisiblePostulationBlocks } from './postulationDemoConfig.js';
import PostulationProgressHeader from './PostulationProgressHeader.jsx';
import { useLanguage } from '../i18n/LanguageContext.jsx';

const DEFAULT_GAME_COMPONENTS = Object.freeze({
  simple_rt: SimpleRTTask,
  precision_targeting: PrecisionTargetingTask,
  go_nogo: GoNoGoTask,
  color_interference: ColorInterferenceTask,
  visual_search: VisualSearchTask,
  laser_puzzle: LaserPuzzlePostulationTask,
  balloon_risk: BalloonRiskPostulationTask,
  passenger_routes: PassengerRouteOptimizationTask,
  team_coordination: TeamCoordinationPostulationTask,
});

function getCurrentViewport() {
  if (typeof window === 'undefined') return { width: 1440, height: 900 };
  return {
    width: window.innerWidth || 1440,
    height: window.innerHeight || 900,
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function getPostulationGameViewport(viewport = getCurrentViewport()) {
  const width = Math.max(320, Number(viewport.width) || 1440);
  const height = Math.max(320, Number(viewport.height) || 900);
  const compact = width <= 1366 || height <= 820;
  if (!compact) return { width: 720, height: 460, compact: false };
  return {
    width: clamp(Math.floor(width - 760), 500, 620),
    height: clamp(Math.floor(height - 430), 280, 340),
    compact: true,
  };
}

function usePostulationGameViewport() {
  const [viewport, setViewport] = useState(() => getPostulationGameViewport(getCurrentViewport()));
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const update = () => setViewport(getPostulationGameViewport(getCurrentViewport()));
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener?.('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener?.('resize', update);
    };
  }, []);
  return viewport;
}

export default function PostulationGameStage({
  blocks = listVisiblePostulationBlocks(POSTULATION_DEMO_BATTERY),
  gameComponents = {},
  signalSnapshot = null,
  onGameEvent,
  onCompleteDemo,
} = {}) {
  const { t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState([]);
  const onGameEventRef = useRef(onGameEvent);
  const onCompleteDemoRef = useRef(onCompleteDemo);
  const blockList = useMemo(() => blocks.filter(Boolean), [blocks]);
  const currentBlock = blockList[currentIndex] ?? null;
  const componentMap = useMemo(() => ({ ...DEFAULT_GAME_COMPONENTS, ...gameComponents }), [gameComponents]);
  const CurrentGame = currentBlock ? componentMap[currentBlock.gameId] : null;
  const gameViewport = usePostulationGameViewport();

  useEffect(() => { onGameEventRef.current = onGameEvent; }, [onGameEvent]);
  useEffect(() => { onCompleteDemoRef.current = onCompleteDemo; }, [onCompleteDemo]);

  const completeBlock = useCallback((summary = {}) => {
    if (!currentBlock) return;
    const nextCompleted = [...completed, { block: currentBlock, summary }];
    setCompleted(nextCompleted);

    if (currentIndex >= blockList.length - 1) {
      onCompleteDemoRef.current?.({
        completedCount: nextCompleted.length,
        totalCount: blockList.length,
        blocks: nextCompleted,
      });
      return;
    }
    setCurrentIndex((index) => Math.min(index + 1, blockList.length - 1));
  }, [blockList.length, completed, currentBlock, currentIndex]);

  if (!currentBlock || !CurrentGame) {
    return (
      <section className="postulation-demo__game-shell" aria-label={t('Juegos de postulación', 'Application games')}>
        <p>{t('No hay juegos disponibles para la demo.', 'No games available for the demo.')}</p>
      </section>
    );
  }

  return (
    <section className="postulation-demo__game-shell" aria-label="Juegos de postulación">
      <PostulationProgressHeader currentBlock={currentBlock} currentIndex={currentIndex} total={blockList.length} completed={completed} />
      <div className="postulation-demo__game-body">
        <div className="postulation-demo__game-stage" aria-label="Stage de juego">
          <CurrentGame
            active
            block={currentBlock}
            trialCount={currentBlock.trialCount}
            durationMs={currentBlock.durationMs}
            width={gameViewport.width}
            height={gameViewport.height}
            onGameEvent={onGameEventRef.current}
            onComplete={completeBlock}
          />
        </div>
        <div className="postulation-demo__game-hud-corner">
          <BehindTheScenesMiniHud snapshot={signalSnapshot} />
        </div>
      </div>
    </section>
  );
}
