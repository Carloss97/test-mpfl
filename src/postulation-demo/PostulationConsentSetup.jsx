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
  return (
    <main className="postulation-demo__setup" aria-labelledby="postulation-setup-title">
      <section className="postulation-demo__setup-panel">
        <span className="postulation-demo__eyebrow">Cámara local opcional</span>
        <h1 id="postulation-setup-title">Preparación de señales</h1>
        <p>
          Activa la cámara si quieres que KRUMM procese FaceMesh, AUs/FACS, gaze, postura y MoveNet en segundo plano. Puedes continuar con caveats si una señal no está disponible.
        </p>
        <div className="postulation-demo__setup-actions">
          <button type="button" className="postulation-demo__primary" onClick={onEnableCamera} disabled={backgroundActive}>
            {backgroundActive ? 'Cámara solicitada' : 'Activar cámara local'}
          </button>
          <button type="button" className="postulation-demo__secondary-button" onClick={onContinue}>
            Continuar a juegos
          </button>
          <button type="button" className="postulation-demo__secondary-button" onClick={onBack}>
            {postulationDemoCopy.setupPreview.back}
          </button>
        </div>
        <ul className="postulation-demo__setup-list">
          <li>No se guarda video ni frames.</li>
          <li>No se persisten landmarks crudos ni trayectorias de puntero.</li>
          <li>Las señales son observacionales y el reporte es para revisión humana.</li>
        </ul>
      </section>

      <section className="postulation-demo__setup-side" aria-label="Estado de procesamiento">
        <BehindTheScenesMiniHud snapshot={signalSnapshot} />
        {children}
      </section>
    </main>
  );
}
