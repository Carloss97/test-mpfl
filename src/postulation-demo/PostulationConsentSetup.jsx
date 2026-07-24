import React from 'react';
import BehindTheScenesMiniHud from './BehindTheScenesMiniHud.jsx';
import { usePostulationDemoCopy } from './postulationDemoCopy.js';
import { useLanguage } from '../i18n/LanguageContext.jsx';

export default function PostulationConsentSetup({
  backgroundActive = false,
  signalSnapshot,
  onEnableCamera,
  onContinue,
  onBack,
  children,
}) {
  const copy = usePostulationDemoCopy();
  const { t } = useLanguage();
  const cameraFailed = signalSnapshot?.camera === 'error';
  return (
    <main className="postulation-demo__setup" aria-labelledby="postulation-setup-title">
      <section className="postulation-demo__setup-panel">
        <span className="postulation-demo__eyebrow">{t('Cámara local opcional', 'Optional local camera')}</span>
        <h1 id="postulation-setup-title">{t('Preparación de la sesión', 'Session preparation')}</h1>
        <p>
          {t(
            'La cámara es opcional. Si la activas, KRUMM revisa localmente la calidad de captura y el contexto postural; estas señales no se usan por sí solas para inferir talento. Puedes continuar sin cámara y el reporte marcará esa ausencia.',
            'The camera is optional. If you enable it, KRUMM locally reviews capture quality and posture context; these signals are not used on their own to infer talent. You can continue without a camera and the report will note its absence.',
          )}
        </p>
        <div className="postulation-demo__setup-actions">
          <button type="button" className="postulation-demo__primary" onClick={onContinue}>
            {t('Continuar a juegos', 'Continue to games')}
          </button>
          <button type="button" className="postulation-demo__secondary-button" onClick={onEnableCamera} disabled={backgroundActive && !cameraFailed}>
            {cameraFailed ? t('Reintentar cámara', 'Retry camera') : backgroundActive ? t('Cámara solicitada', 'Camera requested') : t('Activar cámara local (opcional)', 'Enable local camera (optional)')}
          </button>
          <button type="button" className="postulation-demo__secondary-button" onClick={onBack}>
            {copy.setupPreview.back}
          </button>
        </div>
        <ul className="postulation-demo__setup-list">
          <li>{t('No se guarda video, imágenes ni datos reconstructivos.', 'No video, images, or reconstructive data are stored.')}</li>
          <li>{t('La cámara aporta calidad y contexto, nunca una decisión de talento.', 'The camera contributes quality and context, never a talent decision.')}</li>
          <li>{t('Una señal ausente queda como desconocida, no como bajo desempeño.', 'A missing signal is treated as unknown, not as low performance.')}</li>
        </ul>
      </section>

      <section className="postulation-demo__setup-side" aria-label={t('Estado de procesamiento', 'Processing status')}>
        <BehindTheScenesMiniHud snapshot={signalSnapshot} />
        {children}
      </section>
    </main>
  );
}
