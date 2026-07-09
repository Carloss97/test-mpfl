import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SimpleRTTask from '../tasks/SimpleRTTask.jsx';
import PrecisionTargetingTask from '../tasks/PrecisionTargetingTask.jsx';
import GoNoGoTask from '../tasks/GoNoGoTask.jsx';
import ColorInterferenceTask from '../tasks/ColorInterferenceTask.jsx';
import VisualSearchTask from '../tasks/VisualSearchTask.jsx';
import BehindTheScenesMiniHud from './BehindTheScenesMiniHud.jsx';
import { POSTULATION_DEMO_BATTERY, listVisiblePostulationBlocks } from './postulationDemoConfig.js';
import PostulationProgressHeader from './PostulationProgressHeader.jsx';

const DEFAULT_GAME_COMPONENTS = Object.freeze({
  simple_rt: SimpleRTTask,
  precision_targeting: PrecisionTargetingTask,
  go_nogo: GoNoGoTask,
  color_interference: ColorInterferenceTask,
  visual_search: VisualSearchTask,
});

function now() {
  return globalThis.performance?.now?.() ?? Date.now();
}

function emitEvent(onGameEvent, event) {
  onGameEvent?.({
    type: 'game_event_v1',
    timestamp: now(),
    privacy: { rawPointer: false },
    ...event,
  });
}

export default function PostulationGameStage({
  blocks = listVisiblePostulationBlocks(POSTULATION_DEMO_BATTERY),
  gameComponents = {},
  signalSnapshot = null,
  onGameEvent,
  onCompleteDemo,
} = {}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState([]);
  const onGameEventRef = useRef(onGameEvent);
  const onCompleteDemoRef = useRef(onCompleteDemo);
  const blockList = useMemo(() => blocks.filter(Boolean), [blocks]);
  const currentBlock = blockList[currentIndex] ?? null;
  const componentMap = useMemo(() => ({ ...DEFAULT_GAME_COMPONENTS, ...gameComponents }), [gameComponents]);
  const CurrentGame = currentBlock ? componentMap[currentBlock.gameId] : null;

  useEffect(() => { onGameEventRef.current = onGameEvent; }, [onGameEvent]);
  useEffect(() => { onCompleteDemoRef.current = onCompleteDemo; }, [onCompleteDemo]);

  useEffect(() => {
    if (!currentBlock) return;
    emitEvent(onGameEventRef.current, {
      eventType: 'game_start',
      gameId: currentBlock.gameId,
      gameState: { phase: currentBlock.phase, skill: currentBlock.skill },
    });
  }, [currentBlock]);

  const completeBlock = useCallback((summary = {}) => {
    if (!currentBlock) return;
    emitEvent(onGameEventRef.current, {
      eventType: 'game_end',
      gameId: currentBlock.gameId,
      response: {
        outcome: 'completed',
        correct: true,
        score: Number(summary.score ?? summary.accuracy ?? 1) || 0,
      },
      gameState: { phase: currentBlock.phase, skill: currentBlock.skill },
    });

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
      <section className="postulation-demo__game-shell" aria-label="Juegos de postulación">
        <p>No hay juegos disponibles para la demo.</p>
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
            width={720}
            height={460}
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
