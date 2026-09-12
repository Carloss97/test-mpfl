// H4.5 (2026-09-07, t_5d775c9a): spec del chrome de juegos sobre el design
// system (tokens --k-*). Reglas design-system.md §7.4–7.5:
// - Solo tokens visuales (tipografía, paleta de UI, radios): sin cambios de
//   mecánicas, sin layout de gameplay, sin reglas nuevas (solo valores).
// - El mundo visual de cada juego se conserva: laser "Órbita" (consola oscura),
//   balloon "Cielo" (arena celeste), passenger "Urbano" (mapa ciudad), team
//   "Faro" (RPG táctico), tangram. Los colores de estado funcional de tarea
//   (go/no-go, correct/incorrect, urgencia, barras de presupuesto,
//   delivered/popped) también se conservan: son semántica de juego, no paleta UI.
// - Contraste AA en el chrome: la sección report W5 dentro del archivo de
//   temas tenía blanco sobre oro (--postulation-primary tras el mapa H4.3) —
//   ahora --k-cta-ink, y sin color frío (#4338ca) fuera del sistema.
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = fs.readFileSync('src/postulation-demo/postulationDemo.css', 'utf8');
const themes = fs.readFileSync('src/postulation-demo/originalGameThemes.css', 'utf8');
const animations = fs.readFileSync('src/postulation-demo/originalGameAnimations.css', 'utf8');

// Extrae las declaraciones de la primera regla cuyo selector exacto aparece
// en el texto (selector + '{' hasta el '}' de cierre de esa regla).
function blockOf(text, selector) {
  const idx = text.indexOf(`${selector} {`);
  if (idx === -1) return '';
  const open = text.indexOf('{', idx);
  return text.slice(open + 1, text.indexOf('}', open));
}

describe('H4.5 — chrome de juegos sobre design system', () => {
  it(':root — mapa de superficies de juego a tokens --k-* (rebuild reservado por H4.3)', () => {
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

  it('task-area + pills compartidos: crema, divider, radios token', () => {
    const area = blockOf(css, '.postulation-demo .task-area');
    expect(area).toContain('border: 1px solid var(--k-divider);');
    expect(area).toContain('border-radius: var(--k-radius-card);');
    expect(area).toContain('background: var(--k-card-cream);');
    const pill = blockOf(css, '.postulation-demo .task-progress');
    expect(pill).toContain('border-radius: var(--k-radius-pill);');
  });

  it('.primary de juegos (temas): CTA pill arena, sombra CTA, sin indigo', () => {
    const primary = blockOf(themes, '.postulation-demo .primary');
    expect(primary).toContain('background: var(--k-cta-bg);');
    expect(primary).toContain('color: var(--k-cta-ink);');
    expect(primary).toContain('box-shadow: var(--k-shadow-cta);');
    expect(primary).toContain('border-radius: var(--k-radius-btn);');
    expect(primary).toContain('font-weight: var(--k-weight-bold);');
    expect(primary).not.toContain('#6366f1');
    expect(primary).not.toContain('rgba(79, 70, 229');
  });

  it('pips (temas): fallbacks del sistema; --game-pip-* por juego mandan (mundo)', () => {
    expect(blockOf(themes, '.game-pips__dot')).toContain('background: var(--k-divider);');
    expect(themes).toContain('background: var(--game-pip-done, var(--k-ink-espresso));');
    expect(themes).toContain('background: var(--game-pip-current, var(--k-accent-sand));');
    expect(themes).toContain('box-shadow: 0 0 0 3px var(--k-tint-gold-strong);');
    // Mundo passenger: pips propios (indigo de "Urbano" se conserva).
    expect(themes).toContain('--game-pip-current: #4f46e5;');
  });

  it('sfx-toggle + micro-intro (animaciones): crema/arena, sin indigo', () => {
    const sfx = blockOf(animations, '.postulation-demo__sfx-toggle');
    expect(sfx).toContain('border: 1px solid var(--k-divider);');
    expect(sfx).toContain('background: var(--k-card-cream);');
    expect(sfx).toContain('border-radius: var(--k-radius-pill);');
    expect(animations).toContain('border-color: var(--k-accent-sand);');
    const intro = blockOf(animations, '.game-micro-intro');
    expect(intro).toContain('background: var(--k-card-cream);');
    expect(intro).toContain('color: var(--k-ink-espresso);');
    expect(blockOf(animations, '.game-micro-intro__icon')).toContain('background: var(--k-tint-gold);');
    expect(animations).toContain('background: var(--k-accent-sand);'); // dot activo
    expect(animations).toContain('rgba(212, 180, 131, 0.35)'); // keyframes pip-pulse
    // El glow indigo de .passenger-route-task__token--loaded es mundo "Urbano"
    // (se conserva, §7.4) — la prohibición de indigo se acota al chrome.
    for (const block of [sfx, intro]) {
      expect(block).not.toContain('rgba(79, 70, 229');
      expect(block).not.toContain('#4f46e5');
    }
  });

  it('chrome de tareas (postulationDemo): tinta espresso/arena, chips tint oro', () => {
    expect(blockOf(css, '.postulation-demo .caption')).toContain('color: var(--k-ink-medium);');
    expect(blockOf(css, '.precision-targeting-task__route-card')).toContain('background: var(--k-card-cream);');
    expect(blockOf(css, '.precision-targeting-task__route-card strong')).toContain('background: var(--k-tint-gold);');
    expect(blockOf(css, '.passenger-route-task__side-panel')).toContain('background: var(--k-card-cream);');
    expect(blockOf(css, '.passenger-route-task__controls > strong')).toContain('color: var(--k-ink-terracotta);');
    expect(blockOf(css, '.color-interference-task__prompt')).toContain('color: var(--k-ink-terracotta);');
    // FASE B.5: el brief standalone de visual_search se retira (instrucción →
    // header pill); el chrome de marca del juego ahora es el feedback chip.
    expect(blockOf(css, '.visual-search-task__feedback')).toContain('border-radius: var(--k-radius-pill);');
    expect(blockOf(css, '.visual-search-task__feedback .rt-display')).toContain('color: var(--k-ink-medium);');
    expect(blockOf(css, '.laser-puzzle-task')).toContain('color: var(--k-text-cream-dim);');
    expect(blockOf(css, '.team-coordination-task')).toContain('color: var(--k-ink-espresso);');
    const option = blockOf(css, '.team-coordination-task__option');
    expect(option).toContain('background: var(--k-card-cream);');
    expect(option).toContain('color: var(--k-ink-card);');
    expect(option).toContain('border-radius: var(--k-radius-btn);');
    expect(css).toContain('box-shadow: inset 4px 0 0 var(--k-accent-sand), 0 8px 18px rgba(15, 23, 42, 0.08);');
    expect(blockOf(css, '.balloon-risk-task')).toContain('border-radius: var(--k-radius-card);');
    expect(blockOf(css, '.balloon-risk-task')).toContain('color: var(--k-ink-espresso);');
  });

  it('tangram overlay: card crema con tinta espresso (colores success/fail de tarea se conservan)', () => {
    const card = blockOf(css, '.tangram-task__overlay-card');
    expect(card).toContain('background: var(--k-card-cream);');
    expect(card).toContain('border-radius: var(--k-radius-card);');
    expect(blockOf(css, '.tangram-task__overlay-card strong')).toContain('color: var(--k-ink-espresso);');
    expect(blockOf(css, '.tangram-task__overlay-card span')).toContain('color: var(--k-ink-medium);');
    expect(css).toContain('.tangram-task__overlay-card--success strong');
    expect(css).toContain('color: #047857;');
    expect(css).toContain('color: #b91c1c;');
  });

  it('mundo visual de cada juego conservado (Órbita/Cielo/Urbano/Faro)', () => {
    // Laser "Órbita": consola oscura + override .primary cian + overlay cian.
    expect(themes).toContain('linear-gradient(150deg, #0b1220 0%, #0f1b33 55%, #17204a 100%)');
    expect(themes).toContain('background: linear-gradient(135deg, #22d3ee, #0891b2);');
    expect(animations).toContain('color: #67e8f9;');
    // Balloon "Cielo": arena celeste (override del mundo en temas) + pink.
    expect(themes).toContain('linear-gradient(160deg, #f0f9ff 0%, #eef2ff 100%)');
    expect(themes).toContain('linear-gradient(180deg, #bfdbfe 0%, #dbeafe 34%, #eff6ff 80%, #f0f9ff 100%)');
    expect(css).toContain('color: #9d174d;');
    // Passenger "Urbano": misión nocturna cian + destino indigo.
    expect(css).toContain('linear-gradient(135deg, #0f172a, #164e63)');
    expect(css).toContain('border: 2px solid #4338ca;');
    // Team "Faro": stage RPG táctico.
    expect(css).toContain('linear-gradient(145deg, #020617, #172554 58%, #164e63)');
    // CTAs de mundo con texto blanco explícito: el .primary compartido hereda
    // --k-cta-ink (espresso) tras H4.5; sin la declaración world saldría
    // espresso sobre gradiente cian/azul (regresión detectada en smoke H4.5).
    expect(themes).toContain('.laser-puzzle-task .primary {\n  background: linear-gradient(135deg, #22d3ee, #0891b2);\n  color: #ffffff;');
    expect(themes).toContain('.balloon-risk-task__controls .primary {\n  background: linear-gradient(135deg, #3b82f6, #2563eb);\n  color: #ffffff;');
    // Caption laser: selector con prefijo .postulation-demo (paridad de
    // especificidad con .postulation-demo .caption; este archivo carga
    // después → el color world #94a3b8 manda). Sin el prefijo, el caption
    // salía con tinta oscura sobre fondo oscuro (bug preexistente, smoke H4.5).
    expect(themes).toContain('.postulation-demo .laser-puzzle-task__caption {');
    expect(themes).toContain('color: #94a3b8;');
  });

  it('colores de estado funcional de tarea conservados (no son paleta UI)', () => {
    // go/no-go y correct/incorrect (teal/rose), urgencia, presupuesto, delivery.
    expect(css).toContain('.go-nogo-task__cue--go');
    expect(css).toContain('background: #ccfbf1;');
    expect(css).toContain('background: #fff1f2;');
    expect(css).toContain('background: #ef4444;');
    expect(css).toContain('linear-gradient(90deg, #10b981, #22c55e)');
    expect(animations).toContain('border: 1px solid rgba(16, 185, 129, 0.5);');
    // Estimulo Stroop: bordes de choice por color (semántica del juego).
    expect(css).toContain('rgba(220, 38, 38, 0.52)');
    expect(css).toContain('rgba(180, 83, 9, 0.52)');
  });

  it('report W5 (en archivo de temas): AA sobre oro y sin color frío', () => {
    const tag = blockOf(themes, '.postulation-demo__provisional-tag--solid');
    expect(tag).toContain('color: var(--k-cta-ink);');
    expect(tag).not.toContain('color: #ffffff');
    expect(blockOf(themes, '.postulation-demo__talent-score--provisional strong')).toContain('color: var(--k-ink-espresso);');
    expect(blockOf(themes, '.postulation-demo__score-sub')).toContain('color: var(--k-ink-medium);');
    expect(themes).not.toContain('#4338ca');
  });

  it('H4.6: footer laser — actions reducible (hint derecho no se recorta en stage)', () => {
    // La fila del footer es: p status + small keyboard-hint + div actions.
    // actions era `flex: 0 0 auto` → la caja se dimensionaba a max-content
    // (2 botones + el check-hint completo en una sola línea), la fila
    // desbordaba la tarjeta de 720px y el texto derecho se recortaba con
    // overflow-x:hidden del stage (hallazgo H4.5, shot C1 a 1280×720,
    // preexistente pre-H4). Con `flex: 0 1 auto` + `min-width: 0` la caja
    // puede reducirse y el check-hint envuelve a su propia línea dentro de
    // la caja (flex-basis: 100% en originalGameAnimations.css).
    const actions = blockOf(css, '.laser-puzzle-task__actions');
    expect(actions).toContain('flex: 0 1 auto');
    expect(actions).toContain('min-width: 0');
  });
});
