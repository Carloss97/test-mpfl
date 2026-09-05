import React, { useState } from 'react';
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
  requireExplicitConsent = true,
}) {
  const copy = usePostulationDemoCopy();
  const { t } = useLanguage();
  const cameraFailed = signalSnapshot?.camera === 'error';
  const [consentAccepted, setConsentAccepted] = useState(false);
  const consentGated = requireExplicitConsent && !consentAccepted;
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

        <section className="postulation-demo__explicit-consent" aria-label={t('Consentimiento explícito', 'Explicit consent')}>
          <h2>{t('Consentimiento', 'Consent')}</h2>
          <p>
            {t(
              'Al continuar consientes voluntariamente participar en esta evaluación. Solo se conservan datos agregados privacy-safe y un reporte para revisión humana. No se guarda video, imágenes, landmarks crudos, trayectorias ni eventos acción por acción.',
              'By continuing you voluntarily consent to participate in this assessment. Only privacy-safe aggregate data and a report for human review are retained. No video, images, raw landmarks, trajectories, or action-by-action events are stored.',
            )}
          </p>
          <ul className="postulation-demo__consent-facts">
            <li>{t('Base: consentimiento informado previo y libre; retención limitada (30 días) y supresión a solicitud.', 'Basis: prior, free, informed consent; limited retention (30 days) and deletion on request.')}</li>
            <li>{t('Datos agregados: no reconstructivos, no individualizados más allá del alias.', 'Aggregate data: non-reconstructive, not individualized beyond an alias.')}</li>
            <li>{t('Derechos: acceder, rectificar y solicitar la eliminación de tus datos contactando a KRUMM.', 'Rights: access, correct, and request deletion of your data by contacting KRUMM.')}</li>
            <li>{t('La señal ausente se trata como desconocida, nunca como bajo desempeño ni decisión de talento.', 'A missing signal is treated as unknown, never as low performance or a talent decision.')}</li>
          </ul>
          <label className="postulation-demo__consent-check">
            <input
              type="checkbox"
              data-testid="postulation-explicit-consent"
              checked={consentAccepted}
              onChange={(event) => setConsentAccepted(event.target.checked)}
            />
            <span>{t('He leído la información y acepto los términos de esta evaluación.', 'I have read this information and accept the terms of this assessment.')}</span>
          </label>
        </section>

        <div className="postulation-demo__setup-actions">
          <button type="button" className="postulation-demo__primary" onClick={onContinue} disabled={consentGated}>
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