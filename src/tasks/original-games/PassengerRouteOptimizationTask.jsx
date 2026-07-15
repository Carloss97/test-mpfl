import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GameRuntime from '../GameRuntime.jsx';
import {
  buildPassengerRouteDemoLevels,
  buildPassengerRouteResponseAggregate,
  getPassengerRouteBoardMetrics,
  sanitizePassengerRouteResponsePayload,
  solvePassengerRouteLevel,
} from './passengerRouteTelemetry.js';

const PASSENGER_ROUTE_GAME_DEFINITION = Object.freeze({
  id: 'passenger_routes',
  label: 'Optimización de rutas de pasajeros',
  difficulty: 'constraint_planning',
});

const MOVE_BY_DIRECTION = Object.freeze({
  up: Object.freeze({ dx: 0, dy: -1, cost: 2 }),
  down: Object.freeze({ dx: 0, dy: 1, cost: 2 }),
  left: Object.freeze({ dx: -1, dy: 0, cost: 1 }),
  right: Object.freeze({ dx: 1, dy: 0, cost: 1 }),
});

function now() {
  return globalThis.performance?.now?.() ?? Date.now();
}

function cellKey(x, y) {
  return `${x},${y}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getSatisfactionScore({ routeEfficiency, replanCount, constraintViolationCount }) {
  return clamp(Math.round(
    100
      - ((1 - routeEfficiency) * 30)
      - (Math.max(0, replanCount) * 4)
      - (Math.max(0, constraintViolationCount) * 8),
  ), 0, 100);
}

function PassengerRouteInner({ emit, trialCount, width, height, onComplete }) {
  const emitRef = useRef(emit);
  const onCompleteRef = useRef(onComplete);
  const levels = useMemo(
    () => buildPassengerRouteDemoLevels().slice(0, Math.max(1, Number(trialCount) || 1)),
    [trialCount],
  );
  const levelSolutions = useMemo(() => levels.map(solvePassengerRouteLevel), [levels]);
  const destinationCount = useMemo(
    () => levels.reduce((total, item) => total + item.passengers.length, 0),
    [levels],
  );
  const [levelIndex, setLevelIndex] = useState(0);
  const level = levels[levelIndex];
  const [player, setPlayer] = useState(() => ({ ...levels[0].start }));
  const [routeBudget, setRouteBudget] = useState(() => levels[0].routeBudget);
  const [onboardId, setOnboardId] = useState(null);
  const [deliveredIds, setDeliveredIds] = useState([]);
  const [status, setStatus] = useState('Revisa el mapa, recoge al pasajero y planifica el destino.');
  const [finished, setFinished] = useState(false);
  const startTimeRef = useRef(now());
  const levelStartRef = useRef(now());
  const shownLevelsRef = useRef(new Set());
  const transitionTimeoutRef = useRef(null);
  const actualCostRef = useRef(0);
  const completedMinimumCostRef = useRef(0);
  const passengersDeliveredRef = useRef(0);
  const replanCountRef = useRef(0);
  const stationUseCountRef = useRef(0);
  const constraintViolationCountRef = useRef(0);

  const metrics = useMemo(
    () => getPassengerRouteBoardMetrics(level, { width, height }),
    [height, level, width],
  );
  const wallSet = useMemo(() => new Set(level?.walls ?? []), [level]);

  useEffect(() => { emitRef.current = emit; }, [emit]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useEffect(() => () => window.clearTimeout(transitionTimeoutRef.current), []);

  useEffect(() => {
    if (!level || finished || shownLevelsRef.current.has(level.id)) return;
    shownLevelsRef.current.add(level.id);
    levelStartRef.current = now();
    emitRef.current({
      eventType: 'stimulus_shown',
      trialId: level.id,
      targetId: `${level.id}-destinations`,
      timestamp: levelStartRef.current,
      stimulus: {
        kind: 'passenger_route_level',
        payload: {
          levelIndex: levelIndex + 1,
          levelCount: levels.length,
          passengerCount: level.passengers.length,
          destinationCount: level.passengers.length,
          stationCount: level.stations.length,
          routeBudget: level.routeBudget,
          minimumCost: levelSolutions[levelIndex]?.minimumCost ?? 0,
        },
      },
      gameState: {
        level: levelIndex + 1,
        difficulty: level.difficulty,
        score: passengersDeliveredRef.current,
      },
    });
  }, [finished, level, levelIndex, levelSolutions, levels.length]);

  const buildAggregate = useCallback((completed, minimumCost) => {
    const actualCost = actualCostRef.current;
    const routeEfficiency = actualCost > 0 ? clamp(minimumCost / actualCost, 0, 1) : 0;
    return buildPassengerRouteResponseAggregate({
      completed,
      passengersDelivered: passengersDeliveredRef.current,
      destinationCount,
      actualCost,
      minimumCost,
      replanCount: replanCountRef.current,
      stationUseCount: stationUseCountRef.current,
      constraintViolationCount: constraintViolationCountRef.current,
      satisfactionScore: getSatisfactionScore({
        routeEfficiency,
        replanCount: replanCountRef.current,
        constraintViolationCount: constraintViolationCountRef.current,
      }),
      timeMs: now() - startTimeRef.current,
    });
  }, [destinationCount]);

  const completeLevel = useCallback(() => {
    if (!level || finished) return;
    const responseTime = now();
    const completedMinimumCost = completedMinimumCostRef.current
      + (levelSolutions[levelIndex]?.minimumCost ?? 0);
    const isLastLevel = levelIndex >= levels.length - 1;
    const aggregate = buildAggregate(isLastLevel, completedMinimumCost);

    emitRef.current({
      eventType: 'response',
      trialId: level.id,
      targetId: `${level.id}-destinations`,
      timestamp: responseTime,
      response: sanitizePassengerRouteResponsePayload({
        correct: true,
        outcome: 'route_completed',
        reactionTimeMs: responseTime - levelStartRef.current,
        score: aggregate.score,
        passengerRoutes: aggregate,
      }),
      gameState: {
        level: levelIndex + 1,
        difficulty: level.difficulty,
        score: aggregate.score,
      },
    });

    completedMinimumCostRef.current = completedMinimumCost;
    if (isLastLevel) {
      setFinished(true);
      setStatus('Rutas completadas con resultados agregados.');
      emitRef.current({
        eventType: 'game_end',
        timestamp: now(),
        gameState: {
          level: levels.length,
          difficulty: 'constraint_planning',
          score: aggregate.score,
        },
      });
      onCompleteRef.current?.({
        gameId: 'passenger_routes',
        ...aggregate,
      });
      return;
    }

    setStatus('Ruta completada. Preparando el siguiente circuito.');
    transitionTimeoutRef.current = window.setTimeout(() => {
      const nextIndex = levelIndex + 1;
      const nextLevel = levels[nextIndex];
      setLevelIndex(nextIndex);
      setPlayer({ ...nextLevel.start });
      setRouteBudget(nextLevel.routeBudget);
      setOnboardId(null);
      setDeliveredIds([]);
      setStatus('Nuevo circuito: prioriza pasajeros, destinos y parada de apoyo.');
    }, 300);
  }, [buildAggregate, finished, level, levelIndex, levelSolutions, levels]);

  const registerConstraintViolation = useCallback((message) => {
    constraintViolationCountRef.current += 1;
    setStatus(message);
  }, []);

  const move = useCallback((directionName) => {
    if (!level || finished) return;
    const direction = MOVE_BY_DIRECTION[directionName];
    if (!direction) return;

    const x = player.x + direction.dx;
    const y = player.y + direction.dy;
    if (
      x < 0
      || y < 0
      || x >= level.cols
      || y >= level.rows
      || wallSet.has(cellKey(x, y))
    ) {
      registerConstraintViolation('Tramo bloqueado. Revisa el plan antes de continuar.');
      return;
    }
    if (routeBudget < direction.cost) {
      registerConstraintViolation('Presupuesto insuficiente. Busca una parada de apoyo para recargar.');
      return;
    }

    actualCostRef.current += direction.cost;
    let nextBudget = routeBudget - direction.cost;
    let nextOnboardId = onboardId;
    let nextDeliveredIds = deliveredIds;
    let nextStatus = 'Movimiento registrado. Continúa optimizando la ruta.';

    const station = level.stations.find((item) => item.x === x && item.y === y);
    if (station && nextBudget < level.routeBudget) {
      nextBudget = level.routeBudget;
      stationUseCountRef.current += 1;
      nextStatus = 'Parada de apoyo utilizada: presupuesto operativo restaurado.';
    }

    if (nextOnboardId) {
      const passenger = level.passengers.find((item) => item.id === nextOnboardId);
      if (passenger?.destination.x === x && passenger?.destination.y === y) {
        nextDeliveredIds = [...deliveredIds, passenger.id];
        passengersDeliveredRef.current += 1;
        nextOnboardId = null;
        nextStatus = `${passenger.label} llegó a destino.`;
      }
    }

    if (!nextOnboardId) {
      const waitingPassenger = level.passengers.find((item) => (
        item.x === x
        && item.y === y
        && !nextDeliveredIds.includes(item.id)
      ));
      if (waitingPassenger) {
        nextOnboardId = waitingPassenger.id;
        nextStatus = `${waitingPassenger.label} a bordo. Ahora dirígete al destino ${waitingPassenger.id}.`;
      }
    }

    setPlayer({ x, y });
    setRouteBudget(nextBudget);
    setOnboardId(nextOnboardId);
    setDeliveredIds(nextDeliveredIds);
    setStatus(nextStatus);

    const levelCompleted = level.passengers.every((passenger) => nextDeliveredIds.includes(passenger.id));
    if (levelCompleted && !nextOnboardId) completeLevel();
  }, [completeLevel, deliveredIds, finished, level, onboardId, player, registerConstraintViolation, routeBudget, wallSet]);

  const registerReplan = useCallback(() => {
    if (finished) return;
    replanCountRef.current += 1;
    setStatus('Replanificación registrada. Revisa restricciones antes del siguiente tramo.');
  }, [finished]);

  if (!level) return null;

  if (finished) {
    return (
      <div className="passenger-route-task passenger-route-task--finished" data-testid="passenger-route-finished">
        <h3>Optimización de rutas completada</h3>
        <p>Pasajeros entregados: {passengersDeliveredRef.current} de {destinationCount}</p>
        <p>Resultados guardados como métricas agregadas para revisión humana.</p>
      </div>
    );
  }

  const cells = [];
  for (let y = 0; y < level.rows; y += 1) {
    for (let x = 0; x < level.cols; x += 1) {
      const key = cellKey(x, y);
      const isWall = wallSet.has(key);
      const station = level.stations.find((item) => item.x === x && item.y === y);
      const passenger = level.passengers.find((item) => (
        item.x === x
        && item.y === y
        && !deliveredIds.includes(item.id)
        && onboardId !== item.id
      ));
      const destination = level.passengers.find((item) => (
        item.destination.x === x
        && item.destination.y === y
      ));
      const isPlayer = player.x === x && player.y === y;
      const cellClasses = [
        'passenger-route-task__cell',
        isWall ? 'passenger-route-task__cell--wall' : 'passenger-route-task__cell--street',
        station ? 'passenger-route-task__cell--station' : '',
        destination ? 'passenger-route-task__cell--destination' : '',
      ].filter(Boolean).join(' ');

      cells.push(
        <div
          key={key}
          className={cellClasses}
          aria-label={isWall ? `Bloque urbano ${key}` : `Tramo de ruta ${key}`}
          style={{ width: metrics.cellSize, height: metrics.cellSize }}
        >
          {destination && !isWall && (
            <span className="passenger-route-task__destination" title={`Destino ${destination.id}`}>
              {destination.id}
            </span>
          )}
          {station && !isWall && <span aria-label="Parada de apoyo">⛽</span>}
          {passenger && !isWall && (
            <span className="passenger-route-task__passenger" aria-label={passenger.label}>👤</span>
          )}
          {isPlayer && !isWall && (
            <span
              className="passenger-route-task__player"
              data-testid="passenger-route-player"
              data-player-x={player.x}
              data-player-y={player.y}
              aria-label={onboardId ? `Vehículo con pasajero ${onboardId}` : 'Vehículo disponible'}
            >
              🚐
            </span>
          )}
        </div>,
      );
    }
  }

  return (
    <div className="passenger-route-task">
      <div className="task-header passenger-route-task__header">
        <h3 className="task-title">🚌 Optimización de rutas</h3>
        <span className="task-progress">Circuito {levelIndex + 1} de {levels.length}</span>
        <span className="task-progress">Destinos {deliveredIds.length}/{level.passengers.length}</span>
      </div>
      <p className="caption passenger-route-task__caption">
        Recoge pasajeros y llévalos a su destino administrando tiempo, combustible y presupuesto de ruta. Solo se conservan resultados agregados.
      </p>
      <div className="passenger-route-task__workspace">
        <div
          className="passenger-route-task__board"
          data-testid="passenger-route-board"
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
        <aside className="passenger-route-task__side-panel" aria-label="Estado de la ruta">
          <strong>{level.name}</strong>
          <span>Presupuesto operativo: {routeBudget}/{level.routeBudget}</span>
          <span>Pasajero a bordo: {onboardId ?? 'ninguno'}</span>
          <span>Paradas de apoyo: {level.stations.length}</span>
          <span>Horizontal 1 · vertical 2</span>
          <button type="button" className="secondary" onClick={registerReplan}>Revisar plan</button>
        </aside>
      </div>
      <div className="passenger-route-task__footer">
        <div className="passenger-route-task__controls" aria-label="Controles de ruta">
          <button type="button" aria-label="Arriba" onClick={() => move('up')} style={{ width: metrics.controlSize, height: metrics.controlSize }}>↑</button>
          <div>
            <button type="button" aria-label="Izquierda" onClick={() => move('left')} style={{ width: metrics.controlSize, height: metrics.controlSize }}>←</button>
            <button type="button" aria-label="Abajo" onClick={() => move('down')} style={{ width: metrics.controlSize, height: metrics.controlSize }}>↓</button>
            <button type="button" aria-label="Derecha" onClick={() => move('right')} style={{ width: metrics.controlSize, height: metrics.controlSize }}>→</button>
          </div>
        </div>
        <p role="status">{status}</p>
      </div>
    </div>
  );
}

export default function PassengerRouteOptimizationTask({
  active = false,
  onGameEvent,
  onComplete,
  trialCount = 2,
  width = 606,
  height = 338,
}) {
  return (
    <GameRuntime
      active={active}
      gameDefinition={PASSENGER_ROUTE_GAME_DEFINITION}
      onEvent={onGameEvent}
      renderTrial={(_, emit) => (
        <PassengerRouteInner
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
