import React from 'react';
import { useLanguage } from './LanguageContext.jsx';

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage();
  return (
    <div className="krumm-lang-toggle" role="group" aria-label="Idioma / Language">
      <button
        type="button"
        className={`krumm-lang-toggle__btn${language === 'es' ? ' is-active' : ''}`}
        aria-pressed={language === 'es'}
        onClick={() => setLanguage('es')}
      >
        ES
      </button>
      <span className="krumm-lang-toggle__sep" aria-hidden="true">/</span>
      <button
        type="button"
        className={`krumm-lang-toggle__btn${language === 'en' ? ' is-active' : ''}`}
        aria-pressed={language === 'en'}
        onClick={() => setLanguage('en')}
      >
        EN
      </button>
    </div>
  );
}
