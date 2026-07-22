import React from 'react';
import BehindTheScenesMiniHud from './BehindTheScenesMiniHud.jsx';
import { postulationDemoCopy } from './postulationDemoCopy.js';

export default function PostulationConsentSetup({
  backgroundActive = false,
  signalSnapshot,
  onEnableCamera,
  onContinue,
  onBack,
  children,
}) {
  const cameraFailed = signalSnapshot?.camera === 'error';
  return (
    <main className="postulation-demo__setup" aria-labelledby="postulation-setup-title">
      <section className="postulation-demo__setup-panel">
        <span className="postulation-demo__eyebrow">Cámara local opcional</span>
        <h1 id="postulation-setup-title">Preparación de la sesión</h1>
        <p>
          La cámara es opcional. Si la activas, KRUMM revisa localmente la calidad de captura y el contexto postural; estas señales no se usan por sí solas para inferir talento. Puedes continuar sin cámara y el reporte marcará esa ausencia.
        </p>
        <div className="postulation-demo__setup-actions">
          <button type="button" className="postulation-demo__primary" onClick={onContinue}>
            Continuar a juegos
          </button>
          <button type="button" className="postulation-demo__secondary-button" onClick={onEnableCamera} disabled={backgroundActive && !cameraFailed}>
            {cameraFailed ? 'Reintentar cámara' : backgroundActive ? 'Cámara solicitada' : 'Activar cámara local (opcional)'}
          </button>
          <button type="button" className="postulation-demo__secondary-button" onClick={onBack}>
            {postulationDemoCopy.setupPreview.back}
          </button>
        </div>
        <ul className="postulation-demo__setup-list">
          <li>No se guarda video, imágenes ni datos reconstructivos.</li>
          <li>La cámara aporta calidad y contexto, nunca una decisión de talento.</li>
          <li>Una señal ausente queda como desconocida, no como bajo desempeño.</li>
        </ul>
      </section>

      <section className="postulation-demo__setup-side" aria-label="Estado de procesamiento">
        <BehindTheScenesMiniHud snapshot={signalSnapshot} />
        {children}
      </section>
    </main>
  );
}
