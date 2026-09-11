import { describe, it, expect } from 'vitest';
import { createControlRoomEngine, CONTROL_ROOM_STATES } from './controlRoomEngine.js';
import { buildControlRoomLevelSpec } from './controlRoomRules.js';

function fakeClock() {
  let t = 0;
  return { now: () => t, advance: (ms) => { t += ms; }, set: (ms) => { t = ms; } };
}

/** Escenario sintético mínimo para QA controlado. */
function makeScenario(overrides = {}) {
  const base = {
    id: 'TEST-S01',
    name: { es: 't', en: 't' },
    block: 1,
    practice: false,
    form: 'A',
    receiver: { role: 'operator', name: { es: 'op', en: 'op' } },
    facts: [{ key: 'k', value: 'v', critical: true }],
    steps: [
      {
        nodeId: 'open',
        npc: { es: 'h?', en: 'h?' },
        composer: false,
        cards: [{ id: 'c_ok', intent: 'INSTRUCT', text: { es: 'a', en: 'a' } }],
        verdicts: { c_ok: 'optimal' },
        next: { optimal: 'end' },
      },
    ],
    outcome: { resolved: { es: 'r', en: 'r' }, unresolved: { es: 'u', en: 'u' } },
    timeoutMs: null,
    npcReplyDelayMs: 300,
    consequenceMs: 2000,
    transitionMs: 500,
  };
  return { ...base, ...overrides };
}

describe('controlRoomEngine máquina de estados (EXP-COMM-001 C1, §7)', () => {
  it('start(): intro → reading → npc_turn → response; emite SCENARIO_START + NPC_MSG_SHOWN', () => {
    const c = fakeClock();
    const engine = createControlRoomEngine({ scenario: makeScenario(), now: c.now });
    expect(engine.state).toBe(CONTROL_ROOM_STATES.INTRO);
    engine.start();
    c.advance(100);
    expect(engine.state).toBe(CONTROL_ROOM_STATES.RESPONSE);
    expect(engine.eventCount('SCENARIO_START')).toBe(1);
    expect(engine.eventCount('NPC_MSG_SHOWN')).toBe(1);
    expect(engine.eventCount('NPC_REPLY_SHOWN')).toBe(0);
    expect(engine.npcMessage().es).toBe('h?');
  });

  it('camino óptimo completo: response → (send) → consequence → complete', () => {
    const c = fakeClock();
    const engine = createControlRoomEngine({ scenario: makeScenario(), now: c.now });
    engine.start();
    c.advance(200);
    expect(engine.selectCard('c_ok')).toEqual(expect.objectContaining({ ok: true, changed: true }));
    c.advance(300);
    const sent = engine.send();
    expect(sent.ok).toBe(true);
    expect(sent.verdict).toBe('optimal');
    expect(engine.state).toBe(CONTROL_ROOM_STATES.CONSEQUENCE);
    expect(engine.scored).toBe(true);
    expect(engine.resolved).toBe(true);
    engine.completeScenario();
    expect(engine.state).toBe(CONTROL_ROOM_STATES.COMPLETE);
  });

  it('input gate §12.3: send sin selección válida → no_selection (no emite MESSAGE_SEND)', () => {
    const c = fakeClock();
    const engine = createControlRoomEngine({ scenario: makeScenario(), now: c.now });
    engine.start();
    expect(engine.send()).toEqual(expect.objectContaining({ ok: false, reason: 'no_selection' }));
    expect(engine.eventCount('MESSAGE_SEND')).toBe(0);
  });

  it('QA §16.1 #5: send mientras verification activa → 2º SEND ignorado', () => {
    const c = fakeClock();
    const scenario = makeScenario({
      id: 'TEST-VERIFY',
      steps: [
        {
          nodeId: 'open',
          npc: { es: 'h?', en: 'h?' },
          composer: false,
          cards: [{ id: 'c_verify', intent: 'VERIFY', text: { es: 'confirma', en: 'confirm' } }],
          verdicts: { c_verify: 'optimal' },
          next: { optimal: 'confirm' },
        },
        {
          nodeId: 'confirm',
          npc: { es: 'ok', en: 'ok' },
          composer: false,
          cards: [{ id: 'c_done', intent: 'INFORM', text: { es: 'bien', en: 'fine' } }],
          verdicts: { c_done: 'optimal' },
          next: { optimal: 'end' },
        },
      ],
    });
    const engine = createControlRoomEngine({ scenario, now: c.now });
    engine.start();
    c.advance(100);
    engine.selectCard('c_verify');
    c.advance(100);
    const first = engine.send();
    expect(first.ok).toBe(true);
    expect(first.pendingVerification).toBe(true);
    expect(engine.state).toBe(CONTROL_ROOM_STATES.VERIFICATION);
    expect(engine.eventCount('VERIFICATION_SENT')).toBe(1);
    // 2º SEND ignorado (QA #5)
    expect(engine.send()).toEqual(expect.objectContaining({ ok: false, reason: 'verification_active' }));
    expect(engine.eventCount('MESSAGE_SEND')).toBe(1); // solo uno
    // completa el loop
    c.advance(100);
    engine.completeVerification();
    expect(engine.eventCount('VERIFICATION_RECEIVED')).toBe(1);
    expect(engine.state).toBe(CONTROL_ROOM_STATES.RESPONSE);
    expect(engine.composerSelection).toEqual([]);
    expect(engine.availableCards().map((x) => x.id)).toEqual(['c_done']);
  });

  it('QA §16.1 #6: NPC reply sin envío previo → el motor no lo crea', () => {
    const c = fakeClock();
    const engine = createControlRoomEngine({ scenario: makeScenario(), now: c.now });
    engine.start();
    c.advance(5000); // tiempo pasa, pero sin envío
    expect(engine.eventCount('NPC_REPLY_SHOWN')).toBe(0);
    expect(engine.integrityFlags()).not.toContain('npc_reply_without_send');
  });

  it('QA §16.1 #1: B6 timeout antes del 1er envío → escenario NO se puntúa + flag', () => {
    const c = fakeClock();
    const scenario = makeScenario({ id: 'TEST-B6', block: 6, timeoutMs: 45000 });
    const engine = createControlRoomEngine({ scenario, now: c.now });
    engine.start();
    c.advance(46000); // pasa el límite sin enviar nada
    const res = engine.tick();
    expect(res.expired).toBe(true);
    expect(engine.eventCount('TIMEOUT_TRIGGERED')).toBe(1);
    expect(engine.scored).toBe(false); // no se puntúa
    expect(engine.integrityFlags()).toContain('timeout_no_score');
    expect(engine.integrityFlags()).toContain('no_message_sent');
  });

  it('QA §16.1 #2: transición a nodo inexistente → technical_error + flag de integridad', () => {
    const c = fakeClock();
    const scenario = makeScenario({
      id: 'TEST-GHOST',
      steps: [
        {
          nodeId: 'open',
          npc: { es: 'h?', en: 'h?' },
          composer: false,
          cards: [{ id: 'c_ok', intent: 'INSTRUCT', text: { es: 'a', en: 'a' } }],
          verdicts: { c_ok: 'optimal' },
          next: { optimal: 'GHOST_NODE' }, // nodo que no existe
        },
      ],
    });
    const engine = createControlRoomEngine({ scenario, now: c.now });
    engine.start();
    c.advance(100);
    engine.selectCard('c_ok');
    c.advance(100);
    engine.send();
    expect(engine.state).toBe(CONTROL_ROOM_STATES.TECHNICAL_ERROR);
    expect(engine.integrityFlags()).toContain('unknown_step_transition');
    expect(engine.scored).toBe(false);
  });

  it('QA §16.1 #8: escenario sin ningún envío → integrity no_message_sent + no puntúa', () => {
    const c = fakeClock();
    const scenario = makeScenario({ id: 'TEST-NOSEND', timeoutMs: 5000 });
    const engine = createControlRoomEngine({ scenario, now: c.now });
    engine.start();
    c.advance(6000);
    engine.tick();
    expect(engine.totalMessageCountProbe?.() ?? engine.eventCount('MESSAGE_SEND')).toBe(0);
    expect(engine.scored).toBe(false);
    expect(engine.integrityFlags()).toContain('no_message_sent');
  });

  it('send por paso: 1er paso ok; al llegar al 2º paso sin selección, send → no_selection (sin 2º MESSAGE_SEND)', () => {
    const c = fakeClock();
    const scenario = makeScenario({
      id: 'TEST-DBL',
      steps: [
        {
          nodeId: 'open',
          npc: { es: 'h?', en: 'h?' },
          composer: false,
          cards: [{ id: 'c_ok', intent: 'INSTRUCT', text: { es: 'a', en: 'a' } }],
          verdicts: { c_ok: 'optimal' },
          next: { optimal: 'confirm' },
        },
        {
          nodeId: 'confirm',
          npc: { es: 'ok', en: 'ok' },
          composer: false,
          cards: [{ id: 'c_done', intent: 'INFORM', text: { es: 'b', en: 'b' } }],
          verdicts: { c_done: 'optimal' },
          next: { optimal: 'end' },
        },
      ],
    });
    const engine = createControlRoomEngine({ scenario, now: c.now });
    engine.start();
    c.advance(50);
    engine.selectCard('c_ok');
    c.advance(50);
    expect(engine.send().ok).toBe(true); // 1er paso
    expect(engine.eventCount('MESSAGE_SEND')).toBe(1);
    expect(engine.state).toBe(CONTROL_ROOM_STATES.RESPONSE); // en 'confirm'
    // Sin seleccionar en el paso 2: el gate de input bloquea (no hay 2º MESSAGE_SEND)
    expect(engine.send()).toEqual(expect.objectContaining({ ok: false, reason: 'no_selection' }));
    expect(engine.eventCount('MESSAGE_SEND')).toBe(1);
    engine.selectCard('c_done');
    c.advance(50);
    expect(engine.send().ok).toBe(true);
    expect(engine.eventCount('MESSAGE_SEND')).toBe(2); // uno por paso
  });

  it('compositor: bloques optimal → send ok; vacío → no_selection', () => {
    const c = fakeClock();
    const scenario = makeScenario({
      id: 'TEST-COMP',
      steps: [
        {
          nodeId: 'open',
          npc: { es: 'arma msg', en: 'build msg' },
          composer: true,
          blocks: [
            { id: 'b1', text: { es: 'Cierra', en: 'Close' } },
            { id: 'b2', text: { es: 'V3', en: 'V3' } },
          ],
          composerVerdicts: { optimal: ['b1', 'b2'], acceptable: [['b1', 'b2']] },
          next: { optimal: 'end', acceptable: 'end' },
        },
      ],
    });
    const engine = createControlRoomEngine({ scenario, now: c.now });
    engine.start();
    c.advance(50);
    expect(engine.send()).toEqual(expect.objectContaining({ ok: false, reason: 'no_selection' }));
    expect(engine.addBlock('b1')).toEqual(expect.objectContaining({ ok: true }));
    expect(engine.addBlock('b1')).toEqual(expect.objectContaining({ ok: false, reason: 'already_added' }));
    expect(engine.addBlock('b2')).toEqual(expect.objectContaining({ ok: true }));
    c.advance(50);
    expect(engine.send()).toEqual(expect.objectContaining({ ok: true, verdict: 'optimal' }));
    expect(engine.eventCount('BLOCK_ADDED')).toBe(2);
  });

  it('métricas §12.1: latencias, conteos por intent', () => {
    const c = fakeClock();
    const scenario = makeScenario({
      id: 'TEST-MET',
      steps: [
        {
          nodeId: 'open',
          npc: { es: 'h?', en: 'h?' },
          composer: false,
          cards: [{ id: 'c_ask', intent: 'ASK', text: { es: 'pregunta', en: 'question' } }],
          verdicts: { c_ask: 'optimal' },
          next: { optimal: 'data' },
        },
        {
          nodeId: 'data',
          npc: { es: 'dato', en: 'data' },
          composer: false,
          cards: [{ id: 'c_verify', intent: 'VERIFY', text: { es: 'confirma', en: 'confirm' } }],
          verdicts: { c_verify: 'optimal' },
          next: { optimal: 'end' },
        },
      ],
    });
    const engine = createControlRoomEngine({ scenario, now: c.now });
    engine.start();
    c.advance(1000);
    engine.selectCard('c_ask');
    c.advance(500);
    engine.send(); // ask
    engine.completeVerification(); // no es verify; sigue en response del paso 'data'
    expect(engine.state).toBe(CONTROL_ROOM_STATES.RESPONSE);
    c.advance(700);
    engine.selectCard('c_verify');
    c.advance(300);
    engine.send(); // verify → verification
    engine.completeVerification(); // → end
    const m = engine.metrics();
    expect(m.total_message_count).toBe(2);
    expect(m.question_count).toBe(1);
    expect(m.verification_count).toBe(1);
    expect(m.confirmation_requested).toBe(true);
    expect(m.confirmation_given).toBe(true);
    expect(m.first_decision_latency_ms).toBe(1500);
    expect(m.average_decision_latency_ms).toBeGreaterThan(0);
    expect(m.timeout_count).toBe(0);
  });

  it('dimensionScores: ratio éxito por dimensión (0-100, null si sin oportunidad)', () => {
    const c = fakeClock();
    const engine = createControlRoomEngine({ scenario: buildControlRoomLevelSpec('CR-L1-S01', 'A'), now: c.now });
    engine.start();
    c.advance(100);
    engine.selectCard('c1_instruct_close_verify');
    c.advance(100);
    engine.send(); // VERIFY → verification
    engine.completeVerification(); // → npc_confirm (reply)
    expect(engine.state).toBe(CONTROL_ROOM_STATES.RESPONSE);
    c.advance(100);
    engine.selectCard('c1_final_ok');
    c.advance(100);
    engine.send(); // INFORM acceptable → end
    const scores = engine.dimensionScores();
    // claridad (instrucción) + verification_closed_loop (verify)
    expect(scores.verification_closed_loop).toBe(100);
    expect(scores.clarity).toBe(100);
    expect(scores.inquiry).toBeNull(); // sin oportunidad
  });
});
