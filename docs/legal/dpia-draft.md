# DPIA Borrador — KRUMM /postulaciones-demo

**Fecha:** 2026-09-03  
**Versión:** v1.0  
**Estado:** Borrador (firma DPO/legal en paralelo, Fase M5)  
**Producto:** Postulación Demo — batería original + cámara opcional

## 1. Descripción del Tratamiento

| Campo | Valor |
|-------|-------|
| **Responsable** | KRUMM (carlos.saldivia@krumm.cl) |
| **Finalidad** | Evaluación de talento a través de juegos gamificados + telemetría facial opcional |
| **Tipo de datos** | Datos biométricos faciales (AUs, gaze, head pose) — categoría especial Art. 9 GDPR; procesamiento sobre consentimiento explícito |
| **Fuente** | Navegador del postulante (dispositivo propio) |
| **Almacenamiento** | DynamoDB (sesión + audit_log), TTL 30 días; ningún video/frame crudo sale del browser |

## 2. Evaluación de Riesgo

| Riesgo | Nivel | Descripción | Medida de Mitigación |
|--------|-------|-------------|----------------------|
| **R1: Exposición de datos biométricos** | Alto (mitigado) | Intercepción de transmisión en red | Todas las señales se agregan localmente; solo se POSTea JSON agregado con `privacyValidation.ok === true` |
| **R2: Uso secundario sin consentimiento** | Alto (mitigado) | Usar AUs para inferencia de talento no validada | `humanReviewOnly`; scores 0–100 con caveat "Demo provisional · no comparables"; sin decisiones automáticas |
| **R3: Retención indefinida** | Medio | Datos persisten >30d en DynamoDB | TTL automático + EventBridge Scheduler job de eliminación bajo solicitud <24h |
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

- **Acceso:** Solicitar export JSON de propia sesión vía `/postulaciones-demo/hr` (read-only).
- **Rectificación:** Solicitar eliminación sesión → admin borra de DynamoDB + audit_log (TTL + job <24h).
- **Oposición:** Descartar cámara en cualquier momento; session continúa sin telemetría facial.
- **Limitación:** Scores 0–100 son *provisionales* y no implican validez psicométrica ni decisiones automáticas.

## 7. Hallazgos y Caveats

- Cámara = calidad/contexto only; no es eje de scoring de talento.
- `privacyValidation.ok === true` es guarda server-side; si falla, payload se rechaza 422.
- Aggregate-only: ningún dato individual identificable en el reporte final.
- Scores 0–100 carecen de baremos comparativos; label "DEMO PROVISIONAL" visible en reporte.
- No ranking, no recomendación, no decisión automática de contratación.

## 8. Próximos Pasos

- Firma DPO/legal en `docs/legal/privacy-policy-final.md`.
- Actualizar `SECURITY.md` con hallazgos DPIA.
- M5 gate: ZAP baseline + CI scan-forbidden-keys + workflow GitHub Actions.

---

*Este DPIA es un borrador para revisión interna DPO. Versión final después de firma en `docs/legal/`.*