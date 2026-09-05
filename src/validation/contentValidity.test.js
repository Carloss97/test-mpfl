import { describe, it, expect } from 'vitest';
import { WORKBOOK_TALENT_CONSTRUCT_ORDER } from '../assessment/originalGameTalentMapping.js';
import {
  PROVISIONAL_MATRIX,
  contentValidityGate,
  validateMatrix,
  CONSTRUCT_AVAILABILITY,
  CONTENT_VALIDITY_SCHEMA,
} from './contentValidity.js';

const ALL_CONSTRUCTS = WORKBOOK_TALENT_CONSTRUCT_ORDER;

describe('KRUMM R-7B content validity — well-formedness', () => {
  it('matrix schema is stamped', () => {
    expect(CONTENT_VALIDITY_SCHEMA).toBe('krumm_r7b_content_validity_v1');
  });

  it('every row is well-formed (construct, scales, verdict, severity)', () => {
    const { valid, errors } = validateMatrix(PROVISIONAL_MATRIX);
    expect(errors).toEqual([]);
    expect(valid).toBe(true);
  });

  it('every framework construct has at least one feature row', () => {
    const covered = new Set(PROVISIONAL_MATRIX.map((r) => r.construct));
    for (const c of ALL_CONSTRUCTS) {
      expect(covered.has(c), `falta cobertura de constructo ${c}`).toBe(true);
    }
  });

  it('construct set matches the runtime availability map', () => {
    expect(Object.keys(CONSTRUCT_AVAILABILITY).sort()).toEqual([...ALL_CONSTRUCTS].sort());
  });
});

describe('KRUMM R-7B content validity — advance condition', () => {
  it('current provisional matrix passes the advance gate (no scored construct rejected)', () => {
    // Scored constructs (provisional_score) must NOT have "rechazar" in
    // relevance nor critical contamination.
    const gate = contentValidityGate(PROVISIONAL_MATRIX);
    expect(gate.scoredConstructs.sort()).toEqual(
      ['analyticalThinking', 'communication', 'leadership', 'planning', 'problemSolving', 'riskFeedbackProfile'],
    );
    expect(gate.blocked).toEqual([]);
    expect(gate.pass).toBe(true);
  });

  it('no scored construct hides a "rechazar" relevance or critical contamination', () => {
    const scored = new Set(
      Object.entries(CONSTRUCT_AVAILABILITY)
        .filter(([, a]) => a === 'provisional_score')
        .map(([c]) => c),
    );
    for (const r of PROVISIONAL_MATRIX) {
      if (!scored.has(r.construct)) continue;
      expect(r.veredicto, `${r.construct}/${r.feature} no puede ser rechazado`).not.toBe('rechazar');
      expect(r.relevancia, `${r.construct}/${r.feature} no puede tener relevancia 1`).not.toBe(1);
      expect(r.contaminacion, `${r.construct}/${r.feature} no puede tener contaminación crítica`).not.toBe('critica');
    }
  });

  it('descriptive/insufficient constructs are exempt from the scoring gate but still rated', () => {
    const exempt = ['adaptability', 'decisionMaking'];
    for (const c of exempt) {
      const rows = PROVISIONAL_MATRIX.filter((r) => r.construct === c);
      expect(rows.length).toBeGreaterThan(0);
      expect(CONSTRUCT_AVAILABILITY[c]).not.toBe('provisional_score');
    }
  });

  it('the gate is not vacuous: a rejected relevance blocks advance', () => {
    const badMatrix = PROVISIONAL_MATRIX.map((r) =>
      r.construct === 'planning' ? { ...r, veredicto: 'rechazar', relevancia: 1 } : r,
    );
    const gate = contentValidityGate(badMatrix);
    expect(gate.pass).toBe(false);
    expect(gate.blocked.some((b) => b.construct === 'planning')).toBe(true);
  });

  it('the gate is not vacuous: critical contamination blocks advance', () => {
    const badMatrix = PROVISIONAL_MATRIX.map((r) =>
      r.construct === 'problemSolving' ? { ...r, contaminacion: 'critica' } : r,
    );
    const gate = contentValidityGate(badMatrix);
    expect(gate.pass).toBe(false);
    expect(gate.blocked.some((b) => b.construct === 'problemSolving')).toBe(true);
  });
});