import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';

/**
 * FeedbackWidget — Botón flotante para reportar bugs, sugerencias y feedback general.
 * Contexto automático: ruta, battery, gameId, UA, viewport, locale, tenant (sin PII de sesión).
 * Envío: webhook Discord `DISCORD_ALERTS_WEBHOOK_URL` + opcional Linear API.
 */
export default function FeedbackWidget() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('bug'); // 'bug' | 'suggestion' | 'general'
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null); // null | 'success' | 'error'
  const buttonRef = useRef(null);
  const panelRef = useRef(null);

  // Contexto automático (sin PII)
  const context = {
    url: window.location.href,
    pathname: window.location.pathname,
    battery: new URLSearchParams(window.location.search).get('battery') || 'unknown',
    gameId: (() => {
      const match = window.location.pathname.match(/\/postulaciones\/game\/([^/]+)/);
      return match ? match[1] : 'none';
    })(),
    userAgent: navigator.userAgent,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    locale: document.documentElement.lang || 'es',
    tenant: (() => {
      try {
        // En modo real, el tenant viene del token Cognito custom:companyId
        // En demo, siempre 'krumm-demo'
        return 'krumm-demo'; // TODO: leer de auth context cuando esté listo
      } catch { return 'unknown'; }
    })(),
    timestamp: new Date().toISOString(),
  };

  const typeLabels = {
    bug: t('🐛 Bug / Error', '🐛 Bug / Error'),
    suggestion: t('💡 Sugerencia', '💡 Sugerencia'),
    general: t('💬 General', '💬 General'),
  };

  const severityOptions = [
    { value: 'critical', label: t('Crítico (bloquea mi evaluación)', 'Critical (blocks my evaluation)') },
    { value: 'high', label: t('Alto (degrada mucho la experiencia)', 'High (degrades experience significantly)') },
    { value: 'medium', label: t('Medio (molesto pero puedo continuar)', 'Medium (annoying but can continue)') },
    { value: 'low', label: t('Bajo (mejora menor)', 'Low (minor improvement)') },
  ];

  const [severity, setSeverity] = useState('medium');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);

    const payload = {
      type,
      severity: type === 'bug' ? severity : 'none',
      message: message.trim(),
      context,
      // Metadatos para triage
      source: 'feedback-widget',
      version: import.meta.env.VITE_APP_VERSION || 'dev',
    };

    try {
      // 1. Discord webhook (infra existente: DISCORD_ALERTS_WEBHOOK_URL)
      // El endpoint es un edge function / lambda que reenvía a Discord
      // Por ahora usamos un endpoint interno que el backend expone
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      setResult('success');
      setMessage('');
      setTimeout(() => { setResult(null); setOpen(false); }, 3000);
    } catch (err) {
      console.error('Feedback send failed:', err);
      setResult('error');
    } finally {
      setSending(false);
    }
  };

  // Cerrar al click fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target) &&
          buttonRef.current && !buttonRef.current.contains(event.target)) {
        setOpen(false);
        setResult(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Tecla Escape para cerrar
  useEffect(() => {
    function handleEscape(event) {
      if (event.key === 'Escape') {
        setOpen(false);
        setResult(null);
      }
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <>
      {/* Botón flotante */}
      <button
        ref={buttonRef}
        className="k-feedback-btn"
        onClick={() => setOpen(!open)}
        aria-label={t('Enviar feedback', 'Send feedback')}
        aria-expanded={open}
        aria-haspopup="dialog"
        disabled={sending}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <span className="k-feedback-tooltip">{t('Feedback', 'Feedback')}</span>
      </button>

      {/* Panel desplegable */}
      {open && (
        <div ref={panelRef} className="k-feedback-panel" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
          <div className="k-feedback-header">
            <h3 id="feedback-title">{t('Enviar feedback', 'Send feedback')}</h3>
            <button className="k-feedback-close" onClick={() => { setOpen(false); setResult(null); }} aria-label={t('Cerrar', 'Close')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          {result === 'success' ? (
            <div className="k-feedback-success" role="status">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              <p>{t('¡Gracias! Tu feedback ha sido enviado.', 'Thanks! Your feedback has been sent.')}</p>
            </div>
          ) : result === 'error' ? (
            <div className="k-feedback-error" role="alert">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
              <p>{t('No se pudo enviar. Intenta de nuevo o escribe a soporte@krumm.cl', 'Could not send. Try again or email soporte@krumm.cl')}</p>
              <button className="k-btn k-btn--secondary" onClick={() => setResult(null)}>{t('Reintentar', 'Retry')}</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="k-feedback-form">
              <div className="k-feedback-type">
                <label>{t('Tipo', 'Type')}</label>
                <div className="k-feedback-type-options" role="radiogroup" aria-label={t('Tipo de feedback', 'Feedback type')}>
                  {Object.entries(typeLabels).map(([value, label]) => (
                    <label key={value} className={`k-feedback-type-option ${type === value ? 'active' : ''}`}>
                      <input
                        type="radio"
                        name="feedback-type"
                        value={value}
                        checked={type === value}
                        onChange={() => setType(value)}
                        aria-label={label}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {type === 'bug' && (
                <div className="k-feedback-severity">
                  <label>{t('Severidad', 'Severity')}</label>
                  <select value={severity} onChange={(e) => setSeverity(e.target.value)} aria-label={t('Severidad del bug', 'Bug severity')}>
                    {severityOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="k-feedback-message">
                <label htmlFor="feedback-message">{t('Mensaje', 'Message')}</label>
                <textarea
                  id="feedback-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t('Describe el problema, idea o comentario...', 'Describe the issue, idea or comment...')}
                  rows={4}
                  required
                  aria-describedby="feedback-context-hint"
                ></textarea>
                <p id="feedback-context-hint" className="k-feedback-hint">
                  {t('Incluiremos automáticamente: página actual, juego, dispositivo, navegador (sin datos personales ni de tu sesión).', 'We\'ll automatically include: current page, game, device, browser (no personal or session data).')}
                </p>
              </div>

              <div className="k-feedback-actions">
                <button type="button" className="k-btn k-btn--secondary" onClick={() => { setOpen(false); setResult(null); }}>
                  {t('Cancelar', 'Cancel')}
                </button>
                <button type="submit" className="k-btn k-btn--primary" disabled={sending || !message.trim()}>
                  {sending ? t('Enviando...', 'Sending...') : t('Enviar', 'Send')}
                </button>
              </div>
            </form>
          )}

          <p className="k-feedback-footer">
            {t('¿Necesitas ayuda urgente?', 'Need urgent help?')} 
            <a href="mailto:soporte@krumm.cl">soporte@krumm.cl</a>
          </p>
        </div>
      )}

      <style jsx>{`
        .k-feedback-btn {
          position: fixed;
          bottom: var(--k-space-6, 24px);
          right: var(--k-space-6, 24px);
          z-index: 9999;
          display: flex;
          align-items: center;
          gap: var(--k-space-2, 8px);
          padding: var(--k-space-2, 8px) var(--k-space-3, 12px);
          background: var(--k-btn-gold, #d8b38c);
          color: var(--k-btn-gold-ink, #38271d);
          border: none;
          border-radius: var(--k-radius-full, 9999px);
          font-family: var(--k-font-body, 'Manrope', sans-serif);
          font-size: var(--k-text-sm, 0.875rem);
          font-weight: 600;
          cursor: pointer;
          box-shadow: var(--k-shadow-lg, 0 10px 15px -3px rgba(0,0,0,0.1));
          transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
        }
        .k-feedback-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: var(--k-shadow-xl, 0 20px 25px -5px rgba(0,0,0,0.15));
          background: var(--k-btn-gold-dark, #b9906b);
        }
        .k-feedback-btn:active:not(:disabled) { transform: translateY(0) scale(0.98); }
        .k-feedback-btn:focus-visible { outline: 2px solid var(--k-focus-ring, #d8b38c); outline-offset: 2px; }
        .k-feedback-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .k-feedback-tooltip { display: none; }
        @media (hover: hover) {
          .k-feedback-btn:hover .k-feedback-tooltip { display: inline; }
        }
        @media (max-width: 560px) {
          .k-feedback-btn { bottom: var(--k-space-4, 16px); right: var(--k-space-4, 16px); padding: var(--k-space-2, 8px); }
          .k-feedback-tooltip { display: none !important; }
        }

        .k-feedback-panel {
          position: fixed;
          bottom: calc(var(--k-space-6, 24px) + 56px);
          right: var(--k-space-6, 24px);
          z-index: 10000;
          width: 100%;
          max-width: 420px;
          background: var(--k-bg-card, #38271d);
          color: var(--k-text-cream, #f7efe6);
          border: 1px solid var(--k-border-subtle, rgba(216,179,140,0.2));
          border-radius: var(--k-radius-lg, 12px);
          box-shadow: var(--k-shadow-xl, 0 20px 25px -5px rgba(0,0,0,0.4));
          overflow: hidden;
          animation: k-feedback-slide-up 0.2s ease-out;
        }
        @keyframes k-feedback-slide-up {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 560px) {
          .k-feedback-panel { bottom: 80px; right: var(--k-space-4, 16px); left: var(--k-space-4, 16px); max-width: none; }
        }

        .k-feedback-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--k-space-4, 16px);
          border-bottom: 1px solid var(--k-border-subtle, rgba(216,179,140,0.2));
        }
        .k-feedback-header h3 { margin: 0; font-size: var(--k-text-lg, 1.125rem); font-weight: 700; }
        .k-feedback-close {
          background: none; border: none; color: var(--k-ink-medium, #a8988a); cursor: pointer; padding: var(--k-space-1, 4px);
          border-radius: var(--k-radius-md, 8px); display: flex; align-items: center; justify-content: center;
        }
        .k-feedback-close:hover { background: var(--k-hover-subtle, rgba(216,179,140,0.1)); color: var(--k-text-cream, #f7efe6); }

        .k-feedback-success, .k-feedback-error {
          display: flex; flex-direction: column; align-items: center; text-align: center;
          padding: var(--k-space-6, 24px) var(--k-space-4, 16px); color: var(--k-text-cream, #f7efe6);
        }
        .k-feedback-success svg { color: var(--k-success, #4ade80); }
        .k-feedback-error svg { color: var(--k-error, #f87171); }
        .k-feedback-error button { margin-top: var(--k-space-3, 12px); }

        .k-feedback-form { display: flex; flex-direction: column; gap: var(--k-space-4, 16px); padding: var(--k-space-4, 16px); }

        .k-feedback-type label, .k-feedback-severity label, .k-feedback-message label {
          display: block; font-size: var(--k-text-sm, 0.875rem); font-weight: 600; margin-bottom: var(--k-space-2, 8px);
          color: var(--k-ink-medium, #a8988a);
        }

        .k-feedback-type-options { display: flex; gap: var(--k-space-2, 8px); flex-wrap: wrap; }
        .k-feedback-type-option {
          display: flex; align-items: center; gap: var(--k-space-2, 8px);
          padding: var(--k-space-2, 8px) var(--k-space-3, 12px);
          background: var(--k-bg-elevated, #3d2b20);
          border: 1px solid var(--k-border-subtle, rgba(216,179,140,0.2));
          border-radius: var(--k-radius-full, 9999px);
          cursor: pointer; transition: all 0.15s ease; color: var(--k-ink-medium, #a8988a);
        }
        .k-feedback-type-option:hover { border-color: var(--k-btn-gold, #d8b38c); color: var(--k-text-cream, #f7efe6); }
        .k-feedback-type-option.active { background: var(--k-btn-gold, #d8b38c); border-color: var(--k-btn-gold, #d8b38c); color: var(--k-btn-gold-ink, #38271d); }
        .k-feedback-type-option input { display: none; }

        .k-feedback-severity select {
          width: 100%; padding: var(--k-space-2, 8px) var(--k-space-3, 12px);
          background: var(--k-bg-elevated, #3d2b20); border: 1px solid var(--k-border-subtle, rgba(216,179,140,0.2));
          border-radius: var(--k-radius-md, 8px); color: var(--k-text-cream, #f7efe6);
          font-family: inherit; font-size: var(--k-text-base, 1rem);
        }
        .k-feedback-severity select:focus { outline: 2px solid var(--k-focus-ring, #d8b38c); outline-offset: 2px; }

        .k-feedback-message textarea {
          width: 100%; min-height: 100px; padding: var(--k-space-3, 12px);
          background: var(--k-bg-elevated, #3d2b20); border: 1px solid var(--k-border-subtle, rgba(216,179,140,0.2));
          border-radius: var(--k-radius-md, 8px); color: var(--k-text-cream, #f7efe6);
          font-family: inherit; font-size: var(--k-text-base, 1rem); line-height: 1.5; resize: vertical;
        }
        .k-feedback-message textarea:focus { outline: 2px solid var(--k-focus-ring, #d8b38c); outline-offset: 2px; }
        .k-feedback-hint { font-size: var(--k-text-xs, 0.75rem); color: var(--k-ink-muted, #887766); margin-top: var(--k-space-1, 4px); }

        .k-feedback-actions { display: flex; justify-content: flex-end; gap: var(--k-space-3, 12px); margin-top: var(--k-space-2, 8px); }

        .k-feedback-footer { padding: var(--k-space-3, 12px) var(--k-space-4, 16px); font-size: var(--k-text-sm, 0.875rem); color: var(--k-ink-medium, #a8988a); text-align: center; border-top: 1px solid var(--k-border-subtle, rgba(216,179,140,0.1)); }
        .k-feedback-footer a { color: var(--k-btn-gold, #d8b38c); text-decoration: none; }
        .k-feedback-footer a:hover { text-decoration: underline; }
      `}</style>
    </>
  );
}