import { describe, expect, it } from 'vitest';
import {
  buildSyntheticUnifiedAssessmentExperience,
  createManualUnifiedAssessmentSmokeChecklist,
} from './assessmentExperienceSmoke.js';

describe('unified assessment experience smoke', () => {
  it('builds the whole synthetic A-X pipeline into payload, reports and delivery bundle', () => {
    const result = buildSyntheticUnifiedAssessmentExperience({ runId: 'smoke-z-001' });

    expect(result.batterySession.state).toBe('report_ready');
    expect(result.assessmentSession.schemaVersion).toBe('krumm_unified_assessment_session_v1');
    expect(result.talentProfile.schemaVersion).toBe('krumm_talent_profile_v2');
    expect(result.finalPayload.schemaVersion).toBe('krumm_final_assessment_payload_v1');
    expect(result.finalPayload.validation).toEqual({ ok: true, violations: [] });
    expect(result.reports.markdown.content).toContain('KRUMM — Reporte de Evaluación Gamificada');
    expect(result.reports.html.content).toContain('<h1>KRUMM — Reporte de Evaluación Gamificada</h1>');
    expect(result.reports.json.content.schemaVersion).toBe('krumm_talent_report_v1');
    expect(result.deliveryBundle.schemaVersion).toBe('krumm_report_delivery_bundle_v1');
    expect(result.deliveryBundle.files.map((file) => file.fileName)).toEqual([
      'smoke-z-001-talent-report.md',
      'smoke-z-001-talent-report.html',
      'smoke-z-001-talent-report.json',
    ]);

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('faceSamples');
    expect(serialized).not.toContain('"landmarks":');
    expect(serialized).not.toContain('pointerSamples');
    expect(serialized).not.toContain('rawGameEvents');
    expect(serialized).not.toContain('"windows":');
    expect(serialized).not.toContain('contratar');
    expect(serialized).not.toContain('rechazar');
  });

  it('defines a manual camera smoke checklist that covers phase Y', () => {
    const checklist = createManualUnifiedAssessmentSmokeChecklist();
    expect(checklist.schemaVersion).toBe('krumm_manual_smoke_checklist_v1');
    expect(checklist.steps.map((step) => step.id)).toEqual([
      'install_deps',
      'build_preflight',
      'start_dev_server',
      'open_browser',
      'start_camera',
      'calibrate_signals',
      'run_unified_battery',
      'verify_live_metrics',
      'generate_final_report',
      'export_artifacts',
      'privacy_review',
    ]);
    expect(checklist.steps.find((step) => step.id === 'start_camera').requiresHumanBrowser).toBe(true);
    expect(checklist.blockers).toContain('No se puede validar cámara real desde WSL/headless sin navegador con permisos de cámara.');
  });
});
