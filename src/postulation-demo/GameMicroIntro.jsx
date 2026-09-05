import React, { useState } from 'react';

/**
 * Skippable animated micro-instructions (G.2 / W3): ≤3 steps × ~5s = ≤15s.
 * Shown as an overlay on each game's board before the first stimulus.
 * Purely instructional: emits no telemetry; the first trial clock starts
 * only when the intro is dismissed.
 */
const MICRO_INTRO_STEPS = Object.freeze({
  laser_puzzle: Object.freeze([
    Object.freeze({ icon: '🧩', title: 'Mueve las piezas ópticas', text: 'Toca una pieza marcada en ámbar y luego una celda vacía.', en: { title: 'Move the optical pieces', text: 'Tap a marked amber piece, then an empty cell.' } }),
    Object.freeze({ icon: '✴️', title: 'El haz cambia de rumbo', text: 'Cada reflección dobla el láser. El tablero muestra el camino en vivo.', en: { title: 'The beam changes direction', text: 'Every reflection bends the laser. The board shows the path live.' } }),
    Object.freeze({ icon: '📡', title: 'Ilumina todo y comprueba', text: 'Con relés y antenas encendidos, pulsa Comprobar ruta.', en: { title: 'Light everything and check', text: 'With relays and antennas lit, press Check route.' } }),
  ]),
  balloon_risk: Object.freeze([
    Object.freeze({ icon: '🎈', title: 'Infla para sumar puntos', text: 'Cada Inflar aumenta tu globo y tus puntos en riesgo.', en: { title: 'Pump to earn points', text: 'Each Inflate grows your balloon and your points at risk.' } }),
    Object.freeze({ icon: '🔒', title: 'Asegura cuando quieras', text: 'Asegurar banca los puntos de la ronda. No hay límite fijo.', en: { title: 'Secure when you want', text: 'Securing banks the round points. There is no fixed limit.' } }),
    Object.freeze({ icon: '💥', title: 'Cuidado con la tensión', text: 'Si el globo explota, la ronda se pierde. Decides tu nivel de riesgo.', en: { title: 'Beware the tension', text: 'If the balloon pops, the round is lost. You choose the risk level.' } }),
  ]),
  passenger_routes: Object.freeze([
    Object.freeze({ icon: '🚐', title: 'Mueve con las flechas', text: 'Conduce tu unidad por el mapa urbano usando el D-pad.', en: { title: 'Move with the arrows', text: 'Drive your unit across the city map with the D-pad.' } }),
    Object.freeze({ icon: '🧍', title: 'Recoge y entrega', text: 'Pasa sobre ● para recoger y sobre ⚑ para entregar.', en: { title: 'Pick up and deliver', text: 'Drive over ● to pick up and over ⚑ to deliver.' } }),
    Object.freeze({ icon: '⛽', title: 'Administra la energía', text: '←/→ cuestan 1 y ↑/↓ cuestan 2. Las paradas recargan.', en: { title: 'Manage the energy', text: '←/→ cost 1 and ↑/↓ cost 2. Stops recharge.' } }),
  ]),
  team_coordination: Object.freeze([
    Object.freeze({ icon: '📖', title: 'Lee la situación', text: 'Cada turno describe un momento de la Operación Faro.', en: { title: 'Read the situation', text: 'Each turn describes a moment in Faro Operation.' } }),
    Object.freeze({ icon: '🎯', title: 'Elige un comando', text: 'Selecciona la intervención A, B o C que alinee al equipo.', en: { title: 'Choose a command', text: 'Select the A, B or C intervention that aligns the team.' } }),
    Object.freeze({ icon: '📊', title: 'Revisa la consecuencia', text: 'Verás el efecto de tu elección antes de continuar.', en: { title: 'Check the consequence', text: "You will see the effect of your choice before continuing." } }),
  ]),
});

export function listMicroIntroSteps(gameId) {
  const steps = MICRO_INTRO_STEPS[gameId];
  return steps ? [...steps] : null;
}

export default function GameMicroIntro({ gameId, t, onDone }) {
  const steps = MICRO_INTRO_STEPS[gameId] ?? null;
  const [stepIndex, setStepIndex] = useState(0);
  if (!steps) return null;
  const step = steps[stepIndex];
  return (
    <div className="game-micro-intro" data-testid="game-micro-intro" role="dialog" aria-label={t(step.title, step.en.title)}>
      <span className={`game-micro-intro__icon game-micro-intro__icon--${gameId}`} aria-hidden="true">{step.icon}</span>
      <div className="game-micro-intro__body">
        <strong>{t(step.title, step.en.title)}</strong>
        <p>{t(step.text, step.en.text)}</p>
      </div>
      <div className="game-micro-intro__dots" aria-hidden="true">
        {steps.map((item, index) => (
          <i key={`${item.icon}-${index}`} className={index === stepIndex ? 'game-micro-intro__dot game-micro-intro__dot--active' : 'game-micro-intro__dot'} />
        ))}
      </div>
      <div className="game-micro-intro__actions">
        {stepIndex > 0 ? (
          <button type="button" className="secondary" onClick={() => setStepIndex((index) => Math.max(0, index - 1))}>{t('Atrás', 'Back')}</button>
        ) : null}
        {stepIndex < steps.length - 1 ? (
          <button type="button" className="primary" onClick={() => setStepIndex((index) => Math.min(steps.length - 1, index + 1))}>{t('Siguiente', 'Next')}</button>
        ) : (
          <button type="button" className="primary" onClick={onDone}>{t('Comenzar', 'Start')}</button>
        )}
        <button type="button" className="secondary" onClick={onDone}>{t('Saltar', 'Skip')}</button>
      </div>
    </div>
  );
}
