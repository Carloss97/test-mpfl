// t_1c27edbf (V0 fase v3): diálogo "próxima etapa" del chrome v3.
// Replica el comportamiento del <dialog> de la referencia (candidate.js /
// company.js) sin depender de HTMLDialogElement.showModal() (inexistente en
// jsdom): overlay role=dialog + aria-modal, Escape y backdrop cierran, el
// focus entra al botón de cierre y regresa al trigger al cerrar.
import React, { useEffect, useRef } from 'react';

export default function V3Dialog({ open, title, text, onClose, closeLabel = 'Close', labelId = 'v3-dialog-title', descId = 'v3-dialog-desc' }) {
  const closeButtonRef = useRef(null);
  const lastActiveRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return undefined;
    lastActiveRef.current = document.activeElement;
    closeButtonRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      // Regresa el focus al trigger que abrió el diálogo (WCAG 2.4.3).
      lastActiveRef.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div className="v3-dialog-backdrop" aria-hidden="true" onClick={onClose} />
      <div
        className="v3-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        aria-describedby={descId}
      >
        <h2 id={labelId}>{title}</h2>
        <p id={descId}>{text}</p>
        <button
          type="button"
          className="v3-dialog__close"
          ref={closeButtonRef}
          onClick={onClose}
        >
          {closeLabel}
        </button>
      </div>
    </>
  );
}
