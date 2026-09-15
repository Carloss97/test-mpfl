// Centro de ayuda público: el contenido FAQ vive en docs/support para evitar
// que el copy operativo se desincronice entre documentación y producto.
import React from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { useV3Copy } from './v3Copy.js';
import renderMarkdown from './legalRender.jsx';
import faqCandidatos from '../../docs/support/faq-candidatos.md?raw';
import faqEmpresas from '../../docs/support/faq-empresas.md?raw';

export default function HelpPage() {
  const { t } = useLanguage();
  const copy = useV3Copy();

  return (
    <div className="v3-help-page">
      <span className="v3-portal-label">{t('KRUMM · AYUDA', 'KRUMM · HELP')}</span>
      <h1>{t('Centro de ayuda', 'Help centre')}</h1>
      <p>
        {t(
          'Respuestas para candidatos y empresas. Si no encuentras lo que necesitas, escribe a soporte@krumm.cl.',
          'Answers for candidates and companies. If you cannot find what you need, email soporte@krumm.cl.',
        )}
      </p>
      <a className="v3-cta-gold" href="mailto:soporte@krumm.cl">
        {t('Contactar soporte', 'Contact support')}
      </a>
      <section className="v3-help-page__doc" aria-labelledby="v3-help-candidates">
        <h2 id="v3-help-candidates">{t('Preguntas frecuentes para candidatos', 'Candidate FAQs')}</h2>
        {renderMarkdown(faqCandidatos)}
      </section>
      <section className="v3-help-page__doc" aria-labelledby="v3-help-companies">
        <h2 id="v3-help-companies">{t('Preguntas frecuentes para empresas', 'Company FAQs')}</h2>
        {renderMarkdown(faqEmpresas)}
      </section>
      <a className="v3-back" href="/">{copy.common_backHome}</a>
    </div>
  );
}
