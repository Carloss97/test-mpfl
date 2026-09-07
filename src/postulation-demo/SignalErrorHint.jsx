import React, { useEffect, useState } from 'react';
import { buildBehindTheScenesStatus, getSignalErrorHint } from './signalStatus.js';
import { useLanguage } from '../i18n/LanguageContext.jsx';

// Delay de visibilidad para warnings no bloqueantes (regla H2.1): la condición
// debe persistir ≥ 5 s para no molestar con flickers transitorios (el candidato
// mira la pantalla, no la cámara, durante el juego).
export const WARNING_SHOW_DELAY_MS = 5000;

const HINT_COPY = {
  'camera-error': (t) => ({
    title: t('Cámara no disponible', 'Camera unavailable'),
    message: t('Puedes continuar sin cámara; el reporte marcará esa ausencia.', 'You can continue without a camera; the report will note its absence.'),
  }),
  'face-error': (t) => ({
    title: null,
    message: t('Revisa la cámara y continúa; la señal facial no está disponible.', 'Check the camera and continue; the face signal is unavailable.'),
  }),
  'signal-warning': (t) => ({
    title: null,
    message: t('Señal en pausa: mejora la iluminación.', 'Signal paused: improve the lighting.'),
  }),
  'face-warning': (t) => ({
    title: null,
    message: t('Señal en pausa: mejora la iluminación.', 'Signal paused: improve the lighting.'),
  }),
};

/**
 * Indicador discreto de error de señal (H2): visible SOLO con error/warning,
 * mensaje con acción, auto-ocultable cuando se resuelve, persistente cuando
 * bloquea (cámara en error sostenido). Reemplaza al HUD/drawer "qué pasa detrás".
 *
 * - snapshot: la misma señal que antes consumía BehindTheScenesMiniHud.
 * - onStop: acción del botón "Detener evaluación" (solo variante bloqueante).
 * - showDelayMs: delay de aparición para warnings (0 en tests/bloqueante).
 */
export default function SignalErrorHint({ snapshot, onStop, showDelayMs = WARNING_SHOW_DELAY_MS }) {
  const { t } = useLanguage();
  const status = buildBehindTheScenesStatus(snapshot);
  const hint = getSignalErrorHint(status);
  const hintKey = hint ? hint.key : null;
  const blocking = hint ? hint.blocking === true : false;
  const [visibleKey, setVisibleKey] = useState(null);

  useEffect(() => {
    if (hintKey === null) {
      // Condición resuelta: ocultar de inmediato (auto-hide).
      setVisibleKey(null);
      return undefined;
    }
    if (blocking || showDelayMs <= 0) {
      setVisibleKey(hintKey);
      return undefined;
    }
    const id = window.setTimeout(() => setVisibleKey(hintKey), showDelayMs);
    return () => window.clearTimeout(id);
  }, [hintKey, blocking, showDelayMs]);

  const active = visibleKey === hintKey && hintKey !== null;
  const copy = active ? HINT_COPY[visibleKey]?.(t) : null;

  // Región aria-live siempre montada (patrón WAI-ARIA): el contenido se cambia
  // dentro para que lectores de pantalla anuncien la aparición/resolución.
  return (
    <div
      className="postulation-demo__signal-hint-anchor"
      data-testid="signal-error-hint"
      data-active={String(active)}
      role={blocking ? 'alert' : 'status'}
      aria-live={blocking ? 'assertive' : 'polite'}
    >
      {active && copy ? (
        <div className={`postulation-demo__signal-hint postulation-demo__signal-hint--${blocking ? 'blocking' : 'warning'}`} data-testid="signal-error-hint-chip">
          <span className="postulation-demo__signal-hint-icon" aria-hidden="true">{blocking ? '⚠️' : '💡'}</span>
          <span className="postulation-demo__signal-hint-message">
            {copy.title ? <strong>{copy.title}. </strong> : null}
            {copy.message}
          </span>
          {blocking && onStop ? (
            <button type="button" className="postulation-demo__signal-hint-stop" data-testid="signal-hint-stop" onClick={onStop}>
              {t('Detener evaluación', 'Stop assessment')}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
