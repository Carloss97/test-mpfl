import { describe, it, expect } from 'vitest';
import {
  BOMB_EXPERIENCE_ID,
  BOMB_BUILD_VERSION,
  BOMB_CONFIG_VERSION,
  BOMB_MANIFEST_VERSION,
  BOMB_RULE_MANIFEST,
  transformSequence,
  effectiveSequenceForLevel,
  buildLevelSpec,
  buildManualText,
  newRuleForLevel,
  typeAOnlyActions,
  tutorialNodeFor,
  tutorialNodeIdsDone,
} from './bombRules.js';

// B1 EXP-7 BOMB — tests del rule manifest versionado (spec Doc 1 §8/§9/§10/§19,
// Doc 2 §9). La spec es ley: docs/spec/EXP-BOMB-001/.

describe('bombRules — identidad del manifest', () => {
  it('versiona experiencia, build y config (observabilidad spec §15)', () => {
    expect(BOMB_EXPERIENCE_ID).toBe('EXP-BOMB-001');
    expect(BOMB_BUILD_VERSION).toBe('1.1.0');
    expect(BOMB_CONFIG_VERSION).toBe('bomb-v1.1');
    expect(BOMB_MANIFEST_VERSION).toBe('1.1.0');
    expect(BOMB_RULE_MANIFEST.experienceId).toBe('EXP-BOMB-001');
    expect(BOMB_RULE_MANIFEST.configVersion).toBe('bomb-v1.1');
    expect(BOMB_RULE_MANIFEST.manifestVersion).toBe('1.1.0');
    expect(BOMB_RULE_MANIFEST.buildVersion).toBe('1.1.0');
  });

  it('declara las reglas canónicas A1/A2/B1/C1 con acción por tipo (spec §8.1)', () => {
    const rules = BOMB_RULE_MANIFEST.rules;
    expect(Object.keys(rules).sort()).toEqual(['A1', 'A2', 'B1', 'C1']);
    // A1: SW_1→ON (B: SW_3→ON)
    expect(rules.A1.typeA).toMatchObject({ kind: 'SWITCH', id: 'SW_1', to: 'ON' });
    expect(rules.A1.typeB).toMatchObject({ kind: 'SWITCH', id: 'SW_3', to: 'ON' });
    // A2: CUT RED (B: CUT BLUE, RED prohibido)
    expect(rules.A2.typeA).toMatchObject({ kind: 'WIRE', id: 'WIRE_RED', op: 'CUT' });
    expect(rules.A2.typeB).toMatchObject({ kind: 'WIRE', id: 'WIRE_BLUE', op: 'CUT' });
    expect(rules.A2.forbiddenInB).toContainEqual(
      expect.objectContaining({ kind: 'WIRE', id: 'WIRE_RED', op: 'CUT' }),
    );
    // B1: HOLD BTN_YELLOW 2000 ms (sin cambio en B)
    expect(rules.B1.typeA).toMatchObject({ kind: 'BUTTON', id: 'BTN_YELLOW', op: 'HOLD', durationMs: 2000 });
    expect(rules.B1.typeB).toMatchObject({ kind: 'BUTTON', id: 'BTN_YELLOW', op: 'HOLD', durationMs: 2000 });
    // C1: CUT GREEN (sin cambio en B)
    expect(rules.C1.typeA).toMatchObject({ kind: 'WIRE', id: 'WIRE_GREEN', op: 'CUT' });
    expect(rules.C1.typeB).toMatchObject({ kind: 'WIRE', id: 'WIRE_GREEN', op: 'CUT' });
  });

  it('fija tolerancias hold 2000 ms ±200 (ventana 1800-2400, spec §8.3/§9)', () => {
    const hold = BOMB_RULE_MANIFEST.hold;
    expect(hold.targetMs).toBe(2000);
    expect(hold.toleranceMs).toBe(200);
    expect(hold.window).toEqual([1800, 2400]);
  });

  it('fija penalización 30% del tiempo restante y max_errors 2 (baseline v1.1)', () => {
    expect(BOMB_RULE_MANIFEST.penalty.errorTimePenaltyPct).toBe(0.3);
    expect(BOMB_RULE_MANIFEST.penalty.clampToZero).toBe(true);
    expect(BOMB_RULE_MANIFEST.maxErrors).toBe(2);
  });

  it('fija fases del timer: warning último 30%, critical últimos 5 s (Doc 2 §10)', () => {
    expect(BOMB_RULE_MANIFEST.timer.warningRemainingPct).toBe(0.3);
    expect(BOMB_RULE_MANIFEST.timer.criticalRemainingMs).toBe(5000);
  });

  it('progresión de dificultad: tiempos 20/15/12/10 s y delays 0/2/4/3 s (spec §10)', () => {
    const levels = BOMB_RULE_MANIFEST.levels;
    expect(levels[1].timeLimitMs).toBe(20000);
    expect(levels[2].timeLimitMs).toBe(15000);
    expect(levels[3].timeLimitMs).toBe(12000);
    expect(levels[4].timeLimitMs).toBe(10000);
    expect(levels[1].delayMs).toBe(0);
    expect(levels[2].delayMs).toBe(2000);
    expect(levels[3].delayMs).toBe(4000);
    expect(levels[4].delayMs).toBe(3000);
    // L4 es el único Modelo B (spec §9: "A salvo L4")
    expect(levels[1].bombType).toBe('A');
    expect(levels[2].bombType).toBe('A');
    expect(levels[3].bombType).toBe('A');
    expect(levels[4].bombType).toBe('B');
    // Tutorial sin presión temporal
    expect(levels.tutorial.timeLimitMs).toBeNull();
  });
});

describe('bombRules — secuencias efectivas L1-L4 (aceptación B1)', () => {
  const stepIds = (steps) => steps.map((s) => s.stepId);

  it('L1 (A): SW1 ON → CUT RED', () => {
    expect(stepIds(effectiveSequenceForLevel(1))).toEqual(['SW_1_ON', 'CUT_RED']);
  });

  it('L2 (A): SW1 ON → CUT RED → HOLD YELLOW 2s', () => {
    expect(stepIds(effectiveSequenceForLevel(2))).toEqual([
      'SW_1_ON', 'CUT_RED', 'HOLD_YELLOW_2000',
    ]);
  });

  it('L3 (A): SW1 ON → CUT RED → HOLD YELLOW 2s → CUT GREEN', () => {
    expect(stepIds(effectiveSequenceForLevel(3))).toEqual([
      'SW_1_ON', 'CUT_RED', 'HOLD_YELLOW_2000', 'CUT_GREEN',
    ]);
  });

  it('L4 (B): SW3 ON → CUT BLUE → HOLD YELLOW 2s → CUT GREEN (esquema §19)', () => {
    const seq = effectiveSequenceForLevel(4);
    expect(stepIds(seq)).toEqual([
      'SW_3_ON', 'CUT_BLUE', 'HOLD_YELLOW_2000', 'CUT_GREEN',
    ]);
    // Componentes físicos coherentes con el tipo B
    expect(seq[0]).toMatchObject({ kind: 'SWITCH', id: 'SW_3', to: 'ON' });
    expect(seq[1]).toMatchObject({ kind: 'WIRE', id: 'WIRE_BLUE', op: 'CUT' });
    expect(seq[2]).toMatchObject({ kind: 'BUTTON', id: 'BTN_YELLOW', op: 'HOLD', durationMs: 2000 });
    expect(seq[3]).toMatchObject({ kind: 'WIRE', id: 'WIRE_GREEN', op: 'CUT' });
  });

  it('tutorial (A): SW1 ON → CUT RED → HOLD YELLOW 2s (práctica guiada, Doc 2 §4.2 T4)', () => {
    expect(stepIds(effectiveSequenceForLevel('tutorial'))).toEqual([
      'SW_1_ON', 'CUT_RED', 'HOLD_YELLOW_2000',
    ]);
  });
});

describe('bombRules — transformación B DESDE el manifest (DoD §16.2)', () => {
  it('transformSequence aplica solo los descriptors typeA/typeB del manifest (sin condicionales)', () => {
    const base = ['A1', 'A2', 'B1', 'C1'];
    const a = transformSequence(base, 'A');
    const b = transformSequence(base, 'B');
    // Reglas sin cambio (B1, C1) idénticas en ambos tipos
    expect(b[2]).toMatchObject({ stepId: 'HOLD_YELLOW_2000', id: 'BTN_YELLOW', op: 'HOLD' });
    expect(b[3]).toMatchObject({ stepId: 'CUT_GREEN', id: 'WIRE_GREEN', op: 'CUT' });
    // Reglas transformadas (A1, A2) distintas
    expect(a[0]).toMatchObject({ stepId: 'SW_1_ON', id: 'SW_1' });
    expect(b[0]).toMatchObject({ stepId: 'SW_3_ON', id: 'SW_3' });
    expect(a[1]).toMatchObject({ stepId: 'CUT_RED', id: 'WIRE_RED' });
    expect(b[1]).toMatchObject({ stepId: 'CUT_BLUE', id: 'WIRE_BLUE' });
    // La secuencia L4 se obtiene 100% de datos del manifest
    expect(b).toEqual(effectiveSequenceForLevel(4));
  });

  it('transformSequence rechaza reglas desconocidas (fallo temprano, no silencio)', () => {
    expect(() => transformSequence(['A1', 'Z9'], 'A')).toThrow(/regla desconocida/);
    expect(() => transformSequence([], 'A')).toThrow(/ruleIds vacío/);
  });

  it('transformSequence rechaza bombType inválido', () => {
    expect(() => transformSequence(['A1'], 'C')).toThrow(/bombType inválido/);
  });

  it('buildLevelSpec enriquece el nivel con la secuencia efectiva precalculada', () => {
    const spec = buildLevelSpec(4);
    expect(spec.bombType).toBe('B');
    expect(spec.sequenceIds).toEqual(['A1', 'A2', 'B1', 'C1']);
    expect(spec.effectiveSequence.map((s) => s.stepId)).toEqual([
      'SW_3_ON', 'CUT_BLUE', 'HOLD_YELLOW_2000', 'CUT_GREEN',
    ]);
  });

  it('typeAOnlyActions deriva solo acciones exclusivas Tipo A (SW_1 ON, WIRE_RED CUT)', () => {
    const actions = typeAOnlyActions();
    expect(actions).toContainEqual({ kind: 'SWITCH', id: 'SW_1', op: null, to: 'ON' });
    expect(actions).toContainEqual({ kind: 'WIRE', id: 'WIRE_RED', op: 'CUT', to: null });
    // B1/C1 no cambian de tipo => no son interferencia
    expect(actions.find((a) => a.id === 'BTN_YELLOW')).toBeUndefined();
    expect(actions.find((a) => a.id === 'WIRE_GREEN')).toBeUndefined();
  });
});

describe('bombRules — copy del manual desde el manifest (Doc 2 §9.2)', () => {
  it('L1 Tipo A: dos líneas numeradas con los nombres exactos de la UI', () => {
    const manual = buildManualText(['A1', 'A2'], 'A');
    expect(manual.lines).toEqual([
      '1. Activa el INTERRUPTOR 1.',
      '2. Corta el CABLE ROJO.',
    ]);
    expect(manual.notice).toBeNull();
  });

  it('L4 Tipo B: líneas transformadas + aviso MODEL B (Doc 2 §9.2 "Modificador Tipo B")', () => {
    const manual = buildManualText(['A1', 'A2', 'B1', 'C1'], 'B');
    expect(manual.lines).toEqual([
      '1. Activa el INTERRUPTOR 3.',
      '2. Corta el CABLE AZUL.',
      '3. Mantén presionado el BOTÓN AMARILLO durante 2 segundos.',
      '4. Corta el CABLE VERDE.',
    ]);
    expect(manual.notice).toMatch(/ATENCIÓN - MODELO B/);
    expect(manual.notice).toMatch(/INTERRUPTOR 1.*INTERRUPTOR 3/s);
    expect(manual.notice).toMatch(/CABLE ROJO.*CABLE AZUL/s);
  });
});

describe('bombRules — copy exacto de fases B3 (Doc 2 §11 "UX copy completo")', () => {
  it('transiciones "Antes de L1..L4" con el copy exacto de la spec', () => {
    expect(BOMB_RULE_MANIFEST.intro.transitionEs[1]).toBe('Primero aprenderás el protocolo base del MODELO A.');
    expect(BOMB_RULE_MANIFEST.intro.transitionEs[2]).toBe('Se añadirá una nueva instrucción. Las reglas anteriores siguen vigentes.');
    expect(BOMB_RULE_MANIFEST.intro.transitionEs[3]).toBe('La secuencia será más larga y tendrás menos tiempo para recordarla.');
    expect(BOMB_RULE_MANIFEST.intro.transitionEs[4]).toBe(
      'ATENCIÓN: este artefacto es MODELO B. Algunas instrucciones cambian. Revisa el protocolo antes de continuar.',
    );
  });

  it('copy de delay/penalty/success/fail/final con el texto exacto de la spec', () => {
    expect(BOMB_RULE_MANIFEST.intro.delayEs).toBe('Memoriza la secuencia.');
    expect(BOMB_RULE_MANIFEST.intro.penaltyEs).toBe('Secuencia incorrecta. Tiempo penalizado.');
    expect(BOMB_RULE_MANIFEST.intro.successEs).toBe('Artefacto neutralizado.');
    expect(BOMB_RULE_MANIFEST.intro.failTimeoutEs).toBe('Tiempo agotado. Nivel finalizado.');
    expect(BOMB_RULE_MANIFEST.intro.failErrorsEs).toBe('Se alcanzó el límite de errores. Nivel finalizado.');
    expect(BOMB_RULE_MANIFEST.intro.sessionCompleteEs).toBe('Simulación finalizada. Tus resultados fueron procesados.');
  });

  it('el copy de fail/penalty no revela la respuesta correcta (Doc 2 §13.1/§5 "razón general")', () => {
    for (const text of [
      BOMB_RULE_MANIFEST.intro.failTimeoutEs,
      BOMB_RULE_MANIFEST.intro.failErrorsEs,
      BOMB_RULE_MANIFEST.intro.penaltyEs,
    ]) {
      expect(text).not.toMatch(/INTERRUPTOR|CABLE|AZUL|ROJO|VERDE|AMARILLO/i);
    }
  });
});

describe('bombRules — regla nueva por nivel (B3: "regla nueva destacada" en la intro, Doc 2 §5)', () => {
  it('L1 (primer evaluado) → null (protocolo base, no hay regla nueva)', () => {
    expect(newRuleForLevel(1)).toBeNull();
  });

  it('L2 → B1 (hold del botón amarillo)', () => {
    expect(newRuleForLevel(2)).toBe('B1');
  });

  it('L3 → C1 (cable verde)', () => {
    expect(newRuleForLevel(3)).toBe('C1');
  });

  it('L4 → null (misma base que L3; el cambio es el tipo de bomba → modificador B)', () => {
    expect(newRuleForLevel(4)).toBeNull();
  });

  it('tutorial / claves desconocidas → null', () => {
    expect(newRuleForLevel('tutorial')).toBeNull();
    expect(newRuleForLevel(99)).toBeNull();
  });
});

describe('bombRules — taxonomía de errores (spec §13)', () => {
  it('declara los 10 códigos con semántica y flag de penalización', () => {
    const codes = Object.keys(BOMB_RULE_MANIFEST.errorClasses).sort();
    expect(codes).toEqual([
      'HOLD_TOO_LONG',
      'HOLD_TOO_SHORT',
      'INPUT_DURING_LOCK',
      'MISCLICK_PROXIMAL',
      'OMISSION',
      'ORDER_ERROR',
      'REPEAT_ACTION',
      'TECHNICAL_ABORT',
      'TYPE_INTERFERENCE',
      'WRONG_TARGET',
    ]);
    // Los que penalizan: los de secuencia/hold (spec §8.2 los descuenta del tiempo)
    for (const code of ['ORDER_ERROR', 'WRONG_TARGET', 'TYPE_INTERFERENCE', 'REPEAT_ACTION', 'HOLD_TOO_SHORT', 'HOLD_TOO_LONG']) {
      expect(BOMB_RULE_MANIFEST.errorClasses[code].penalizes).toBe(true);
    }
    // Los que NO penalizan: lock, misclick, omisión (se marca en timeout), abort técnico
    for (const code of ['INPUT_DURING_LOCK', 'MISCLICK_PROXIMAL', 'OMISSION', 'TECHNICAL_ABORT']) {
      expect(BOMB_RULE_MANIFEST.errorClasses[code].penalizes).toBe(false);
    }
  });
});

// ============================================================================
// B4 (card t_b3f1dc15): tutorial T1-T5 + welcome (Doc 2 §4.1/§4.2/§4.3/§18)
// ============================================================================

describe('bombRules — B4: pantalla de bienvenida §4.1 (copy exacto, ES fuente de verdad)', () => {
  it('título, bajada, mensaje, CTA y secundario — texto exacto de Doc 2 §4.1', () => {
    const w = BOMB_RULE_MANIFEST.tutorial.welcome;
    expect(w.titleEs).toBe('Simulación de Protocolo Operativo: Desactivación');
    expect(w.subEs).toBe('Memoriza el protocolo y ejecuta cada paso en el orden indicado.');
    expect(w.messageEs).toBe(
      'Las instrucciones pueden desaparecer antes de que puedas interactuar con el panel. '
      + 'Revisa con atención el tipo de artefacto y el tiempo disponible.',
    );
    expect(w.ctaEs).toBe('Iniciar práctica');
    expect(w.secondaryEs).toBe('Ajustes de audio / accesibilidad');
  });

  it('tono §11.1: sin lenguaje alarmista realista en bienvenida/mensaje', () => {
    const w = BOMB_RULE_MANIFEST.tutorial.welcome;
    for (const text of [w.titleEs, w.subEs, w.messageEs]) {
      expect(text).not.toMatch(/vas a (morir|explotar)|explosión real|muerte/i);
    }
  });
});

describe('bombRules — B4: tutorial guiado §4.2 (nodos T1-T5, copy exacto + criterios)', () => {
  it('cinco nodos T1-T5 con el overlay exacto de Doc 2 §4.2', () => {
    const nodes = BOMB_RULE_MANIFEST.tutorial.segments.flatMap((s) => s.nodes);
    expect(nodes.map((n) => n.id)).toEqual(['T1', 'T2', 'T3', 'T4', 'T5']);
    expect(nodes[0].overlayEs).toBe('Activa el Interruptor 1.');
    expect(nodes[1].overlayEs).toBe('Corta el cable rojo.');
    expect(nodes[2].overlayEs).toBe('Mantén presionado el botón amarillo durante 2 segundos.');
    expect(nodes[3].overlayEs).toBe('Ahora ejecuta: SW1 → Rojo → Amarillo.');
    expect(nodes[4].overlayEs).toBe('Lee la secuencia. La pantalla se ocultará brevemente.');
  });

  it('tres segmentos: guided (T1-T3) / sequence (T4) / memory (T5) — el motor no codifica nodos', () => {
    const segs = BOMB_RULE_MANIFEST.tutorial.segments;
    expect(segs.map((s) => s.mode)).toEqual(['guided', 'sequence', 'memory']);
    expect(segs.map((s) => s.nodes.map((n) => n.id))).toEqual([
      ['T1', 'T2', 'T3'],
      ['T4'],
      ['T5'],
    ]);
    // T5: lectura fija + ocultación "breve" (Doc 2 §4.2) — menor que el delay de L2 (2 s)
    const memory = segs[2];
    expect(memory.readMs).toBeGreaterThan(1500);
    expect(memory.delayMs).toBeGreaterThan(0);
    expect(memory.delayMs).toBeLessThan(BOMB_RULE_MANIFEST.levels[2].delayMs);
  });

  it('tutorialNodeFor: nodo activo por (segmento, paso) — guided uno por paso, los demás el único', () => {
    expect(tutorialNodeFor(1, 0).id).toBe('T1');
    expect(tutorialNodeFor(1, 1).id).toBe('T2');
    expect(tutorialNodeFor(1, 2).id).toBe('T3');
    expect(tutorialNodeFor(2, 0).id).toBe('T4');
    expect(tutorialNodeFor(2, 2).id).toBe('T4');
    expect(tutorialNodeFor(3, 0).id).toBe('T5');
    expect(tutorialNodeFor(0, 0)).toBeNull();
    expect(tutorialNodeFor(9, 0)).toBeNull();
  });

  it('tutorialNodeIdsDone: nodos completados por (segmento, paso)', () => {
    expect(tutorialNodeIdsDone(1, 0)).toEqual([]);
    expect(tutorialNodeIdsDone(1, 2)).toEqual(['T1', 'T2']);
    expect(tutorialNodeIdsDone(2, 0)).toEqual(['T1', 'T2', 'T3']);
    expect(tutorialNodeIdsDone(3, 0)).toEqual(['T1', 'T2', 'T3', 'T4']);
    // segmento fuera de rango → todos completados (clamp)
    expect(tutorialNodeIdsDone(9, 0)).toEqual(['T1', 'T2', 'T3', 'T4', 'T5']);
  });
});

describe('bombRules — B4: salida del tutorial §4.3 (copy exacto) + replay §18', () => {
  it('modal §4.3 exacto + botón "Comenzar evaluación" + copy de replay', () => {
    const d = BOMB_RULE_MANIFEST.tutorial.done;
    expect(d.modalEs).toBe(
      'Práctica completada. Desde el siguiente nivel, tus tiempos y decisiones serán registrados. '
      + 'Las instrucciones pueden cambiar según el tipo de artefacto.',
    );
    expect(d.ctaEs).toBe('Comenzar evaluación');
    expect(d.replayEs).toBe('Repetir práctica');
  });
});
