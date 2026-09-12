# Error Tracking — Sentry Integration (Privacy-Safe)

**Versión:** 1.0
**Fecha:** 2026-09-12
**Estado:** Diseño (implementación en Fase G.2)

---

## 1. Principios de Privacidad (No Negociables)

| Regla | Implementación |
|-------|----------------|
| **NUNCA** payloads de sesión en breadcrumbs | Sanitizer estricto: solo `route`, `gameId`, `battery`, `errorCode` |
| **NUNCA** datos biométricos / telemetría cruda | `beforeSend` filtra cualquier campo que matchee `FORBIDDEN_KEYS` |
| **NUNCA** PII (emails, nombres, tokens) | Scrubber automático en `Sentry.init` |
| **SIEMPRE** consentimiento analytics (PostHog) ≠ error tracking | Sentry = esencial (no requiere opt-in), pero sin datos sensibles |
| **Retención** | 30 días (plan free) / configurado a 90 días máx |

---

## 2. Arquitectura

```javascript
// main.jsx (entry point)
import * as Sentry from "@sentry/react";
import { browserTracingIntegration } from "@sentry/browser";

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE, // 'development' | 'staging' | 'production'
    release: import.meta.env.VITE_APP_VERSION, // ej. 'v1.1.0'
    
    // Performance tracing (sampleado)
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    
    // Privacy: scrub sensitive data
    beforeSend(event, hint) {
      // 1. Remove any session payload from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(crumb => {
          if (crumb.category === 'session' || crumb.data?.sessionPayload) {
            return { ...crumb, data: { ...crumb.data, sessionPayload: '[REDACTED]' } };
          }
          // 2. Scrub FORBIDDEN_KEYS from any breadcrumb data
          if (crumb.data && typeof crumb.data === 'object') {
            return { ...crumb, data: scrubForbiddenKeys(crumb.data) };
          }
          return crumb;
        });
      }
      
      // 3. Scrub exception contexts (react component props, etc.)
      if (event.exception?.values) {
        event.exception.values = event.exception.values.map(exc => ({
          ...exc,
          stacktrace: exc.stacktrace?.frames?.map(frame => ({
            ...frame,
            vars: frame.vars ? scrubForbiddenKeys(frame.vars) : undefined,
          })),
        }));
      }
      
      // 4. Remove user PII (Sentry user context set separately if needed)
      if (event.user) {
        event.user = { id: event.user.id }; // solo id hash, no email/name
      }
      
      return event;
    },
    
    // Don't capture errors in fixture/test mode
    ignoreErrors: [
      /ResizeObserver loop limit exceeded/,
      /Non-Error promise rejection captured/,
      /fixture mode/,
    ],
    
    integrations: [
      browserTracingIntegration(),
      Sentry.reactRouterV6BrowserTracingIntegration(), // si usas react-router v6
    ],
  });
  
  // Set user context (hash only, no PII) after login
  // Sentry.setUser({ id: hashCompanyId(companyId) });
}

// Utility: scrub FORBIDDEN_KEYS recursively
const FORBIDDEN_KEYS = [
  // Biométricos crudos
  'landmarks', 'blendshapes', 'faceMesh', 'faceLandmarker', 'poseLandmarker',
  'rawFrames', 'video', 'image', 'canvas', 'screenshot',
  // Telemetría cruda
  'stimuli', 'responses', 'rawEvents', 'actionSequence', 'pointerSamples',
  'domEvents', 'keypoints', 'windows', 'cells', 'reconstructedPath',
  // PII
  'email', 'name', 'token', 'invitationId', 'sessionId', 'candidateId',
  'companyId', 'ip', 'fingerprint',
  // Gobernanza
  'humanReviewOnly', 'noAutomatedDecision', 'descriptive_only', // estos SÍ pueden ir, pero por consistencia
];

function scrubForbiddenKeys(obj, depth = 0) {
  if (depth > 10 || !obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(v => scrubForbiddenKeys(v, depth + 1));
  
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    const isForbidden = FORBIDDEN_KEYS.some(fk => lowerKey.includes(fk.toLowerCase()));
    if (isForbidden) {
      out[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      out[key] = scrubForbiddenKeys(value, depth + 1);
    } else {
      out[key] = value;
    }
  }
  return out;
}
```

---

## 3. ErrorBoundary para React (Wrapper de Juego)

```jsx
// src/components/ErrorBoundary.jsx
import { Component } from 'react';
import * as Sentry from '@sentry/react';

class ErrorBoundary extends Component {
  state = { hasError: false, error: null, errorInfo: null };
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    
    // Report to Sentry with game context (NO session payload)
    if (import.meta.env.VITE_SENTRY_DSN) {
      Sentry.withScope(scope => {
        scope.setTag('error_boundary', 'true');
        scope.setTag('gameId', this.props.gameId || 'unknown');
        scope.setTag('battery', this.props.battery || 'unknown');
        scope.setExtra('componentStack', errorInfo.componentStack);
        // NO scope.setExtra('sessionPayload', ...) — NUNCA
        Sentry.captureException(error);
      });
    }
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="k-error-boundary" role="alert">
          <h2>Algo salió mal en el juego</h2>
          <p>Hemos registrado el error automáticamente. Puedes:</p>
          <ul>
            <li><button onClick={() => window.location.reload()}>Recargar la página</button></li>
            <li><a href="/ayuda" target="_blank">Contactar soporte</a></li>
          </ul>
          <details style={{marginTop: '1rem', fontSize: '0.8rem', color: 'var(--k-ink-medium)'}}>
            <summary>Detalles técnicos (para soporte)</summary>
            <pre>{this.state.error?.message}</pre>
            <pre>{this.state.errorInfo?.componentStack}</pre>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
```

---

## 4. Uso en PostulationGameStage

```jsx
// PostulationGameStage.jsx (simplificado)
import ErrorBoundary from './components/ErrorBoundary';

function PostulationGameStage({ gameId, battery, ...props }) {
  return (
    <ErrorBoundary gameId={gameId} battery={battery}>
      {/* Game content */}
    </ErrorBoundary>
  );
}
```

---

## 5. Configuración por Entorno

| Variable | Development | Staging | Production |
|----------|-------------|---------|------------|
| `VITE_SENTRY_DSN` | (opcional) | ✅ Requerido | ✅ Requerido |
| `tracesSampleRate` | 1.0 | 0.2 | 0.1 |
| `environment` | 'development' | 'staging' | 'production' |
| Alertas | Sin alertas | Discord `krumm-auto` | Discord `hermes-alerts` + email |

---

## 6. Alertas Configuradas (Sentry → Discord)

| Alerta | Condición | Canal | Severidad |
|--------|-----------|-------|-----------|
| **Error spike** | >10 errors/5min en `/postulaciones/*` | `hermes-alerts` | Critical |
| **Game crash rate** | >5% sesiones con error en mismo juego | `krumm-auto` | High |
| **Privacy validation error** | Cualquier `privacy_validation_failed` | `hermes-alerts` | Critical |
| **Sentry own errors** | Sentry SDK errors | `krumm-auto` | Medium |

---

## 7. Testing

```bash
# Test local: trigger error en desarrollo
# En consola del navegador:
throw new Error('TEST_SENTRY_INTEGRATION');

# Verificar en Sentry UI:
# - Evento aparece con tags: gameId, battery, error_boundary
# - NO hay sessionPayload, NO landmarks, NO email
# - Breadcrumb trail muestra solo rutas y gameId
```

---

## 8. Decisión: Sentry Cloud vs GlitchTip (Self-hosted Pi)

| Factor | Sentry Cloud (Free) | GlitchTip en Pi |
|--------|---------------------|-----------------|
| **Setup** | 5 min (DSN) | 2-4 h (Docker, PostgreSQL, Redis, nginx, SSL) |
| **Retención** | 30 días / 5k events/mes | Ilimitado (disco Pi) |
| **Costo** | $0 (free tier) | $0 (hardware ya existe) + mantenimiento |
| **Confiabilidad** | 99.9% SLA | Depende Pi (uptime, backups, red) |
| **Privacidad** | Datos salen a EE.UU. | Datos en Pi (Chile) — mejor soberanía |
| **Mantenimiento** | Cero | Updates, backups, monitoring propio |

**Recomendación:** **Sentry Cloud Free Tier** para pre-beta/beta (rápido, confiable, suficiente). Migrar a GlitchTip self-hosted post-Series A si soberanía de datos es requisito enterprise.

---

## 9. Checklist Implementación (Fase G.2)

- [ ] `npm install @sentry/react @sentry/browser`
- [ ] `VITE_SENTRY_DSN` en `.env.staging` + `.env.production` (GitHub Actions secrets)
- [ ] `ErrorBoundary.jsx` creado + tests
- [ ] Integración en `main.jsx` + `PostulationGameStage.jsx` + `CompanyShell.jsx`
- [ ] `beforeSend` + `scrubForbiddenKeys` probado (unit test + manual)
- [ ] Alertas Discord configuradas (Sentry → Webhook `hermes-alerts` / `krumm-auto`)
- [ ] Smoke: error intencional en stage → aparece en Sentry → alerta Discord
- [ ] Documentación en `docs/security/error-tracking.md` (este archivo)