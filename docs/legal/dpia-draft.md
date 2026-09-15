# DPIA Borrador — KRUMM /postulaciones

**Fecha:** 2026-09-03  
**Versión:** v1.0  
**Estado:** Borrador archivado; requiere revisión de DPO y abogada antes de presentarse como evaluación jurídica.
**Producto:** Flujo de postulaciones — batería controlada + cámara opcional

## 1. Descripción del Tratamiento

| Campo | Valor |
|-------|-------|
| **Responsable** | KRUMM SpA (canal de privacidad: privacy@krumm.cl) |
| **Finalidad** | Evaluación descriptiva de tareas gamificadas + señales opcionales de calidad |
| **Tipo de datos** | Indicadores agregados de calidad de captura (si la cámara está activa); no se persisten video, frames ni landmarks crudos |
| **Fuente** | Navegador del postulante (dispositivo propio) |
| **Almacenamiento** | DynamoDB para sesiones agregadas e invitaciones con TTL; el audit_log es append-only y actualmente no configura TTL |

## 2. Evaluación de Riesgo

| Riesgo | Nivel | Descripción | Medida de Mitigación |
|--------|-------|-------------|----------------------|
| **R1: Exposición de señales de cámara** | Alto (mitigado) | Intercepción de transmisión en red | El procesamiento ocurre localmente; solo se POSTea JSON agregado con `privacyValidation.ok === true` |
| **R2: Uso secundario sin consentimiento** | Alto (mitigado) | Reutilizar señales de calidad para inferencias no validadas | `humanReviewOnly`; scores 0–100 con caveat "Demo provisional · no comparables"; sin decisiones automáticas |
| **R3: Retención indefinida** | Medio | Una retención mayor puede ocurrir en respaldos o registros de auditoría | TTL de sesiones/invitaciones; revisión y tramitación administrativa de solicitudes de supresión |
| **R4: Fuga de keys prohibidas** | Medio | `video`, `landmarks`, `rawFrames` en payload | `ASSESSMENT_FORBIDDEN_KEYS` server-side en `validateSessionPayload`; bloques 422 si se detectan |
| **R5: Consentimiento no informado** | Bajo | Usuario no consciente de alcance | Consentimiento explícito en pantalla separada antes de cámara; copy clara en `postulationDemoCopy.js` |

## 3. Medidas de Seguridad

| Medida | Descripción |
|--------|-------------|
| **En tránsito** | TLS 1.2+ en todas las comunicaciones (API Gateway + S3 + CloudFront) |
| **En reposo** | DynamoDB SSE (AES-256); bucket S3 SSE (AES-256) |
| **Acceso mínimo privilegio** | Lambda role: solo `dynamodb:GetItem/ PutItem/ DeleteItem/ Query` sobre 2 tablas |
| **Validación server-side** | `validateSessionPayload` revisa `FORBIDDEN_KEYS` + `validateFinalAssessmentPayload` + `validateAssessmentSessionPrivacy` |
| **Sin datos crudos** | Nunca se transmiten `video`, `landmarks`, `rawFrames`, `screenshot`, `rawVideo` al backend |
| **Audit log** | Cada PUT/DELETE registra `who/when/what` en tabla audit_log con GSI sessionId-index |

## 4. Consentimiento

- **Pantalla explícita** antes de activar cámara (Fase M3).
- **Texto** de `postulationDemoCopy.js` principia: *"La cámara es opcional. Puedes continuar sin activarla"*.
- **Retiro** en cualquier momento: desactivar cámara → session continúa con caveat `low_face_presence`.
- **Registro** de estado de consentimiento en session metadata (`consent: { given: true/false, at: ISO timestamp }`).

## 5. Transferencias Internacionales

- Ninguna. Todos los datos se procesan en dispositivo (browser) y en AWS us-east-1 (misma región). No hay transferencia a terceros países.

## 6. Derechos del Interesado

- **Acceso:** Solicitar información de la propia sesión mediante el canal de privacidad; no existe una ruta pública de autoservicio.
- **Rectificación:** Solicitar corrección o supresión por el canal de privacidad; la operación administrativa debe preservar el registro de auditoría cuando corresponda.
- **Oposición:** Descartar cámara en cualquier momento; session continúa sin telemetría facial.
- **Limitación:** Scores 0–100 son *provisionales* y no implican validez psicométrica ni decisiones automáticas.

## 7. Hallazgos y Caveats

- Cámara = calidad/contexto only; no es eje de scoring de talento.
- `privacyValidation.ok === true` es guarda server-side; si falla, payload se rechaza 422.
- Aggregate-only: ningún dato individual identificable en el reporte final.
- Scores 0–100 carecen de baremos comparativos; label "DEMO PROVISIONAL" visible en reporte.
- No ranking, no recomendación, no decisión automática de contratación.

## 8. Próximos Pasos

- Revisión y aprobación de DPO/abogada para `docs/legal/politica-privacidad.md` y este borrador; no afirmar revisión jurídica hasta ese gate humano.
- Actualizar `SECURITY.md` con hallazgos DPIA.
- M5 gate: ZAP baseline + CI scan-forbidden-keys + workflow GitHub Actions.

---

*Este DPIA es un borrador para revisión interna DPO. Versión final después de firma en `docs/legal/`.*