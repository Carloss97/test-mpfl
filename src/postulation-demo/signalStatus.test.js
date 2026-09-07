import { describe, expect, it } from 'vitest';
import { buildBehindTheScenesStatus, getSignalErrorHint } from './signalStatus.js';

describe('buildBehindTheScenesStatus (fuente de estados, H2)', () => {
  it('normaliza un snapshot ausente a estado local solo idle', () => {
    expect(buildBehindTheScenesStatus()).toMatchObject({
      camera: 'idle',
      face: 'idle',
      signal: 'idle',
      events: 0,
      report: 'pending',
      readyCount: 0,
      totalCount: 5,
    });
  });

  it('describe un setup de cámara opcional idle como listo y no como procesamiento', () => {
    const status = buildBehindTheScenesStatus({ camera: 'idle', face: 'idle', signal: 'idle', events: 0, report: 'pending' });
    expect(status.activityLabel).toBe('Listo para comenzar');
    expect(status.progressLabel).toBe('Puedes continuar sin cámara');
  });

  it('cuenta listos y preserva caveats agregados', () => {
    const status = buildBehindTheScenesStatus({
      camera: 'ok',
      face: 'ok',
      signal: 'warning',
      events: 12,
      report: 'pending',
      caveats: ['MoveNet sin hombros visibles'],
    });
    expect(status.readyCount).toBe(3);
    expect(status.totalCount).toBe(5);
    expect(status.events).toBe(12);
    expect(status.eventStatus).toBe('ok');
    expect(status.caveats).toEqual(['MoveNet sin hombros visibles']);
    expect(status.activityLabel).toBe('Procesando en segundo plano');
  });
});

describe('getSignalErrorHint (regla H2.1)', () => {
  it('se calla con todo ok', () => {
    expect(getSignalErrorHint(buildBehindTheScenesStatus({ camera: 'ok', face: 'ok', signal: 'ok', events: 10, report: 'pending' }))).toBeNull();
  });

  it('se calla con pending inicial e idle (cámara opcional no activada)', () => {
    expect(getSignalErrorHint(buildBehindTheScenesStatus({ camera: 'pending', face: 'pending', signal: 'pending', events: 0, report: 'pending' }))).toBeNull();
    expect(getSignalErrorHint(buildBehindTheScenesStatus())).toBeNull();
    expect(getSignalErrorHint(buildBehindTheScenesStatus({ camera: 'idle', face: 'idle', signal: 'idle', events: 3, report: 'pending' }))).toBeNull();
  });

  it('error de cámara = único estado bloqueante (decisión 2)', () => {
    expect(getSignalErrorHint(buildBehindTheScenesStatus({ camera: 'error' }))).toEqual({ key: 'camera-error', blocking: true });
  });

  it('error de rostro = no bloqueante', () => {
    expect(getSignalErrorHint(buildBehindTheScenesStatus({ camera: 'ok', face: 'error' }))).toEqual({ key: 'face-error', blocking: false });
  });

  it('warning de señal/rostro = no bloqueante', () => {
    expect(getSignalErrorHint(buildBehindTheScenesStatus({ camera: 'ok', face: 'ok', signal: 'warning' }))).toEqual({ key: 'signal-warning', blocking: false });
    expect(getSignalErrorHint(buildBehindTheScenesStatus({ camera: 'ok', face: 'warning', signal: 'ok' }))).toEqual({ key: 'face-warning', blocking: false });
  });

  it('prioridad: cámara > rostro error > señal warning > rostro warning', () => {
    expect(getSignalErrorHint(buildBehindTheScenesStatus({ camera: 'error', face: 'error', signal: 'warning' })).key).toBe('camera-error');
    expect(getSignalErrorHint(buildBehindTheScenesStatus({ camera: 'ok', face: 'error', signal: 'warning' })).key).toBe('face-error');
    expect(getSignalErrorHint(buildBehindTheScenesStatus({ camera: 'ok', face: 'warning', signal: 'warning' })).key).toBe('signal-warning');
  });
});
