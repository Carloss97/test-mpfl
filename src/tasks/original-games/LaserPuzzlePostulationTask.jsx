import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GameRuntime from '../GameRuntime.jsx';
import {
  buildLaserDemoLevels,
  buildLaserGrid,
  buildLaserResponseAggregate,
  countAntennas,
  getLaserBoardMetrics,
  sanitizeLaserResponsePayload,
  traceLaserBeam,
} from './laserPuzzleTelemetry.js';

export { buildLaserDemoLevels } from './laserPuzzleTelemetry.js';

const LASER_GAME_DEFINITION = Object.freeze({ id: 'laser_puzzle', label: 'Puzzle láser', difficulty: 'spatial_planning' });

function now() {
  return globalThis.performance?.now?.() ?? Date.now();
}

function cellKey(x, y) {
  return `${x},${y}`;
}

function getCellIcon(cell) {
  if (!cell) return '';
  if (cell.type === 'ship') return '🚀';
  if (cell.type === 'antenna') return '📡';
  if (cell.type === 'wall') return '☄';
  if (cell.type === 'reflector_ne') return '╱';
  if (cell.type === 'reflector_nw') return '╲';
  if (cell.type === 'bifurcator') return 'Y';
  if (cell.type === 'portal_blue') return '◌';
  if (cell.type === 'portal_red') return '◎';
  return '';
}

function describeCell(cell) {
  if (!cell) return 'Celda vacía';
  if (cell.type === 'ship') return 'Nave emisora fija';
  if (cell.type === 'antenna') return 'Antena objetivo fija';
  if (cell.type === 'wall') return 'Meteorito fijo';
  if (cell.movable) return 'Pieza óptica móvil';
  return 'Pieza óptica fija';
}

function movePiece(grid, fromKey, toKey) {
  const fromCell = grid[fromKey];
  if (!fromCell?.movable || grid[toKey]) return { grid, moved: false, violation: true };
  return {
    grid: {
      ...grid,
      [toKey]: { ...fromCell, x: Number(toKey.split(',')[0]), y: Number(toKey.split(',')[1]) },
      [fromKey]: undefined,
    },
    moved: true,
    violation: false,
  };
}

function compactGrid(grid) {
  return Object.fromEntries(Object.entries(grid).filter(([, value]) => Boolean(value)));
}

function LaserPuzzleInner({ emit, trialCount, width, height, onComplete }) {
  const emitRef = useRef(emit);
  const onCompleteRef = useRef(onComplete);
  const levels = useMemo(() => buildLaserDemoLevels().slice(0, Math.max(1, Number(trialCount) || 1)), [trialCount]);
  const [levelIndex, setLevelIndex] = useState(0);
  const [grid, setGrid] = useState(() => buildLaserGrid(levels[0]));
  const [selectedKey, setSelectedKey] = useState(null);
  const [status, setStatus] = useState('Selecciona una pieza móvil y luego una celda vacía.');
  const [finished, setFinished] = useState(false);
  const movesRef = useRef(0);
  const solvedRef = useRef(0);
  const violationsRef = useRef(0);
  const gameStartTimeRef = useRef(now());
  const levelStartTimeRef = useRef(now());
  const shownLevelsRef = useRef(new Set());

  const level = levels[levelIndex];
  const metrics = useMemo(() => getLaserBoardMetrics(level, { width, height }), [height, level, width]);
  const trace = useMemo(() => traceLaserBeam(compactGrid(grid), level?.cols, level?.rows), [grid, level]);
  const antennaCount = useMemo(() => countAntennas(level), [level]);

  useEffect(() => { emitRef.current = emit; }, [emit]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  useEffect(() => {
    if (!level || finished || shownLevelsRef.current.has(level.id)) return;
    shownLevelsRef.current.add(level.id);
    levelStartTimeRef.current = now();
    emitRef.current({
      eventType: 'stimulus_shown',
      trialId: level.id,
      targetId: `${level.id}-antennas`,
      timestamp: levelStartTimeRef.current,
      stimulus: {
        kind: 'laser_puzzle_level',
        payload: {
          levelIndex: levelIndex + 1,
          levelCount: levels.length,
          movablePieceCount: level.cells.filter((cell) => cell.movable).length,
          antennaCount,
          par: level.par,
        },
      },
      gameState: { level: levelIndex + 1, difficulty: level.difficulty, score: solvedRef.current },
    });
  }, [antennaCount, finished, level, levelIndex, levels.length]);

  const selectOrMove = useCallback((key) => {
    if (finished || !level) return;
    const cell = grid[key];
    if (!selectedKey) {
      if (cell?.movable) {
        setSelectedKey(key);
        setStatus('Pieza seleccionada. Elige una celda vacía para reubicarla.');
      } else {
        violationsRef.current += 1;
        setStatus('Esa celda es fija. Solo se pueden mover piezas ópticas marcadas.');
      }
      return;
    }

    if (key === selectedKey) {
      setSelectedKey(null);
      setStatus('Selección cancelada.');
      return;
    }

    const result = movePiece(grid, selectedKey, key);
    if (!result.moved) {
      violationsRef.current += 1;
      setStatus('Movimiento no válido: el destino debe estar vacío.');
      return;
    }
    movesRef.current += 1;
    setGrid(compactGrid(result.grid));
    setSelectedKey(null);
    setStatus('Pieza reubicada. Comprueba la ruta o ajusta otra pieza.');
  }, [finished, grid, level, selectedKey]);

  const finishGame = useCallback((lastSolved) => {
    const totalTime = now() - gameStartTimeRef.current;
    const parTotal = levels.reduce((sum, item) => sum + item.par, 0);
    const aggregate = buildLaserResponseAggregate({
      completed: true,
      solvedLevels: solvedRef.current + (lastSolved ? 1 : 0),
      levelCount: levels.length,
      moveCount: movesRef.current,
      parTotal,
      timeMs: totalTime,
      ruleViolationCount: violationsRef.current,
      reconfigurationCount: movesRef.current,
    });
    setFinished(true);
    emitRef.current({
      eventType: 'game_end',
      timestamp: now(),
      gameState: { level: levels.length, difficulty: 'original_laser', score: aggregate.score },
    });
    onCompleteRef.current?.({
      gameId: 'laser_puzzle',
      ...aggregate,
    });
  }, [levels]);

  const checkRoute = useCallback(() => {
    if (finished || !level) return;
    const checkTime = now();
    const solved = antennaCount > 0 && trace.litAntennaCount === antennaCount;
    const levelAggregate = buildLaserResponseAggregate({
      completed: solved,
      solvedLevels: solved ? solvedRef.current + 1 : solvedRef.current,
      levelCount: levels.length,
      moveCount: movesRef.current,
      parTotal: levels.reduce((sum, item) => sum + item.par, 0),
      timeMs: checkTime - gameStartTimeRef.current,
      ruleViolationCount: violationsRef.current,
      reconfigurationCount: movesRef.current,
    });
    const response = sanitizeLaserResponsePayload({
      correct: solved,
      outcome: solved ? 'level_solved' : 'level_incomplete',
      reactionTimeMs: checkTime - levelStartTimeRef.current,
      score: levelAggregate.score,
      laserPuzzle: levelAggregate,
    });

    emitRef.current({
      eventType: 'response',
      trialId: level.id,
      targetId: `${level.id}-antennas`,
      timestamp: checkTime,
      response,
      gameState: { level: levelIndex + 1, difficulty: level.difficulty, score: levelAggregate.score },
    });

    if (!solved) {
      setStatus('La ruta aún no ilumina todas las antenas. Ajusta las piezas móviles.');
      return;
    }

    setStatus('Nivel resuelto. Ruta óptica reconstruida.');
    const nextIndex = levelIndex + 1;
    if (nextIndex >= levels.length) {
      finishGame(true);
      return;
    }
    solvedRef.current += 1;
    window.setTimeout(() => {
      const nextLevel = levels[nextIndex];
      setLevelIndex(nextIndex);
      setGrid(buildLaserGrid(nextLevel));
      setSelectedKey(null);
      setStatus('Nuevo mapa: reconstruye el camino del láser.');
    }, 350);
  }, [antennaCount, finishGame, finished, level, levelIndex, levels, trace.litAntennaCount]);

  if (!level) return null;

  if (finished) {
    return (
      <div className="laser-puzzle-task laser-puzzle-task--finished" data-testid="laser-puzzle-finished">
        <h3>Puzzle láser completado</h3>
        <p>Nivel resuelto. Ruta óptica reconstruida.</p>
        <p>Mapas resueltos: {levels.length} de {levels.length}</p>
        <p>Movimientos agregados: {movesRef.current}</p>
      </div>
    );
  }

  const cells = [];
  for (let y = 0; y < level.rows; y += 1) {
    for (let x = 0; x < level.cols; x += 1) {
      const key = cellKey(x, y);
      const cell = grid[key];
      const beamLit = trace.beamCells.has(key);
      cells.push(
        <button
          key={key}
          type="button"
          data-testid={`laser-cell-${key}`}
          className={`laser-puzzle-task__cell ${cell?.type ? `laser-puzzle-task__cell--${cell.type}` : 'laser-puzzle-task__cell--empty'} ${cell?.movable ? 'laser-puzzle-task__cell--movable' : ''} ${selectedKey === key ? 'laser-puzzle-task__cell--selected' : ''} ${beamLit ? 'laser-puzzle-task__cell--beam' : ''}`}
          aria-label={`${describeCell(cell)} ${key}`}
          onClick={() => selectOrMove(key)}
          style={{ width: metrics.cellSize, height: metrics.cellSize }}
        >
          <span aria-hidden="true">{getCellIcon(cell)}</span>
        </button>,
      );
    }
  }

  return (
    <div className="laser-puzzle-task">
      <div className="task-header laser-puzzle-task__header">
        <h3 className="task-title">🛰️ Puzzle láser</h3>
        <span className="task-progress">Nivel {levelIndex + 1} de {levels.length}</span>
        <span className="task-progress">{trace.litAntennaCount}/{antennaCount} antenas</span>
      </div>
      <p className="caption laser-puzzle-task__caption">
        {level.objective ?? 'Reconstruye el camino del láser moviendo solo piezas ópticas.'} Se guardan métricas agregadas, no la ruta completa.
      </p>
      <div className="laser-puzzle-task__workspace">
        <div
          className="laser-puzzle-task__board"
          data-testid="laser-puzzle-board"
          data-board-width={metrics.boardWidth}
          data-board-height={metrics.boardHeight}
          style={{
            width: metrics.boardWidth,
            height: metrics.boardHeight,
            padding: metrics.padding,
            gap: metrics.gap,
            gridTemplateColumns: `repeat(${level.cols}, ${metrics.cellSize}px)`,
          }}
        >
          {cells}
        </div>
        <aside className="laser-puzzle-task__side-panel" aria-label="Resumen del puzzle láser">
          <strong>{level.name}</strong>
          <span>Dificultad: {level.difficulty}</span>
          {level.coreChallenge && <span>Reto: {level.coreChallenge}</span>}
          <span>Par: {level.par} movimientos</span>
          <span>Movimientos: {movesRef.current}</span>
          <span>Antenas activas: {trace.litAntennaCount}/{antennaCount}</span>
        </aside>
      </div>
      <div className="laser-puzzle-task__footer">
        <p role="status">{status}</p>
        <button type="button" className="primary" onClick={checkRoute}>Comprobar ruta</button>
      </div>
    </div>
  );
}

export default function LaserPuzzlePostulationTask({ active = false, onGameEvent, onComplete, trialCount = 1, width = 606, height = 338 }) {
  return (
    <GameRuntime
      active={active}
      gameDefinition={LASER_GAME_DEFINITION}
      onEvent={onGameEvent}
      renderTrial={(_, emit) => (
        <LaserPuzzleInner
          emit={emit}
          trialCount={trialCount}
          width={width}
          height={height}
          onComplete={onComplete}
        />
      )}
    />
  );
}
