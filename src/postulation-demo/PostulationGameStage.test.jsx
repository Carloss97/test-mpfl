import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PostulationGameStage, { getPostulationGameViewport } from './PostulationGameStage.jsx';
import { buildOriginalGamePostulationBlocks } from './originalGameBlueprints.js';
import { listVisiblePostulationBlocks } from './postulationDemoConfig.js';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';

// jsdom corre con URL about:blank (sin origin) → window.localStorage es undefined.
// Mock de módulo (patrón LanguageContext.test.jsx): cada archivo de test recibe su propio jsdom.
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock, configurable: true });

function MockGame({ active, block, onComplete, onGameEvent }) {
  React.useEffect(() => {
    onGameEvent?.({ type: 'game_event_v1', eventType: 'game_start', gameId: block.gameId, timestamp: performance.now() });
  }, [block.gameId, onGameEvent]);
  return (
    <div aria-label={`mock-${block.gameId}`}>
      <p>Mock activo: {String(active)}</p>
      <p>Juego actual: {block.label}</p>
      <button type="button" onClick={() => {
        onGameEvent?.({ type: 'game_event_v1', eventType: 'game_end', gameId: block.gameId, timestamp: performance.now() });
        onComplete?.({ gameId: block.gameId, completedTrialCount: 2, accuracy: 0.9 });
      }}>
        Completar {block.gameId}
      </button>
    </div>
  );
}

function MockTrackingGame({ block, practice, onGameEvent, onComplete }) {
  React.useEffect(() => {
    onGameEvent?.({ type: 'game_event_v1', eventType: 'game_start', gameId: block.gameId, practice: practice === true, timestamp: performance.now() });
  }, [block.gameId, onGameEvent, practice]);
  return (
    <div aria-label={`track-${block.gameId}`} data-practice={String(practice === true)}>
      <button type="button" onClick={() => onComplete?.({ gameId: block.gameId, score: 0.9, practice: practice === true, preview: practice === true })}>
        Done {block.gameId}
      </button>
    </div>
  );
}

const BLOCKS = Object.freeze([
  Object.freeze({ gameId: 'precision_targeting', label: 'Precisión visomotora', skill: 'visuomotor_precision', phase: 'postulation_demo', durationLabel: '1 min' }),
  Object.freeze({ gameId: 'go_nogo', label: 'Control inhibitorio', skill: 'inhibitory_control', phase: 'postulation_demo', durationLabel: '1 min' }),
]);

describe('PostulationGameStage', () => {
  it('computes compact game viewport dimensions for low-height manual QA screens', () => {
    expect(getPostulationGameViewport({ width: 1366, height: 768 })).toMatchObject({
      width: expect.any(Number),
      height: expect.any(Number),
      compact: true,
    });
    const compact = getPostulationGameViewport({ width: 1366, height: 768 });
    expect(compact.width).toBeLessThanOrEqual(620);
    expect(compact.height).toBeLessThanOrEqual(340);

    const small = getPostulationGameViewport({ width: 1280, height: 720 });
    expect(small.width).toBeLessThanOrEqual(580);
    expect(small.height).toBeLessThanOrEqual(300);
  });

  it('never overflows available width across the 760–768 breakpoint band (G.5 / G1-P05)', () => {
    // The CSS mobile media query flips at 768px; the stage must stay within the
    // container for every width 760..768 so there is no horizontal overflow.
    for (let width = 760; width <= 768; width += 1) {
      const viewport = getPostulationGameViewport({ width, height: 720 });
      expect(viewport.width).toBeGreaterThan(0);
      expect(viewport.width).toBeLessThanOrEqual(width);
      expect(viewport.compact).toBe(true);
    }
  });

  describe('Stage móvil: el canvas se adapta al ancho real del contenedor (t_f40921bf)', () => {
    // Ancho visible (content box) del stage por ancho de ventana — chrome real
    // de postulationDemo.css (border-box): shell 18px (>520)/10px (<=520),
    // border 1px, stage padding clamp(12px, 2vw, 22px).
    const CONTENT = { 320: 274, 390: 344, 768: 699, 1280: 1198 };

    it('390x844 (móvil): el canvas sigue el contenedor, no el piso de 500', () => {
      const vp = getPostulationGameViewport({ width: 390, height: 844 });
      expect(vp.compact).toBe(true);
      expect(vp.width).toBeLessThan(500);                 // ya no forzado a 500
      expect(vp.width).toBeLessThanOrEqual(CONTENT[390]); // no desborda el stage
      expect(vp.width).toBeGreaterThanOrEqual(240);       // piso jugable
    });

    it('320x700 (móvil mínimo): el canvas cabe en el contenedor', () => {
      const vp = getPostulationGameViewport({ width: 320, height: 700 });
      expect(vp.compact).toBe(true);
      expect(vp.width).toBeLessThanOrEqual(CONTENT[320]);
      expect(vp.width).toBeGreaterThanOrEqual(240);
    });

    it('768x1024 (tablet): el canvas cabe en el contenedor', () => {
      const vp = getPostulationGameViewport({ width: 768, height: 1024 });
      expect(vp.compact).toBe(true);
      expect(vp.width).toBeLessThanOrEqual(CONTENT[768]);
      expect(vp.width).toBeGreaterThanOrEqual(240);
    });

    it('1280x800 (desktop compacto): mantiene el ancho anterior (sin regresión)', () => {
      const vp = getPostulationGameViewport({ width: 1280, height: 800 });
      expect(vp.compact).toBe(true);
      expect(vp.width).toBeLessThanOrEqual(580); // como antes
      expect(vp.width).toBeLessThanOrEqual(CONTENT[1280]);
    });
  });

  it('renders a fullscreen game stage with progress and advances through blocks', () => {
    const onCompleteDemo = vi.fn();
    const onGameEvent = vi.fn();
    render(
      <PostulationGameStage
        blocks={BLOCKS}
        gameComponents={{ precision_targeting: MockGame, go_nogo: MockGame }}
        onGameEvent={onGameEvent}
        onCompleteDemo={onCompleteDemo}
      />,
    );

    expect(screen.getByRole('heading', { name: /Precisión visomotora/i })).toBeInTheDocument();
    expect(screen.getByText(/Juego 1 de 2/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mock-precision_targeting/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Completar precision_targeting/i }));
    expect(screen.getByRole('heading', { name: /Control inhibitorio/i })).toBeInTheDocument();
    expect(screen.getByText(/Juego 2 de 2/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Completar go_nogo/i }));
    expect(onCompleteDemo).toHaveBeenCalledWith(expect.objectContaining({ completedCount: 2, totalCount: 2 }));
    const events = onGameEvent.mock.calls.map(([event]) => event);
    expect(events.filter((event) => event.eventType === 'game_start' && event.gameId === 'precision_targeting')).toHaveLength(1);
    expect(events.filter((event) => event.eventType === 'game_end' && event.gameId === 'go_nogo')).toHaveLength(1);
  });

  it('can render the planned Laser original game block through the default component map', () => {
    const laserBlock = buildOriginalGamePostulationBlocks().find((block) => block.gameId === 'laser_puzzle');
    render(<PostulationGameStage blocks={[{ ...laserBlock, visible: true, trialCount: 1 }]} onGameEvent={vi.fn()} />);

    expect(screen.getAllByRole('heading', { name: /Puzzle láser/i })).toHaveLength(2);
    expect(screen.getByText(/Reconstruye una órbita de cuatro reflectores/i)).toBeInTheDocument();
  });

  it('can render the planned Balloon original game block through the default component map', () => {
    const balloonBlock = buildOriginalGamePostulationBlocks().find((block) => block.gameId === 'balloon_risk');
    render(<PostulationGameStage blocks={[{ ...balloonBlock, visible: true, trialCount: 2 }]} onGameEvent={vi.fn()} />);

    expect(screen.getAllByRole('heading', { name: /Globo de riesgo/i })).toHaveLength(2);
    expect(screen.getByText(/Infla para acumular puntos/i)).toBeInTheDocument();
  });

  it('can render the hidden Passenger Routes block through the default component map', () => {
    const passengerBlock = buildOriginalGamePostulationBlocks().find((block) => block.gameId === 'passenger_routes');
    render(<PostulationGameStage blocks={[{ ...passengerBlock, visible: true, trialCount: 1 }]} onGameEvent={vi.fn()} />);

    expect(screen.getByRole('heading', { name: /Optimización de rutas/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Central de movilidad/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Barrio Luz/i).length).toBeGreaterThan(0);
    expect(screen.getByTestId('passenger-route-board')).toBeInTheDocument();
  });

  it('can render the team coordination completion probe through the default component map', () => {
    const teamBlock = buildOriginalGamePostulationBlocks().find((block) => block.gameId === 'team_coordination');
    render(<PostulationGameStage blocks={[{ ...teamBlock, visible: true, trialCount: 1 }]} onGameEvent={vi.fn()} />);

    expect(screen.getAllByRole('heading', { name: /Operación Faro/i })).toHaveLength(2);
    // H2: BehindPanel eliminado del juego team.
    expect(screen.queryByText(/Trabajo por detrás/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/no guarda texto libre/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('can render the BOMB defusal block through the default component map (B5-backfill t_32c02f91)', () => {
    const bombBlock = buildOriginalGamePostulationBlocks().find((block) => block.gameId === 'bomb_defusal');
    render(<PostulationGameStage blocks={[{ ...bombBlock, visible: true, trialCount: 4 }]} onGameEvent={vi.fn()} />);

    // Chrome shared (task-title pill) con el label del blueprint.
    expect(screen.getByRole('heading', { name: /Desactivación de secuencias \(Bomba\)/i })).toBeInTheDocument();
    // El mundo BOMB real (no un mock) se monta vía DEFAULT_GAME_COMPONENTS.
    expect(screen.getByTestId('bomb-welcome')).toBeInTheDocument();
    expect(screen.getByTestId('bomb-start-practice')).toBeInTheDocument();
  });

  describe('H2: indicador discreto de error de señal por juego (batería original, 6 juegos)', () => {
    const ORIGINAL_GAMES = ['laser_puzzle', 'balloon_risk', 'passenger_routes', 'team_coordination', 'tangram_exp001', 'bomb_defusal'];
    const OK_SNAPSHOT = Object.freeze({ camera: 'ok', face: 'ok', signal: 'ok', events: 3, report: 'pending' });
    const ERROR_SNAPSHOT = Object.freeze({ camera: 'error', face: 'idle', signal: 'idle', events: 3, report: 'pending' });
    const WARNING_SNAPSHOT = Object.freeze({ camera: 'ok', face: 'warning', signal: 'warning', events: 3, report: 'pending' });

    for (const gameId of ORIGINAL_GAMES) {
      it(`${gameId}: sin HUD "detrás" en modo ok; hint con error inyectado; auto-hide al resolverse`, () => {
        const block = buildOriginalGamePostulationBlocks().find((b) => b.gameId === gameId);
        const { rerender } = render(
          <PostulationGameStage blocks={[{ ...block, visible: true, trialCount: 1 }]} signalSnapshot={OK_SNAPSHOT} onGameEvent={vi.fn()} />,
        );

        // Modo ok (95% del tiempo): nada de "detrás".
        expect(screen.queryByText(/Procesando en segundo plano/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Ver qué pasa detrás/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/de 5 listos/i)).not.toBeInTheDocument();
        expect(screen.queryByTestId('signal-error-hint-chip')).not.toBeInTheDocument();
        expect(screen.getByTestId('sfx-toggle')).toBeInTheDocument();

        // Error inyectado (cámara sostenida): hint bloqueante inmediata con acción.
        rerender(
          <PostulationGameStage blocks={[{ ...block, visible: true, trialCount: 1 }]} signalSnapshot={ERROR_SNAPSHOT} onGameEvent={vi.fn()} onAbortDemo={vi.fn()} />,
        );
        const chip = screen.getByTestId('signal-error-hint-chip');
        expect(chip).toHaveTextContent(/Puedes continuar sin cámara/i);
        expect(screen.getByTestId('signal-hint-stop')).toHaveTextContent(/Detener evaluación/i);

        // Warning inyectado (rostro/señal): no bloqueante → sin botón de detener
        // (el delay de 5 s se cubre en el test de warning persistente y en SignalErrorHint.test).
        rerender(
          <PostulationGameStage blocks={[{ ...block, visible: true, trialCount: 1 }]} signalSnapshot={WARNING_SNAPSHOT} onGameEvent={vi.fn()} />,
        );
        expect(screen.queryByTestId('signal-hint-stop')).not.toBeInTheDocument();

        // Resuelto: de vuelta a ok → sin chip (auto-hide).
        rerender(
          <PostulationGameStage blocks={[{ ...block, visible: true, trialCount: 1 }]} signalSnapshot={OK_SNAPSHOT} onGameEvent={vi.fn()} />,
        );
        expect(screen.queryByTestId('signal-error-hint-chip')).not.toBeInTheDocument();
      });
    }

    it('warning persistente: aparece tras 5 s y desaparece de inmediato al resolverse (tangram, fase welcome sin timers propios)', () => {
      vi.useFakeTimers();
      try {
        const block = buildOriginalGamePostulationBlocks().find((b) => b.gameId === 'tangram_exp001');
        const { rerender } = render(
          <PostulationGameStage blocks={[{ ...block, visible: true, trialCount: 1 }]} signalSnapshot={WARNING_SNAPSHOT} onGameEvent={vi.fn()} />,
        );
        expect(screen.queryByTestId('signal-error-hint-chip')).not.toBeInTheDocument();
        act(() => { vi.advanceTimersByTime(5000); });
        expect(screen.getByTestId('signal-error-hint-chip')).toHaveTextContent(/Señal en pausa: mejora la iluminación/i);
        rerender(
          <PostulationGameStage blocks={[{ ...block, visible: true, trialCount: 1 }]} signalSnapshot={OK_SNAPSHOT} onGameEvent={vi.fn()} />,
        );
        expect(screen.queryByTestId('signal-error-hint-chip')).not.toBeInTheDocument();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  it('toggles game sound effects without emitting any telemetry (W2)', () => {
    const onGameEvent = vi.fn();
    render(
      <PostulationGameStage
        blocks={BLOCKS}
        gameComponents={{ precision_targeting: MockGame, go_nogo: MockGame }}
        onGameEvent={onGameEvent}
      />,
    );

    const eventsBefore = onGameEvent.mock.calls.length;
    const toggle = screen.getByTestId('sfx-toggle');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(toggle).toHaveTextContent('🔇');

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(toggle).toHaveTextContent('🔊');
    expect(toggle).toHaveAttribute('aria-label', 'Efectos de sonido: activados');

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    // The toggle must never generate game events.
    expect(onGameEvent.mock.calls.length).toBe(eventsBefore);
  });

  describe('H3.2 — LanguageToggle en el stage (esquina, no interfiere)', () => {
    beforeEach(() => {
      window.localStorage.clear();
    });

    it('muestra el toggle en el header (junto al progreso), cambia el copy a inglés y no emite telemetría', () => {
      const onGameEvent = vi.fn();
      render(
        <LanguageProvider>
          <PostulationGameStage
            blocks={BLOCKS}
            gameComponents={{ precision_targeting: MockGame, go_nogo: MockGame }}
            onGameEvent={onGameEvent}
          />
        </LanguageProvider>,
      );

      const toggle = screen.getByRole('group', { name: /Idioma \/ Language/i });
      expect(toggle).toBeInTheDocument();
      expect(toggle.closest('.postulation-demo__game-header')).not.toBeNull();
      expect(screen.getByText(/Juego 1 de 2/i)).toBeInTheDocument();

      const eventsBefore = onGameEvent.mock.calls.length;
      fireEvent.click(screen.getByRole('button', { name: 'EN' }));
      expect(window.localStorage.getItem('krumm-lang')).toBe('en');
      expect(screen.getByText(/Game 1 of 2/i)).toBeInTheDocument();
      expect(screen.getByTestId('sfx-toggle')).toHaveAttribute('aria-label', 'Sound effects: off');
      expect(onGameEvent.mock.calls.length).toBe(eventsBefore);

      fireEvent.click(screen.getByRole('button', { name: 'ES' }));
      expect(window.localStorage.getItem('krumm-lang')).toBe('es');
      expect(screen.getByText(/Juego 1 de 2/i)).toBeInTheDocument();
    });

    it('t_42978412: traduce label/description de los bloques stable_dg en el header (EN hidratado)', () => {
      window.localStorage.setItem('krumm-lang', 'en');
      render(
        <LanguageProvider>
          <PostulationGameStage
            blocks={listVisiblePostulationBlocks()}
            gameComponents={{
              precision_targeting: MockGame,
              go_nogo: MockGame,
              color_interference: MockGame,
              visual_search: MockGame,
            }}
            onGameEvent={vi.fn()}
          />
        </LanguageProvider>,
      );
      expect(screen.getByRole('heading', { name: 'Adaptive precision route' })).toBeInTheDocument();
      expect(screen.getByText(/Touch the start, follow the ideal corridor/i)).toBeInTheDocument();
      expect(screen.getByText(/Game 1 of 4/i)).toBeInTheDocument();
    });
  });

  it('passes the practice flag from the block to the game component (G.2)', () => {
    const onCompleteDemo = vi.fn();
    const onGameEvent = vi.fn();
    const practiceBlocks = [
      Object.freeze({ ...BLOCKS[0], practice: true }),
      Object.freeze({ ...BLOCKS[1] }),
    ];
    render(
      <PostulationGameStage
        blocks={practiceBlocks}
        gameComponents={{ precision_targeting: MockTrackingGame, go_nogo: MockTrackingGame }}
        onGameEvent={onGameEvent}
        onCompleteDemo={onCompleteDemo}
      />,
    );

    // Practice block receives practice=true.
    expect(screen.getByLabelText(/track-precision_targeting/i)).toHaveAttribute('data-practice', 'true');
    fireEvent.click(screen.getByRole('button', { name: /Done precision_targeting/i }));

    // Next (evaluative) block receives practice=false and the flow advances.
    expect(screen.getByLabelText(/track-go_nogo/i)).toHaveAttribute('data-practice', 'false');
    fireEvent.click(screen.getByRole('button', { name: /Done go_nogo/i }));
    expect(onCompleteDemo).toHaveBeenCalledWith(expect.objectContaining({ completedCount: 2 }));

    const practiceEvents = onGameEvent.mock.calls.map(([event]) => event).filter((event) => event.gameId === 'precision_targeting');
    expect(practiceEvents.some((event) => event.practice === true)).toBe(true);
  });
});
