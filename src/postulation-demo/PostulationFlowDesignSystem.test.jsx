// H4.3 (2026-09-07): spec de reconstrucción del flujo candidato sobre el
// design system (tokens --k-*), alineado con LandingPage (H4.2). Criterio de
// aceptación: consistencia visual verificable sección a sección — el chrome
// del flujo (guard, setup, stage, reporte) usa tokens del sistema, sin
// hex/rgba indigo duplicados en vistas de flujo. H4.5 (t_5d775c9a) aplicó
// tokens al chrome de juegos: ver PostulationGamesDesignSystem.test.jsx —
// las superficies de juego de :root quedaron tokenizadas; los mundos de cada
// juego y los colores de estado funcional de tarea se conservan.
// V5 (t_0184d2e6, fase v3): las secciones H4.4 (/reclutador, hr-dashboard v1)
// fueron eliminadas con el borrado de la vista deprecada.
import fs from 'node:fs';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';
import PostulationReportScreen from './PostulationReportScreen.jsx';
import { buildPostulationDemoArtifacts } from './postulationDemoSessionBuilder.js';

// jsdom corre con URL about:blank (sin origin) → window.localStorage es
// undefined. Mock de módulo (patrón PostulationReportScreen.test.jsx).
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

const css = fs.readFileSync('src/postulation-demo/postulationDemo.css', 'utf8');

// Extrae las declaraciones de la primera regla cuyo selector exacto aparece
// en el texto (selector + '{' + hasta el '}' de cierre de esa regla).
function blockOf(text, selector) {
  const idx = text.indexOf(`${selector} {`);
  if (idx === -1) return '';
  const open = text.indexOf('{', idx);
  return text.slice(open + 1, text.indexOf('}', open));
}

// Fixture mínimo válido (mismo patrón que PostulationReportScreen.test.jsx).
const completedDemo = Object.freeze({
  completedCount: 1,
  totalCount: 1,
  blocks: [{
    block: { gameId: 'precision_targeting', label: 'Precisión visomotora', skill: 'visuomotor_precision', trialCount: 2 },
    summary: { completedTrialCount: 2, trialCount: 2, accuracy: 0.9, score: 0.82, meanReactionTimeMs: 520 },
  }],
});

const gameEvents = Object.freeze([
  { type: 'game_event_v1', eventType: 'stimulus_shown', gameId: 'precision_targeting', trialId: 'p1', targetId: 'target-1', timestamp: 1000, stimulus: { kind: 'fitts_target_after_start_pad', payload: { target: { x: 100, y: 80 }, origin: { x: 20, y: 20 } } } },
  { type: 'game_event_v1', eventType: 'response', gameId: 'precision_targeting', trialId: 'p1', targetId: 'target-1', timestamp: 1320, response: { correct: true, outcome: 'hit', reactionTimeMs: 320, score: 0.9, fitts: { indexDifficulty: 3.1, throughput: 4.2 }, pointerSummary: { pathEfficiency: 0.82 } } },
]);

const signalContext = Object.freeze({
  faceSamples: [
    { timestamp: 820, quality: { facePresent: true, confidence: 0.78 }, blendshapes: { browDownLeft: 0.03, browDownRight: 0.03 } },
    { timestamp: 1040, quality: { facePresent: true, confidence: 0.84 }, blendshapes: { browDownLeft: 0.16, browDownRight: 0.17 } },
  ],
  gazeSamples: [{ timestamp: 1200, lookingAtScreen: true, confidence: 0.82, screenX: 0.53, screenY: 0.48 }],
  postureSamples: [{ timestamp: 1200, postureScore: 0.72, headForward: 0.28, confidence: 0.8 }],
  upperBodySamples: [{ timestamp: 1220, confidence: 0.82, armActivity: 0.38, upperBodyCoverage: 0.8 }],
  latestGaze: { lookingAtScreen: true, confidence: 0.82, screenX: 0.53, screenY: 0.48 },
  latestPosture: { postureScore: 0.72, headForward: 0.28, confidence: 0.8 },
  moveNetPose: { confidence: 0.82, symmetry: 0.9, upperBodyCoverage: 0.8, armActivity: 0.38 },
  runtime: { delegate: 'GPU' },
});

function buildArtifacts() {
  return buildPostulationDemoArtifacts({
    completedDemo,
    gameEvents,
    signalSnapshot: { sampleCount: 42, facePresenceRatio: 0.86, meanConfidence: 0.81, caveats: [] },
    signalContext,
    generatedAt: '2026-09-07T12:00:00.000Z',
    runId: 'postulation-flow-design-system-test',
  });
}

const artifacts = buildArtifacts();
const blockedArtifacts = {
  ...artifacts,
  payload: { ...artifacts.payload, validation: { ok: false } },
  validation: { ok: false },
};

describe('H4.3 — flujo candidato sobre design system', () => {
  it(':root — mapa semántico del flujo a tokens --k-*', () => {
    for (const line of [
      '--postulation-bg: var(--k-bg-light);',
      '--postulation-ink: var(--k-ink-espresso);',
      '--postulation-muted: var(--k-ink-medium);',
      '--postulation-line: var(--k-divider);',
      '--postulation-primary: var(--k-accent-sand);',
      '--postulation-primary-strong: var(--k-ink-espresso);',
      '--postulation-accent: var(--k-accent-sand);',
      '--postulation-success: var(--k-status-ok);',
      '--postulation-warning: var(--k-status-warn);',
      '--postulation-danger: var(--k-status-error);',
    ]) {
      expect(css).toContain(line);
    }
  });

  it(':root — superficies de juego tokenizadas en H4.5 (t_5d775c9a)', () => {
    for (const line of [
      '--postulation-game-surface: var(--k-card-cream);',
      '--postulation-game-control-bg: var(--k-card-cream);',
      '--postulation-game-control-text: var(--k-ink-card);',
      '--postulation-game-control-border: var(--k-divider);',
      '--postulation-game-target: var(--k-status-ok);',
      '--postulation-game-distractor: var(--k-ink-medium);',
    ]) {
      expect(css).toContain(line);
    }
  });

  it(':root — focus ring terracota AA sobre claro (≥3:1, design-system §6.1)', () => {
    expect(blockOf(css, ':root')).toContain('--postulation-game-focus-ring: rgba(116, 84, 62, 0.9);');
  });

  it('guard — pantalla espresso con texto crema (una sola regla base)', () => {
    const guard = blockOf(css, '.postulation-demo__invite-guard');
    expect(guard).toContain('background: var(--k-bg-dark-deep);');
    expect(guard).toContain('color: var(--k-text-cream);');
    expect(guard).toContain('display: grid;');
    expect(guard).toContain('position: relative;');
    // La regla duplicada del anclaje H3 (solo position/min-height) se fusionó.
    expect(css.split('.postulation-demo__invite-guard {').length).toBe(2);
  });

  it('guard — pill de idioma con override oscuro (patrón landing §6)', () => {
    expect(css).toContain('.postulation-demo__invite-guard .krumm-lang-toggle__btn.is-active {');
    expect(blockOf(css, '.postulation-demo__invite-guard .krumm-lang-toggle__btn.is-active')).toContain('text-decoration: underline;');
  });

  it('CTA primario — pill arena del sistema, sin indigo', () => {
    const primary = blockOf(css, '.postulation-demo__primary');
    expect(primary).toContain('color: var(--k-cta-ink);');
    expect(primary).toContain('background: var(--k-cta-bg);');
    expect(primary).toContain('box-shadow: var(--k-shadow-cta);');
    expect(primary).not.toContain('rgba(79, 70, 229');
  });

  it('landing interna + setup — radios y sombras del sistema', () => {
    const brief = blockOf(css, '.postulation-demo__brief');
    expect(brief).toContain('border-radius: var(--k-radius-panel);');
    expect(brief).toContain('box-shadow: var(--k-shadow-soft);');
    const setupPanel = blockOf(css, '.postulation-demo__setup-panel,\n.postulation-demo__setup-side');
    expect(setupPanel).toContain('border-radius: var(--k-radius-panel);');
    const eyebrow = blockOf(css, '.postulation-demo__eyebrow');
    expect(eyebrow).toContain('color: var(--k-ink-terracotta);');
    expect(eyebrow).not.toContain('rgba(79, 70, 229');
  });

  it('setup — selector de cámara sobre tokens (borde divider + foco gold)', () => {
    const select = blockOf(css, '.postulation-demo__device-label select');
    expect(select).toContain('border: 1.5px solid var(--k-divider);');
    const selectFocus = blockOf(css, '.postulation-demo__device-label select:focus-visible');
    expect(selectFocus).toContain('border-color: var(--k-accent-sand);');
    expect(selectFocus).toContain('box-shadow: 0 0 0 4px var(--k-tint-gold);');
  });

  it('feedback — SignalErrorHint sobre tokens de estado', () => {
    const hint = blockOf(css, '.postulation-demo__signal-hint');
    expect(hint).toContain('border-radius: var(--k-radius-card);');
    expect(hint).toContain('color: var(--k-status-warn);');
    expect(blockOf(css, '.postulation-demo__signal-hint--blocking')).toContain('color: var(--k-status-error);');
    expect(blockOf(css, '.postulation-demo__signal-hint-stop')).toContain('border-radius: var(--k-radius-pill);');
  });

  it('reporte — status card navy (dato frío) + modificador --blocked', () => {
    const status = blockOf(css, '.postulation-demo__report-status-card');
    expect(status).toContain('background: var(--k-card-navy);');
    expect(status).toContain('box-shadow: var(--k-shadow-float);');
    expect(status).not.toContain('rgba(79, 70, 229');
    expect(css).toContain('.postulation-demo__report-status-card--blocked {');
    expect(blockOf(css, '.postulation-demo__report-status-card--blocked')).toContain('background: var(--k-status-error-soft);');
  });

  it('reporte — sin integridad: la card aplica --blocked (componente)', () => {
    render(
      <LanguageProvider>
        <PostulationReportScreen artifacts={blockedArtifacts} completedDemo={completedDemo} onRestart={() => {}} />
      </LanguageProvider>,
    );
    expect(screen.getByText(/Integridad técnica bloqueada/i)).toBeInTheDocument();
    expect(document.querySelector('.postulation-demo__report-status-card--blocked')).not.toBeNull();
  });

  it('reporte — con integridad: no hay modificador --blocked (componente)', () => {
    render(
      <LanguageProvider>
        <PostulationReportScreen artifacts={artifacts} completedDemo={completedDemo} onRestart={() => {}} />
      </LanguageProvider>,
    );
    expect(screen.getByText(/Integridad de archivos verificada/i)).toBeInTheDocument();
    expect(document.querySelector('.postulation-demo__report-status-card--blocked')).toBeNull();
  });

  it('pill de idioma tema claro — activo subrayado espresso y focus terracota 3px AA (design-system §6/§6.1)', () => {
    const tokens = fs.readFileSync('src/styles/krumm-tokens.css', 'utf8');
    const landing = fs.readFileSync('src/landing/landing.css', 'utf8');
    // Tema light (flujo candidato): base espresso cálida, sin relleno indigo
    // (antes --k-lang-active-bg #4f46e5 — color frío fuera del sistema, H4.3).
    expect(tokens).not.toContain('#4f46e5');
    expect(tokens).toContain('--k-lang-ink: rgba(61, 43, 32, 0.72);');
    expect(tokens).toContain('--k-lang-ink-strong: var(--k-ink-espresso);');
    expect(blockOf(tokens, '.krumm-lang-toggle__btn.is-active')).toContain('background: transparent;');
    expect(blockOf(tokens, '.krumm-lang-toggle__btn.is-active')).toContain('text-decoration: underline;');
    expect(blockOf(tokens, '.krumm-lang-toggle__btn:focus-visible')).toContain('3px solid var(--k-ink-terracotta)');
    // Superficie oscura (landing pública): focus dorado 2px + offset 3px (ref
    // marca v2, krumm_frontend.zip: .language-switcher button:focus-visible),
    // --k-gold == --k-accent-sand (#d8b38c) ≥3:1 sobre espresso.
    expect(blockOf(landing, '.landing .krumm-lang-toggle__btn:focus-visible')).toContain('outline: 2px solid var(--k-gold);');
  });
});
