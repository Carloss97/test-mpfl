// G.2: fallback de ErrorBoundary (estilo marca, tokens --k-*).
// El ErrorBoundary de @sentry/react inyecta {error, eventID,
// resetErrorBoundary} como props del fallback.
export default function SentryFallback({ resetErrorBoundary }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'var(--k-bg, #f7f2ea)',
        color: 'var(--k-ink, #2c241b)',
        fontFamily: 'var(--k-font-sans, sans-serif)',
        padding: '24px',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: '440px' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 8px' }}>
          Algo salió mal
        </h1>
        <p style={{ opacity: 0.7, fontSize: '0.95rem', margin: '0 0 24px', lineHeight: 1.5 }}>
          El error quedó registrado sin tus datos de sesión. Recarga la
          página para continuar.
        </p>
        <button
          type="button"
          onClick={resetErrorBoundary}
          style={{
            padding: '12px 28px',
            borderRadius: '999px',
            border: 'none',
            background: 'var(--k-btn-gold, #d8b38c)',
            color: 'var(--k-btn-gold-ink, #38271d)',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Recargar
        </button>
      </div>
    </div>
  );
}
