import React from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';

export default function PostulationProgressHeader({ currentBlock, currentIndex = 0, total = 0, completed = [] }) {
  const { t } = useLanguage();
  const safeTotal = Math.max(0, Number(total) || 0);
  const safeIndex = Math.min(Math.max(0, Number(currentIndex) || 0), Math.max(0, safeTotal - 1));
  return (
    <header className="postulation-demo__game-header">
      <div>
        <span className="postulation-demo__eyebrow">{t('KRUMM Postulaciones', 'KRUMM Applications')}</span>
        <h1>{currentBlock?.label ?? t('Actividad', 'Activity')}</h1>
        <p>{currentBlock?.description ?? t('Juego breve para la demo de postulación.', 'Short game for the application demo.')}</p>
      </div>
      <div className="postulation-demo__game-progress" aria-label={t('Progreso de juegos', 'Game progress')}>
        <strong>{t('Juego {current} de {total}', 'Game {current} of {total}', { current: safeTotal ? safeIndex + 1 : 0, total: safeTotal })}</strong>
        <span>{currentBlock?.durationLabel ?? '—'}</span>
        <div className="postulation-demo__progress-dots">
          {Array.from({ length: safeTotal }, (_, index) => (
            <span
              key={`dot-${index}`}
              className={index < completed.length ? 'complete' : index === safeIndex ? 'current' : ''}
              aria-label={index < completed.length ? t('Juego {n} completado', 'Game {n} completed', { n: index + 1 }) : t('Juego {n}', 'Game {n}', { n: index + 1 })}
            />
          ))}
        </div>
      </div>
    </header>
  );
}
