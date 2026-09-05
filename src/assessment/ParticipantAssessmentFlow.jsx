import React from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';

export default function ParticipantAssessmentFlow({ title = 'Evaluación gamificada unificada', status = 'idle', children }) {
  return (
    <section className="panel participant-assessment-flow" aria-label={title}>
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          <p className="caption">Estado: {status}</p>
        </div>
      </div>
      <div className="dash-section-body">
        {children}
      </div>
    </section>
  );
}
