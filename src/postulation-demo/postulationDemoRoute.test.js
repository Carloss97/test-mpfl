import { describe, expect, it } from 'vitest';
import {
  POSTULATION_DEMO_BASE_PATH,
  POSTULATION_HR_DASHBOARD_PATH,
  isPostulationDemoPath,
  isPostulationHrDashboardPath,
} from './postulationDemoRoute.js';

describe('postulation demo routes', () => {
  it('recognizes the dedicated HR dashboard route without confusing sibling paths', () => {
    expect(POSTULATION_HR_DASHBOARD_PATH).toBe('/postulaciones-demo/hr');
    expect(isPostulationHrDashboardPath('/postulaciones-demo/hr')).toBe(true);
    expect(isPostulationHrDashboardPath('/postulaciones-demo/hr/')).toBe(true);
    expect(isPostulationHrDashboardPath('/postulaciones-demo/hr-report')).toBe(false);
    expect(isPostulationHrDashboardPath('/postulaciones-demo')).toBe(false);
  });

  it('preserves the candidate demo base and child path matcher', () => {
    expect(POSTULATION_DEMO_BASE_PATH).toBe('/postulaciones-demo');
    expect(isPostulationDemoPath('/postulaciones-demo')).toBe(true);
    expect(isPostulationDemoPath('/postulaciones-demo/')).toBe(true);
    expect(isPostulationDemoPath('/postulaciones-demo/fixture')).toBe(true);
    expect(isPostulationDemoPath('/unrelated')).toBe(false);
  });
});
