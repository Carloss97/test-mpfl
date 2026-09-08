// bombRules.js — EXP-BOMB-001 (Bomb Defusal) · B1: rule manifest versionado + secuencia efectiva.
//
// Fuente de verdad: docs/spec/EXP-BOMB-001/ (Draft v1.1.0, 07-sep-2026):
//   - Doc 1 §8 (motor de reglas), §9 (parámetros), §10 (progresión), §13 (taxonomía), §19 (esquema JSON)
//   - Doc 2 §9 (matriz de reglas A/B + copy exacto del manual), §10 (timing/penalizaciones)
//
// Regla dura (DoD Doc 1 §16.2): "La regla Tipo B se genera desde un manifiesto, no mediante
// condicionales duplicados en UI." Todo motor/validador/UI consume `BOMB_RULE_MANIFEST` y
// `transformSequence(...)`; NINGUN otro sitio codifica SW1→SW3 o RED→BLUE.
//
// Decisión B1 (divergencia menor entre docs, registrada): Doc 1 §10 lista el tutorial con
// secuencia A1+A2, pero Doc 2 §4.2 (T4) ejecuta explícitamente "SW1 → Rojo → Amarillo" (A1+A2+B1)
// como secuencia de práctica guiada. El manifest toma la secuencia de Doc 2 (el flujo real que
// implementa B4); el tutorial no puntúa (DoD), por lo que el impacto en métricas es nulo.

/** Identidad de experiencia y versiones (observabilidad, spec §15). */
export const BOMB_EXPERIENCE_ID = 'EXP-BOMB-001';
export const BOMB_BUILD_VERSION = '1.1.0';
export const BOMB_CONFIG_VERSION = 'bomb-v1.1';
export const BOMB_MANIFEST_VERSION = '1.1.0';

/**
 * Acciones físicas del panel (componentes).
 * Switches: SW_1..SW_3 (estados OFF/ON; se valida flanco OFF→ON, spec §8.3).
 * Cables: WIRE_RED / WIRE_BLUE / WIRE_GREEN / WIRE_YELLOW (corte irreversible en el nivel, spec §8.3).
 * Botón: BTN_YELLOW (hold objetivo 2000 ms ± 200, spec §8.3/§9).
 */
export const BOMB_COMPONENTS = Object.freeze({
  SWITCHES: Object.freeze(['SW_1', 'SW_2', 'SW_3']),
  WIRES: Object.freeze(['WIRE_RED', 'WIRE_BLUE', 'WIRE_GREEN', 'WIRE_YELLOW']),
  HOLD_BUTTON: 'BTN_YELLOW',
});

/** Taxonomía de errores (spec §13). `penalizes` controla conteo/penalización en el motor. */
export const BOMB_ERROR_CLASSES = Object.freeze({
  ORDER_ERROR: Object.freeze({
    code: 'ORDER_ERROR',
    meaning: 'Paso válido pero fuera de orden',
    penalizes: true,
  }),
  WRONG_TARGET: Object.freeze({
    code: 'WRONG_TARGET',
    meaning: 'Componente incorrecto',
    penalizes: true,
  }),
  TYPE_INTERFERENCE: Object.freeze({
    code: 'TYPE_INTERFERENCE',
    meaning: 'Persistencia de regla Tipo A en Tipo B (p.ej. cortó ROJO o usó SW1 en Modelo B)',
    penalizes: true,
  }),
  OMISSION: Object.freeze({
    code: 'OMISSION',
    meaning: 'Paso no ejecutado antes del timeout',
    penalizes: false, // se registra en el LEVEL_FAIL por timeout, no en el momento de una acción
  }),
  REPEAT_ACTION: Object.freeze({
    code: 'REPEAT_ACTION',
    meaning: 'Repite un componente ya resuelto/consumido',
    penalizes: true,
  }),
  HOLD_TOO_SHORT: Object.freeze({
    code: 'HOLD_TOO_SHORT',
    meaning: 'Hold por debajo del límite inferior de la ventana',
    penalizes: true,
  }),
  HOLD_TOO_LONG: Object.freeze({
    code: 'HOLD_TOO_LONG',
    meaning: 'Hold por encima del límite superior de la ventana',
    penalizes: true,
  }),
  INPUT_DURING_LOCK: Object.freeze({
    code: 'INPUT_DURING_LOCK',
    meaning: 'Acción sobre el panel en estado con inputs bloqueados (encoding/delay/resultados)',
    penalizes: false, // ignorada físicamente; no cuenta como error de secuencia (QA-08)
  }),
  MISCLICK_PROXIMAL: Object.freeze({
    code: 'MISCLICK_PROXIMAL',
    meaning: 'Click cercano sin cambio de estado físico (ruido motor)',
    penalizes: false, // "no siempre penalizar" (spec §13); lo reporta la UI, el motor solo registra
  }),
  TECHNICAL_ABORT: Object.freeze({
    code: 'TECHNICAL_ABORT',
    meaning: 'Interrupción técnica (FPS/blur/network); excluir o marcar para revisión',
    penalizes: false,
  }),
});

/** Resultado de clasificación de una acción (spec §8.2). */
export const BOMB_MATCH = Object.freeze({
  EXACT_MATCH: 'EXACT_MATCH',
  STEP_ERROR: 'STEP_ERROR',
});

/**
 * Rule manifest versionado (spec §9 + Doc 2 §9.2 copy exacto del manual).
 *
 * Cada regla define su acción física por tipo de bomba (`typeA` / `typeB`), su stepId canónico
 * por tipo (formato del esquema §19: SW_3_ON, CUT_BLUE, HOLD_YELLOW_2000, CUT_GREEN) y su línea
 * de manual en español. B1/C1 no cambian entre tipos (spec §8.1 "Sin cambio"); el campo `typeB`
 * existe igualmente para que el motor no contenga ramificación (DoD §16.2).
 */
export const BOMB_RULE_MANIFEST = Object.freeze({
  experienceId: BOMB_EXPERIENCE_ID,
  manifestVersion: BOMB_MANIFEST_VERSION,
  configVersion: BOMB_CONFIG_VERSION,
  buildVersion: BOMB_BUILD_VERSION,

  hold: Object.freeze({
    targetMs: 2000,
    toleranceMs: 200,
    window: Object.freeze([1800, 2400]),
  }),

  penalty: Object.freeze({
    /** Fracción del tiempo restante descontada por cada error (spec §9: 0.30, configurable 0-1). */
    errorTimePenaltyPct: 0.30,
    /** Penalización que deja <=0 ms => clamp a 0 y fail inmediato (Doc 2 §19). */
    clampToZero: true,
  }),

  /** Errores acumulados por nivel antes del fallo (spec §9: default 2). */
  maxErrors: 2,

  /** Fases del timer visual/lógico (Doc 2 §10: warning último 30 %, critical últimos 5 s). */
  timer: Object.freeze({
    warningRemainingPct: 0.30,
    criticalRemainingMs: 5000,
  }),

  /**
   * Secuencias base por nivel (spec §10 / Doc 2 §8). `exposureMs: null` = manual visible/libre
   * (sin límite de lectura); número = exposición máxima en ms (INSTRUCTIONS_HIDE por tiempo).
   * `timeLimitMs: null` = sin presión temporal (tutorial).
   */
  levels: Object.freeze({
    tutorial: Object.freeze({
      level: 0,
      bombType: 'A',
      sequenceIds: Object.freeze(['A1', 'A2', 'B1']),
      exposureMs: null,
      delayMs: 0,
      timeLimitMs: null,
      evaluated: false,
    }),
    1: Object.freeze({
      level: 1,
      bombType: 'A',
      sequenceIds: Object.freeze(['A1', 'A2']),
      exposureMs: null, // Doc 2 §8: manual "Visible" en L1
      delayMs: 0,
      timeLimitMs: 20000,
      evaluated: true,
    }),
    2: Object.freeze({
      level: 2,
      bombType: 'A',
      sequenceIds: Object.freeze(['A1', 'A2', 'B1']),
      exposureMs: 3000,
      delayMs: 2000,
      timeLimitMs: 15000,
      evaluated: true,
    }),
    3: Object.freeze({
      level: 3,
      bombType: 'A',
      sequenceIds: Object.freeze(['A1', 'A2', 'B1', 'C1']),
      exposureMs: 2000,
      delayMs: 4000,
      timeLimitMs: 12000,
      evaluated: true,
    }),
    4: Object.freeze({
      level: 4,
      bombType: 'B',
      sequenceIds: Object.freeze(['A1', 'A2', 'B1', 'C1']),
      exposureMs: 2000,
      delayMs: 3000,
      timeLimitMs: 10000,
      evaluated: true,
    }),
  }),

  /** Orden de evaluación (la progresión fija v1; spec §10.1: staircase solo en versiones futuras). */
  levelOrder: Object.freeze(['tutorial', 1, 2, 3, 4]),

  rules: Object.freeze({
    A1: Object.freeze({
      id: 'A1',
      stepIds: Object.freeze({ A: 'SW_1_ON', B: 'SW_3_ON' }),
      typeA: Object.freeze({ kind: 'SWITCH', id: 'SW_1', from: 'OFF', to: 'ON' }),
      typeB: Object.freeze({ kind: 'SWITCH', id: 'SW_3', from: 'OFF', to: 'ON' }),
      manualEs: Object.freeze({ A: 'Activa el INTERRUPTOR 1.', B: 'Activa el INTERRUPTOR 3.' }),
    }),
    A2: Object.freeze({
      id: 'A2',
      stepIds: Object.freeze({ A: 'CUT_RED', B: 'CUT_BLUE' }),
      typeA: Object.freeze({ kind: 'WIRE', id: 'WIRE_RED', op: 'CUT' }),
      typeB: Object.freeze({ kind: 'WIRE', id: 'WIRE_BLUE', op: 'CUT' }),
      /** En Modelo B, WIRE_RED queda explícitamente prohibido (spec §8.1). */
      forbiddenInB: Object.freeze([{ kind: 'WIRE', id: 'WIRE_RED', op: 'CUT' }]),
      manualEs: Object.freeze({ A: 'Corta el CABLE ROJO.', B: 'Corta el CABLE AZUL.' }),
    }),
    B1: Object.freeze({
      id: 'B1',
      stepIds: Object.freeze({ A: 'HOLD_YELLOW_2000', B: 'HOLD_YELLOW_2000' }),
      typeA: Object.freeze({ kind: 'BUTTON', id: 'BTN_YELLOW', op: 'HOLD', durationMs: 2000 }),
      typeB: Object.freeze({ kind: 'BUTTON', id: 'BTN_YELLOW', op: 'HOLD', durationMs: 2000 }),
      manualEs: Object.freeze({
        A: 'Mantén presionado el BOTÓN AMARILLO durante 2 segundos.',
        B: 'Mantén presionado el BOTÓN AMARILLO durante 2 segundos.',
      }),
    }),
    C1: Object.freeze({
      id: 'C1',
      stepIds: Object.freeze({ A: 'CUT_GREEN', B: 'CUT_GREEN' }),
      typeA: Object.freeze({ kind: 'WIRE', id: 'WIRE_GREEN', op: 'CUT' }),
      typeB: Object.freeze({ kind: 'WIRE', id: 'WIRE_GREEN', op: 'CUT' }),
      manualEs: Object.freeze({ A: 'Corta el CABLE VERDE.', B: 'Corta el CABLE VERDE.' }),
    }),
  }),

  /** Aviso MODEL B mostrado en encoding L4 (Doc 2 §9.2 "Modificador Tipo B"). */
  typeBNoticeEs:
    'ATENCIÓN - MODELO B: Donde el protocolo indique INTERRUPTOR 1, utiliza INTERRUPTOR 3. ' +
    'Donde indique CABLE ROJO, corta CABLE AZUL. Las demás instrucciones no cambian.',

  errorClasses: BOMB_ERROR_CLASSES,
});

function ruleActionFor(rule, bombType) {
  if (bombType !== 'A' && bombType !== 'B') {
    throw new Error(`bombType inválido: ${String(bombType)}`);
  }
  return bombType === 'B' ? rule.typeB : rule.typeA;
}

/**
 * Transformación de secuencia (spec §8.2): `effective_sequence = transform(base_sequence, bomb_type)`.
 * Pura y 100% derivada del manifest (DoD §16.2).
 *
 * @param {string[]} ruleIds IDs de reglas base en orden (p.ej. ['A1','A2','B1','C1']).
 * @param {'A'|'B'} bombType
 * @param {object} [manifest] por defecto BOMB_RULE_MANIFEST (inyectable para tests de futuras versiones).
 * @returns {Array<{stepId, ruleId, kind, id, op, durationMs?}>} pasos esperados en orden serial.
 */
export function transformSequence(ruleIds, bombType, manifest = BOMB_RULE_MANIFEST) {
  if (!Array.isArray(ruleIds) || ruleIds.length === 0) {
    throw new Error('transformSequence: ruleIds vacío o no es array');
  }
  return ruleIds.map((ruleId) => {
    const rule = manifest.rules[ruleId];
    if (!rule) {
      throw new Error(`transformSequence: regla desconocida "${ruleId}" (manifest v${manifest.manifestVersion})`);
    }
    const action = ruleActionFor(rule, bombType);
    return Object.freeze({
      stepId: rule.stepIds[bombType],
      ruleId,
      kind: action.kind,
      id: action.id,
      op: action.op ?? null,
      durationMs: action.durationMs ?? null,
      from: action.from ?? null,
      to: action.to ?? null,
    });
  });
}

/** Secuencia efectiva de un nivel según manifest (clave de nivel: 'tutorial'|1..4). */
export function effectiveSequenceForLevel(levelKey, manifest = BOMB_RULE_MANIFEST) {
  const levelDef = manifest.levels[levelKey];
  if (!levelDef) {
    throw new Error(`effectiveSequenceForLevel: nivel desconocido ${String(levelKey)}`);
  }
  return transformSequence(levelDef.sequenceIds, levelDef.bombType, manifest);
}

/**
 * Definición de nivel enriquecida (para el motor): secuencia efectiva precalculada desde manifest.
 * @returns {object}
 */
export function buildLevelSpec(levelKey, manifest = BOMB_RULE_MANIFEST) {
  const def = manifest.levels[levelKey];
  if (!def) throw new Error(`buildLevelSpec: nivel desconocido ${String(levelKey)}`);
  return Object.freeze({
    ...def,
    effectiveSequence: Object.freeze(transformSequence(def.sequenceIds, def.bombType, manifest)),
  });
}

/**
 * Texto del manual (encoding) para un nivel, construido SOLO desde el manifest.
 * Devuelve líneas numeradas (Doc 2 §9.2) + aviso MODEL B si aplica.
 *
 * @param {string[]} ruleIds
 * @param {'A'|'B'} bombType
 * @param {object} [manifest]
 * @returns {{lines: string[], notice: string|null}}
 */
export function buildManualText(ruleIds, bombType, manifest = BOMB_RULE_MANIFEST) {
  const lines = ruleIds.map((ruleId, i) => {
    const rule = manifest.rules[ruleId];
    if (!rule) throw new Error(`buildManualText: regla desconocida "${ruleId}"`);
    return `${i + 1}. ${rule.manualEs[bombType]}`;
  });
  return {
    lines,
    notice: bombType === 'B' ? manifest.typeBNoticeEs : null,
  };
}

function sameActionDescriptor(a, b) {
  return a.kind === b.kind && a.id === b.id && (a.op ?? null) === (b.op ?? null);
}

/**
 * Acciones EXCLUSIVAS del Tipo A derivadas del manifest (spec §13 TYPE_INTERFERENCE:
 * "En Tipo B corta rojo o usa SW1" — persistencia de la regla Tipo A).
 * Solo incluye reglas cuya acción cambia entre tipos (A1: SW_1 ON; A2: WIRE_RED CUT, reforzado
 * por `forbiddenInB`). B1/C1 no cambian de tipo, por lo que NO son interferencia.
 *
 * @returns {Array<{kind, id, op, to?}>}
 */
export function typeAOnlyActions(manifest = BOMB_RULE_MANIFEST) {
  const actions = [];
  const seen = new Set();
  const push = (a) => {
    const key = `${a.kind}|${a.id}|${a.op ?? ''}|${a.to ?? ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    actions.push({ kind: a.kind, id: a.id, op: a.op ?? null, to: a.to ?? null });
  };
  for (const rule of Object.values(manifest.rules)) {
    if (!sameActionDescriptor(rule.typeA, rule.typeB)) {
      push(rule.typeA);
    }
    if (Array.isArray(rule.forbiddenInB)) {
      for (const forbidden of rule.forbiddenInB) push(forbidden);
    }
  }
  return actions;
}
