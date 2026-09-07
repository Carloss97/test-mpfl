import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SignalErrorHint, { WARNING_SHOW_DELAY_MS } from './SignalErrorHint.jsx';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';

function renderHint(ui) {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

const OK_SNAPSHOT = Object.freeze({ camera: 'ok', face: 'ok', signal: 'ok', events: 10, report: 'pending' });
const CAMERA_ERROR_SNAPSHOT = Object.freeze({ camera: 'error', face: 'idle', signal: 'idle', events: 0, report: 'pending' });
const FACE_WARNING_SNAPSHOT = Object.freeze({ camera: 'ok', face: 'warning', signal: 'warning', events: 4, report: 'pending' });

describe('SignalErrorHint (H2)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('no muestra nada con señal ok (95% del tiempo)', () => {
    renderHint(<SignalErrorHint snapshot={OK_SNAPSHOT} />);
    expect(screen.getByTestId('signal-error-hint')).toHaveAttribute('data-active', 'false');
    expect(screen.queryByTestId('signal-error-hint-chip')).not.toBeInTheDocument();
    expect(screen.queryByText(/Procesamiento en segundo plano/i)).not.toBeInTheDocument();
  });

  it('no muestra nada con snapshot ausente (cámara opcional sin activar)', () => {
    renderHint(<SignalErrorHint snapshot={null} />);
    expect(screen.queryByTestId('signal-error-hint-chip')).not.toBeInTheDocument();
  });

  it('error de cámara: chip bloqueante inmediato, con acción y botón Detener evaluación', () => {
    const onStop = vi.fn();
    renderHint(<SignalErrorHint snapshot={CAMERA_ERROR_SNAPSHOT} onStop={onStop} />);
    // Bloqueante: visible sin delay.
    const chip = screen.getByTestId('signal-error-hint-chip');
    expect(chip).toHaveClass('postulation-demo__signal-hint--blocking');
    expect(screen.getByTestId('signal-error-hint')).toHaveAttribute('aria-live', 'assertive');
    expect(screen.getByTestId('signal-error-hint')).toHaveAttribute('role', 'alert');
    expect(screen.getByText(/Puedes continuar sin cámara/i)).toBeInTheDocument();
    expect(screen.getByText(/el reporte marcará esa ausencia/i)).toBeInTheDocument();
    const stop = screen.getByTestId('signal-hint-stop');
    expect(stop).toHaveTextContent('Detener evaluación');
    fireEvent.click(stop);
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('error de cámara sin onStop no ofrece botón de detener (solo mensaje)', () => {
    renderHint(<SignalErrorHint snapshot={CAMERA_ERROR_SNAPSHOT} />);
    expect(screen.getByTestId('signal-error-hint-chip')).toBeInTheDocument();
    expect(screen.queryByTestId('signal-hint-stop')).not.toBeInTheDocument();
  });

  it('warning de rostro/señal: oculto hasta persistir el delay, visible después', () => {
    renderHint(<SignalErrorHint snapshot={FACE_WARNING_SNAPSHOT} />);
    expect(screen.queryByTestId('signal-error-hint-chip')).not.toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(WARNING_SHOW_DELAY_MS - 1); });
    expect(screen.queryByTestId('signal-error-hint-chip')).not.toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(1); });
    const chip = screen.getByTestId('signal-error-hint-chip');
    expect(chip).toHaveClass('postulation-demo__signal-hint--warning');
    expect(screen.getByTestId('signal-error-hint')).toHaveAttribute('aria-live', 'polite');
    expect(chip).toHaveTextContent(/Señal en pausa: mejora la iluminación/i);
    expect(screen.queryByTestId('signal-hint-stop')).not.toBeInTheDocument();
  });

  it('auto-oculta de inmediato al resolverse (warning → ok)', () => {
    const { rerender } = renderHint(<SignalErrorHint snapshot={FACE_WARNING_SNAPSHOT} showDelayMs={0} />);
    expect(screen.getByTestId('signal-error-hint-chip')).toBeInTheDocument();
    rerender(<LanguageProvider><SignalErrorHint snapshot={OK_SNAPSHOT} showDelayMs={0} /></LanguageProvider>);
    expect(screen.queryByTestId('signal-error-hint-chip')).not.toBeInTheDocument();
    expect(screen.getByTestId('signal-error-hint')).toHaveAttribute('data-active', 'false');
  });

  it('muestra el copy en inglés con idioma EN', () => {
    vi.stubGlobal('localStorage', { getItem: () => 'en', setItem: () => {} });
    renderHint(<SignalErrorHint snapshot={CAMERA_ERROR_SNAPSHOT} onStop={vi.fn()} />);
    expect(screen.getByTestId('signal-error-hint-chip')).toHaveTextContent(/You can continue without a camera/i);
    expect(screen.getByTestId('signal-hint-stop')).toHaveTextContent('Stop assessment');
    vi.unstubAllGlobals();
  });

  it('reinicia el delay si la condición cambia de un warning a otro distinto', () => {
    // face-warning (face warning + signal ok) → signal-warning (face ok + signal warning):
    // cambia la clave, se cancela el timer anterior y arranca uno nuevo completo.
    const faceWarning = Object.freeze({ camera: 'ok', face: 'warning', signal: 'ok', events: 4, report: 'pending' });
    const signalWarning = Object.freeze({ camera: 'ok', face: 'ok', signal: 'warning', events: 4, report: 'pending' });
    const { rerender } = renderHint(<SignalErrorHint snapshot={faceWarning} />);
    act(() => { vi.advanceTimersByTime(WARNING_SHOW_DELAY_MS - 1); });
    expect(screen.queryByTestId('signal-error-hint-chip')).not.toBeInTheDocument();
    rerender(<LanguageProvider><SignalErrorHint snapshot={signalWarning} /></LanguageProvider>);
    // El timer de face-warning aún no había disparado; el nuevo timer arranca desde 0.
    act(() => { vi.advanceTimersByTime(WARNING_SHOW_DELAY_MS - 1); });
    expect(screen.queryByTestId('signal-error-hint-chip')).not.toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(1); });
    expect(screen.getByTestId('signal-error-hint-chip')).toBeInTheDocument();
    expect(screen.getByTestId('signal-error-hint-chip')).toHaveTextContent(/Señal en pausa: mejora la iluminación/i);
  });
});
