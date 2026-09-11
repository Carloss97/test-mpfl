import { describe, it, expect } from 'vitest';
import {
  CONTROL_ROOM_SCENARIOS,
  CONTROL_ROOM_BLOCKS,
  CONTROL_ROOM_TIMEOUT_MS_BY_BLOCK,
  listEvaluatedScenarios,
  listPracticeScenarios,
  scenariosForBlock,
  getControlRoomScenario,
  selectControlRoomForm,
  buildControlRoomLevelSpec,
  deriveParallelForm,
  CONTROL_ROOM_EVALUATION_ORDER,
} from './controlRoomRules.js';

describe('controlRoomRules manifest (EXP-COMM-001 C1, control-room-v1.1)', () => {
  it('tiene 14 escenarios: 12 evaluados (6 bloques × 2) + 2 práctica', () => {
    expect(CONTROL_ROOM_SCENARIOS).toHaveLength(14);
    expect(listEvaluatedScenarios()).toHaveLength(12);
    expect(listPracticeScenarios()).toHaveLength(2);
  });

  it('cada bloque 1-6 tiene exactamente 2 escenarios evaluados (forma A + forma paralela B)', () => {
    for (const block of CONTROL_ROOM_BLOCKS) {
      const inBlock = scenariosForBlock(block);
      expect(inBlock).toHaveLength(2);
      const forms = inBlock.map((s) => s.form).sort();
      expect(forms).toEqual(['A', 'B']);
    }
  });

  it('timeout solo en bloque 6 (45s); bloques 1-5 y práctica null (§12.3)', () => {
    expect(CONTROL_ROOM_TIMEOUT_MS_BY_BLOCK).toEqual({ 1: null, 2: null, 3: null, 4: null, 5: null, 6: 45000 });
    for (const s of listEvaluatedScenarios()) {
      expect(s.timeoutMs).toBe(CONTROL_ROOM_TIMEOUT_MS_BY_BLOCK[s.block]);
    }
    for (const s of listPracticeScenarios()) {
      expect(s.timeoutMs).toBeNull();
    }
  });

  it('los 12 evaluados tienen facts con al menos un dato crítico y un receptor con rol', () => {
    for (const s of listEvaluatedScenarios()) {
      expect(s.facts.some((f) => f.critical)).toBe(true);
      expect(['operator', 'technician', 'supervisor', 'client']).toContain(s.receiver.role);
      expect(s.receiver.name.es).toBeTruthy();
      expect(s.receiver.name.en).toBeTruthy();
    }
  });

  it('cada step no-terminal tiene cards o composer, verdicts y next determinista', () => {
    for (const s of CONTROL_ROOM_SCENARIOS) {
      for (const step of s.steps) {
        if (step.terminal) continue;
        const hasContent = step.composer ? (step.blocks?.length > 0) : (step.cards?.length > 0);
        expect(hasContent, `${s.id}/${step.nodeId}: sin cartas ni bloques`).toBe(true);
        expect(step.npc.es).toBeTruthy();
        expect(step.npc.en).toBeTruthy();
        if (step.composer) {
          expect(step.composerVerdicts?.optimal?.length).toBeGreaterThan(0);
        } else {
          // cada carta tiene un veredicto
          for (const card of step.cards) {
            expect(step.verdicts[card.id]).toBeTruthy();
            expect(card.intent).toBeTruthy();
            expect(card.text.es).toBeTruthy();
            expect(card.text.en).toBeTruthy();
          }
        }
      }
    }
  });

  it('forma paralela B: misma estructura que A (steps, nodeIds, verdicts), superficie distinta', () => {
    for (const block of CONTROL_ROOM_BLOCKS) {
      const [a, b] = scenariosForBlock(block);
      expect(a.id).not.toEqual(b.id);
      // misma estructura de steps
      expect(b.steps.map((s) => s.nodeId)).toEqual(a.steps.map((s) => s.nodeId));
      for (const sa of a.steps) {
        if (sa.terminal) continue; // nodos terminales no tienen cartas/compositor
        const sb = b.steps.find((x) => x.nodeId === sa.nodeId);
        expect(sb).toBeTruthy();
        if (sa.composer) {
          expect(sb.composer).toBe(true);
          expect(sb.blocks.map((x) => x.id)).toEqual(sa.blocks.map((x) => x.id));
        } else {
          expect(sb.cards.map((c) => c.id)).toEqual(sa.cards.map((c) => c.id));
          expect(Object.keys(sb.verdicts).sort()).toEqual(Object.keys(sa.verdicts).sort());
        }
      }
      // misma cantidad de facts
      expect(b.facts).toHaveLength(a.facts.length);
      // superficie distinta: al menos un fact o el receptor difiere
      const aFacts = JSON.stringify(a.facts);
      const bFacts = JSON.stringify(b.facts);
      expect(aFacts).not.toEqual(bFacts);
    }
  });

  it('selectControlRoomForm es determinista y devuelve A o B', () => {
    const f1 = selectControlRoomForm('CR-L1-S01', 20260911);
    const f2 = selectControlRoomForm('CR-L1-S01', 20260911);
    expect(f1).toBe(f2);
    expect(['A', 'B']).toContain(f1);
    // distinto seed puede dar distinto form
    const seen = new Set();
    for (let seed = 1; seed <= 20; seed += 1) seen.add(selectControlRoomForm('CR-L3-S01', seed));
    expect(seen.size).toBeGreaterThan(1);
  });

  it('buildControlRoomLevelSpec resuelve forma + timeout; null si no existe', () => {
    const specA = buildControlRoomLevelSpec('CR-L1-S01', 'A');
    expect(specA.form).toBe('A');
    expect(specA.timeoutMs).toBeNull();
    const specB6 = buildControlRoomLevelSpec('CR-L6-S01', 'B');
    expect(specB6.form).toBe('B');
    expect(specB6.timeoutMs).toBe(45000);
    expect(buildControlRoomLevelSpec('NO-EXISTE', 'A')).toBeNull();
  });

  it('deriveParallelForm produce id con sufijo -B y remapea superficie', () => {
    const base = getControlRoomScenario('CR-L1-S01');
    const derived = deriveParallelForm(base);
    expect(derived.id).toBe('CR-L1-S01-B');
    expect(derived.form).toBe('B');
    // V3 → V5 en bloque 1
    expect(JSON.stringify(derived.facts)).toContain('V5');
  });

  it('CONTROL_ROOM_EVALUATION_ORDER: 12 ids en orden bloque 1→6, forma A antes que B', () => {
    expect(CONTROL_ROOM_EVALUATION_ORDER).toHaveLength(12);
    const byBlock = CONTROL_ROOM_EVALUATION_ORDER.map((id) => getControlRoomScenario(id).block);
    expect(byBlock).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6]);
    for (let i = 0; i < 12; i += 2) {
      expect(getControlRoomScenario(CONTROL_ROOM_EVALUATION_ORDER[i]).form).toBe('A');
      expect(getControlRoomScenario(CONTROL_ROOM_EVALUATION_ORDER[i + 1]).form).toBe('B');
    }
  });

  it('todos los ids son únicos', () => {
    const ids = CONTROL_ROOM_SCENARIOS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
