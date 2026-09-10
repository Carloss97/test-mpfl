// B3 (KRU-50): tests del módulo puro de brief + exports.
// Enfoque: R-6 (score null = sin señal, nunca 0; descriptivo; watermark en
// cada export) + determinismo (generatedAt inyectado) + privacy (los exports
// solo llevan agregados del report model).
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  BRIEF_DISCLAIMER,
  BRIEF_FLAGS,
  buildBriefMarkdown,
  buildInterviewBrief,
  buildProcessCsv,
  downloadText,
  pickLocalized,
} from './companyBrief.js';

// Report model mínimo (shape de buildRealReportModel).
function makeModel(overrides = {}) {
  return {
    kind: 'real',
    id: 's-1',
    alias: 'Candido Vega',
    status: 'ready',
    completedAt: '2026-09-01',
    coverage: { completed: 6, total: 6 },
    sessionQuality: 0.8,
    constructs: [
      { id: 'decisionMaking', label: 'Toma de decisiones', labelEn: 'Decision making', score: 72, availability: 'provisional_score' },
      { id: 'planning', label: 'Planificación', labelEn: 'Planning', score: null, availability: 'insufficient' },
    ],
    caveats: [
      { es: 'Muestras insuficientes en la sesión.', en: 'Insufficient samples in the session.' },
    ],
    overall: 72,
    fit: 'good',
    ...overrides,
  };
}

describe('pickLocalized', () => {
  it('resuelve ES/EN con fallback cruzado', () => {
    expect(pickLocalized({ es: 'Hola', en: 'Hi' }, 'es')).toBe('Hola');
    expect(pickLocalized({ es: 'Hola', en: 'Hi' }, 'en')).toBe('Hi');
    expect(pickLocalized({ es: 'SoloES' }, 'en')).toBe('SoloES');
    expect(pickLocalized('texto', 'es')).toBe('texto');
  });
});

describe('buildInterviewBrief', () => {
  it('prompt de apertura siempre presente', () => {
    const { prompts } = buildInterviewBrief(makeModel());
    expect(prompts[0].id).toBe('opening');
    expect(prompts[0].es).toBeTruthy();
    expect(prompts[0].en).toBeTruthy();
  });

  it('un prompt por constructo CON score (label + score descriptivo)', () => {
    const { prompts } = buildInterviewBrief(makeModel());
    const dm = prompts.find((p) => p.id === 'construct-decisionMaking');
    expect(dm).toBeTruthy();
    expect(dm.es).toContain('Toma de decisiones');
    expect(dm.es).toContain('72/100');
    expect(dm.en).toContain('Decision making');
  });

  it('constructo sin score (null) → nota "sin señal", NO prompt de score y NUNCA 0', () => {
    const { prompts, notes } = buildInterviewBrief(makeModel());
    expect(prompts.find((p) => p.id === 'construct-planning')).toBeUndefined();
    const noSignal = notes.find((n) => n.id === 'no-signal-planning');
    expect(noSignal).toBeTruthy();
    expect(noSignal.es).toContain('sin señal');
    expect(noSignal.es).not.toContain('0/100');
  });

  it('overall null → nota "sin puntaje global"', () => {
    const { notes } = buildInterviewBrief(makeModel({ overall: null }));
    expect(notes.find((n) => n.id === 'no-overall')).toBeTruthy();
  });

  it('caveats → nota única con todas localizadas', () => {
    const { notes } = buildInterviewBrief(makeModel());
    const caveatsNote = notes.find((n) => n.id === 'caveats');
    expect(caveatsNote.es).toContain('Muestras insuficientes en la sesión.');
    expect(caveatsNote.en).toContain('Insufficient samples in the session.');
  });

  it('cobertura parcial → nota de contexto (no abandono como señal)', () => {
    const { notes } = buildInterviewBrief(makeModel({ coverage: { completed: 4, total: 6 } }));
    const cov = notes.find((n) => n.id === 'coverage');
    expect(cov.es).toContain('4/6');
    expect(cov.es).toContain('no asumar abandono');
  });

  it('cobertura completa → sin nota de coverage', () => {
    const { notes } = buildInterviewBrief(makeModel());
    expect(notes.find((n) => n.id === 'coverage')).toBeUndefined();
  });

  it('model nulo/inválido → listas vacías (defensivo)', () => {
    expect(buildInterviewBrief(null)).toEqual({ prompts: [], notes: [] });
    expect(buildInterviewBrief(undefined)).toEqual({ prompts: [], notes: [] });
  });
});

describe('buildBriefMarkdown', () => {
  const process = { id: 'analista', role: { es: 'Analista de Control', en: 'Control Analyst' } };

  it('título + metadata + watermark + disclaimer (ES)', () => {
    const md = buildBriefMarkdown({
      process, candidates: [makeModel()], language: 'es', generatedAt: '2026-09-10',
    });
    expect(md).toContain('# Brief de entrevista — Analista de Control');
    expect(md).toContain('**Proceso:** analista');
    expect(md).toContain('**Generado:** 2026-09-10');
    expect(md).toContain(`\`${BRIEF_FLAGS.es}\``);
    expect(md).toContain(BRIEF_DISCLAIMER.es);
  });

  it('sección por candidato: overall descriptivo + tabla de constructos (null = —, nunca 0)', () => {
    const md = buildBriefMarkdown({
      process, candidates: [makeModel()], language: 'es', generatedAt: '2026-09-10',
    });
    expect(md).toContain('## Candido Vega · ready');
    expect(md).toContain('**Puntaje global (descriptivo):** 72/100');
    expect(md).toContain('| Toma de decisiones | 72 | provisional_score |');
    expect(md).toContain('| Planificación | — | insufficient |');
  });

  it('overall null → "sin señal" en cursiva (no 0)', () => {
    const md = buildBriefMarkdown({
      process, candidates: [makeModel({ overall: null })], language: 'es', generatedAt: '2026-09-10',
    });
    expect(md).toContain('*sin señal*');
    expect(md).not.toContain('0/100');
  });

  it('prompts y notas presentes; prompts numerados', () => {
    const md = buildBriefMarkdown({
      process, candidates: [makeModel()], language: 'es', generatedAt: '2026-09-10',
    });
    expect(md).toContain('### Prompts sugeridos');
    expect(md).toMatch(/1\. /);
    expect(md).toContain('### Notas');
    expect(md).toContain('- Planificación: sin señal en esta batería');
  });

  it('variante EN con labels EN', () => {
    const md = buildBriefMarkdown({
      process, candidates: [makeModel()], language: 'en', generatedAt: '2026-09-10',
    });
    expect(md).toContain('# Interview brief — Control Analyst');
    expect(md).toContain('**Overall score (descriptive):** 72/100');
    expect(md).toContain('| Decision making | 72 | provisional_score |');
    expect(md).toContain('### Suggested prompts');
  });

  it('determinista: mismo input → mismo output (generatedAt fijo)', () => {
    const args = { process, candidates: [makeModel()], language: 'es', generatedAt: '2026-09-10' };
    expect(buildBriefMarkdown(args)).toBe(buildBriefMarkdown(args));
  });

  it('múltiples candidatos → una sección cada uno + separador ---', () => {
    const md = buildBriefMarkdown({
      process,
      candidates: [makeModel(), makeModel({ alias: 'Otra Persona', id: 's-2' })],
      language: 'es', generatedAt: '2026-09-10',
    });
    expect(md).toContain('## Candido Vega · ready');
    expect(md).toContain('## Otra Persona · ready');
    expect(md.split('---').length - 1).toBeGreaterThanOrEqual(2);
  });
});

describe('buildProcessCsv', () => {
  const process = { id: 'analista', role: { es: 'Analista de Control', en: 'Control Analyst' } };

  it('BOM UTF-8 + header canónico', () => {
    const csv = buildProcessCsv({ process, candidates: [makeModel()] });
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('process_id,role,candidate_alias,candidate_status,completed_at,overall_score,construct_id,construct_label,construct_score,construct_availability,caveats');
  });

  it('una fila por candidato×constructo; score null → celda vacía (nunca 0)', () => {
    const csv = buildProcessCsv({ process, candidates: [makeModel()] });
    const lines = csv.replace(/^\uFEFF/, '').trimEnd().split('\n');
    expect(lines).toHaveLength(3); // header + 2 constructos
    expect(lines[1]).toContain('decisionMaking');
    expect(lines[1]).toContain(',72,provisional_score,');
    const planningRow = lines[2];
    expect(planningRow).toContain('planning');
    expect(planningRow).toContain(',insufficient,');
    // la celda de score de planning está vacía:
    expect(planningRow).toMatch(/Analista de Control,Candido Vega,ready,2026-09-01,72,planning,Planificación,,insufficient,/);
  });

  it('overall null → vacía (no 0)', () => {
    const csv = buildProcessCsv({ process, candidates: [makeModel({ overall: null })] });
    expect(csv).not.toMatch(/,0,/);
    expect(csv).toContain(',planning,Planificación,,insufficient,');
  });

  it('candidato sin constructos → una fila con constructos vacíos', () => {
    const csv = buildProcessCsv({ process, candidates: [makeModel({ constructs: [] })] });
    const lines = csv.replace(/^\uFEFF/, '').trimEnd().split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toMatch(/,ready,2026-09-01,72,,,,,/);
  });

  it('escape CSV: caveat con coma → entre comas dobladas', () => {
    const model = makeModel({
      caveats: [{ es: 'Nota, con coma', en: 'Note, with comma' }],
    });
    const csv = buildProcessCsv({ process, candidates: [model] });
    expect(csv).toContain('"Nota, con coma"');
  });

  it('solo agregados: sin campos crudos (video/landmarks/etc.)', () => {
    const csv = buildProcessCsv({ process, candidates: [makeModel()] });
    for (const forbidden of ['video', 'landmarks', 'rawFrames', 'screenshot', 'pointerSamples', 'eventLog']) {
      expect(csv.toLowerCase()).not.toContain(forbidden);
    }
  });
});

describe('downloadText (client-side)', () => {
  let createSpy;
  let revokeSpy;

  beforeEach(() => {
    createSpy = vi.fn(() => 'blob:mock-123');
    revokeSpy = vi.fn();
    global.URL.createObjectURL = createSpy;
    global.URL.revokeObjectURL = revokeSpy;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('crea blob con el texto, ancla con filename + mime charset, click y revoke', () => {
    vi.useFakeTimers();
    const text = '# hola\nlinea2'; // ASCII: blob.size (bytes) === text.length
    const result = downloadText('krumm-brief-analista-20260910.md', text, 'text/markdown');
    expect(result).toEqual({ ok: true, filename: 'krumm-brief-analista-20260910.md' });
    expect(createSpy).toHaveBeenCalledTimes(1);
    const blob = createSpy.mock.calls[0][0];
    expect(blob.type).toBe('text/markdown;charset=utf-8');
    expect(blob.size).toBe(text.length);
    expect(revokeSpy).not.toHaveBeenCalled(); // aún no pasó el timeout
    vi.advanceTimersByTime(1100);
    expect(revokeSpy).toHaveBeenCalledWith('blob:mock-123');
  });
});
