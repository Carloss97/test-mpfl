import React from 'react';

export default function PostulationProgressHeader({ currentBlock, currentIndex = 0, total = 0, completed = [] }) {
  const safeTotal = Math.max(0, Number(total) || 0);
  const safeIndex = Math.min(Math.max(0, Number(currentIndex) || 0), Math.max(0, safeTotal - 1));
  return (
    <header className="postulation-demo__game-header">
      <div>
        <span className="postulation-demo__eyebrow">KRUMM Postulaciones</span>
        <h1>{currentBlock?.label ?? 'Actividad'}</h1>
        <p>{currentBlock?.description ?? 'Juego breve para la demo de postulación.'}</p>
      </div>
      <div className="postulation-demo__game-progress" aria-label="Progreso de juegos">
        <strong>Juego {safeTotal ? safeIndex + 1 : 0} de {safeTotal}</strong>
        <span>{currentBlock?.durationLabel ?? '—'}</span>
        <div className="postulation-demo__progress-dots">
          {Array.from({ length: safeTotal }, (_, index) => (
            <span
              key={`dot-${index}`}
              className={index < completed.length ? 'complete' : index === safeIndex ? 'current' : ''}
              aria-label={index < completed.length ? `Juego ${index + 1} completado` : `Juego ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </header>
  );
}
