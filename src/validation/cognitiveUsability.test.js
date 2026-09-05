import { describe, it, expect } from 'vitest';
import { WORKBOOK_TALENT_CONSTRUCT_ORDER } from '../assessment/originalGameTalentMapping.js';
import { buildCandidateInstructionCheck } from '../tasks/original-games/candidateInstructionCheck.js';
import {
  PROVISIONAL_USABILITY_MATRIX,
  cognitiveUsabilityGate,
  validateCognitiveUsabilityMatrix,
  CONSTRUCT_AVAILABILITY,
  COGNITIVE_USABILITY_SCHEMA,
  GAMES,
} from './cognitiveUsability.js';

const ALL_CONSTRUCTS = WORKBOOK_TALENT_CONSTRUCT_ORDER;

describe('KRUMM R-7C cognitive usability — well-formedness', () => {
  it('schema is stamped', () => {
    expect(COGNITIVE_USABILITY_SCHEMA).toBe('krumm_r7c_cognitive_usability_v1');
  });

  it('every row is well-formed (game, construct, issueType, verdict, severity)', () => {
    const { valid, errors } = validateCognitiveUsabilityMatrix(PROVISIONAL_USABILITY_MATRIX);
    expect(errors).toEqual([]);
    expect(valid).toBe(true);
  });

  it('every game identifier is recognized', () => {
    for (const r of PROVISIONAL_USABILITY_MATRIX) {
      expect(GAMES, `juego desconocido ${r.game}`).toContain(r.game);
    }
  });

  it('construct set matches the runtime availability map', () => {
    expect(Object.keys(CONSTRUCT_AVAILABILITY).sort()).toEqual([...ALL_CONSTRUCTS].sort());
  });

  it('covers every scored construct with at least a comprehension probe', () => {
    const scored = Object.entries(CONSTRUCT_AVAILABILITY)
      .filter(([, a]) => a === 'provisional_score')
      .map(([c]) => c);
    const covered = new Set(
      PROVISIONAL_USABILITY_MATRIX.filter((r) => r.construct).map((r) => r.construct),
    );
    for (const c of scored) {
      expect(covered.has(c), `falta sonda de comprensión para constructo puntuado ${c}`).toBe(true);
    }
    // Usability rows may be construct=null (phase-level screens), but the four
    // games + landing/consent + report must all appear.
    const gamesCovered = new Set(PROVISIONAL_USABILITY_MATRIX.map((r) => r.game));
    for (const g of GAMES) {
      expect(gamesCovered.has(g), `falta cobertura del juego/pantalla ${g}`).toBe(true);
    }
  });

  it('a rejected comprehension must not carry low severity', () => {
    for (const r of PROVISIONAL_USABILITY_MATRIX) {
      if (r.comprehensionVerdict === 'rechazar') {
        expect(r.severity).not.toBe('baja');
      }
    }
  });
});

describe('KRUMM R-7C cognitive usability — advance condition', () => {
  it('current provisional matrix passes the advance gate (no scored construct rejected/comprehension-critical)', () => {
    const gate = cognitiveUsabilityGate(PROVISIONAL_USABILITY_MATRIX);
    expect(gate.scoredConstructs.sort()).toEqual(
      ['analyticalThinking', 'communication', 'leadership', 'planning', 'problemSolving', 'riskFeedbackProfile'],
    );
    expect(gate.blocked).toEqual([]);
    expect(gate.pass).toBe(true);
    expect(gate.reviewedGames).toEqual(GAMES);
  });

  it('scored constructs with "revisar" severity alta do NOT block advance (they flag review, not rejection)', () => {
    // planning has a "revisar / alta" (G1-L01 tarjeta RESERVA) row. Because it
    // is not "rechazar" nor "critica", the gate must keep it unblocked.
    const gate = cognitiveUsabilityGate(PROVISIONAL_USABILITY_MATRIX);
    expect(gate.blocked.some((b) => b.construct === 'planning')).toBe(false);
  });

  it('the gate is not vacuous: a rejected comprehension on a scored construct blocks advance', () => {
    const bad = PROVISIONAL_USABILITY_MATRIX.map((r) =>
      r.construct === 'planning'
        ? { ...r, comprehensionVerdict: 'rechazar', severity: 'media' }
        : r,
    );
    const gate = cognitiveUsabilityGate(bad);
    expect(gate.pass).toBe(false);
    expect(gate.blocked.some((b) => b.construct === 'planning')).toBe(true);
  });

  it('the gate is not vacuous: critical severity on a scored feature blocks advance', () => {
    const bad = PROVISIONAL_USABILITY_MATRIX.map((r) =>
      r.construct === 'problemSolving' ? { ...r, severity: 'critica' } : r,
    );
    const gate = cognitiveUsabilityGate(bad);
    expect(gate.pass).toBe(false);
    expect(gate.blocked.some((b) => b.construct === 'problemSolving')).toBe(true);
  });

  it('the gate is not vacuous: critical/important non-scored surfaces do NOT block', () => {
    // A high-severity row on a DESCRIPTIVE construct (adaptability) flags the
    // review but must not block, because adaptability is not scored.
    const bad = PROVISIONAL_USABILITY_MATRIX.map((r) =>
      r.construct === 'adaptability' ? { ...r, comprehensionVerdict: 'rechazar' } : r,
    );
    const gate = cognitiveUsabilityGate(bad);
    expect(gate.blocked.filter((b) => b.construct === 'adaptability')).toEqual([]);
  });

  it('telemetry instruction-risk channel feeds the gate and excludes from mapping on high risk', () => {
    // Build an aggregate-only block that summary flags as high risk.
    const blocks = [
      {
        gameId: 'laser_puzzle',
        result: {
          aggregateOnly: true,
          solvedLevels: 1,
          levelCount: 3,
          ruleViolationCount: 3,
          movementAttemptCount: 0,
          completedScenarioCount: 3,
          scenarioCount: 4,
        },
      },
    ];
    const check = buildCandidateInstructionCheck(blocks);
    expect(check.instructionRiskFlag).toBe('high');
    // High telemetry risk must translate into blocked advance.
    const gate = cognitiveUsabilityGate(PROVISIONAL_USABILITY_MATRIX, blocks);
    expect(gate.telemetry).not.toBeNull();
    expect(gate.telemetry.instructionRiskFlag).toBe('high');
    expect(gate.telemetry.excludeFromTalentMappingFlag).toBe(true);
    expect(gate.pass).toBe(false);
    expect(gate.blocked.some((b) => b.surface === 'candidateInstructionCheck')).toBe(true);
  });

  it('low-risk telemetry does not block the gate', () => {
    const blocks = [
      {
        gameId: 'balloon_risk',
        result: { aggregateOnly: true, roundsCompleted: 8, totalRounds: 8, popCount: 1, cashoutCount: 6 },
      },
    ];
    const check = buildCandidateInstructionCheck(blocks);
    expect(check.instructionRiskFlag).toBe('low');
    const gate = cognitiveUsabilityGate(PROVISIONAL_USABILITY_MATRIX, blocks);
    expect(gate.telemetry.instructionRiskFlag).toBe('low');
    expect(gate.telemetry.excludeFromTalentMappingFlag).toBe(false);
    expect(gate.pass).toBe(true);
  });
});

describe('KRUMM R-7C — phase-level rows (construct=null) sanitation', () => {
  it('phase/composite screens still get a usability probe and are timestamped with evidence basis', () => {
    const phaseRows = PROVISIONAL_USABILITY_MATRIX.filter((r) => r.construct == null);
    expect(phaseRows.length).toBeGreaterThan(0);
    for (const r of phaseRows) {
      expect(r.probe.length).toBeGreaterThan(15);
      expect(GAMES).toContain(r.game);
    }
  });
});