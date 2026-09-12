# Política de Privacidad — KRUMM

**Versión:** 1.0
**Fecha de entrada en vigor:** 2026-09-12
**Responsable:** KRUMM SpA (RUT 77.XXX.XXX-X), Av. Apoquindo 4501, Of. 901, Las Condes, Santiago, Chile
**Delegado de Protección de Datos (DPO):** privacy@krumm.cl

---

## 1. ¿Quién es el responsable del tratamiento?

KRUMM SpA ("KRUMM", "nosotros", "nuestro") es el responsable del tratamiento de los datos personales que se recogen a través de la plataforma web accesible en `krumm.cl` y subdominios asociados (en adelante, "la Plataforma").

Puede contactar a nuestro Delegado de Protección de Datos (DPO) en: **privacy@krumm.cl**

---

## 2. ¿Qué datos tratamos y con qué finalidad?

### 2.1 Datos de Empresas / Reclutadores

| Categoría | Datos | Finalidad | Base legal |
|-----------|-------|-----------|------------|
| Cuenta | Email, nombre, empresa, rol, hash contraseña | Autenticación, acceso a dashboard, gestión de invitaciones | Contrato (Términos) / Interés legítimo |
| Procesos | Configuración de evaluación, roles, baterías seleccionadas | Prestación del servicio | Contrato |
| Invitaciones creadas | Email del candidato (masked en UI), token, expiración, estado | Gestión del flujo de invitación | Contrato / Consentimiento |
| Reportes accedidos | Logs de acceso, exports descargados (CSV/MD) | Auditoría, trazabilidad, seguridad | Interés legítimo / Obligación legal |

**Nota:** Nunca almacenamos contraseñas en texto plano (bcrypt/Argon2 vía Cognito). El email del candidato se muestra enmascarado (`ab***@ejemplo.com`) en la UI admin.

### 2.2 Datos de Candidatos

| Categoría | Datos | Finalidad | Base legal |
|-----------|-------|-----------|------------|
| Invitación | Email (para envío), token único | Entregar invitación, validar acceso | Consentimiento explícito / Contrato (mandato empresa) |
| Consentimiento | Timestamp, versión de política aceptada, alcance (cámara sí/no) | Registro de consentimiento informado | Consentimiento (Art. 6.1.a GDPR / Art. 4 Ley 19.628) |
| Telemetría de juego (agregada) | Métricas por constructo: `processingSpeed`, `visuomotorPrecision`, `inhibitoryControl`, `interferenceControl`, `visualSearchEfficiency`, `riskIntelligence`, `spatialPlanning`, `operationalPlanning`, `spatialReasoning`, `proceduralWorkingMemory`, `appliedCommunication` + sub-dimensiones, quality flags, integrity flags | Generar Reporte descriptivo | Consentimiento / Interés legítimo (mejora servicio) |
| Calidad de señal (opcional, solo si cámara activa) | `postureScore`, `blinkRate`, `PERCLOS`, `gazeAOI`, `rPPG_SQI` — **solo agregados, nunca crudos** | Contexto de calidad, nunca inferencia de talento | Consentimiento explícito separado (opt-in granular) |
| Metadatos de sesión | `sessionId`, `battery`, `startedAt`, `completedAt`, `deviceInfo` (UA, viewport), `locale` | Operación, debugging, facturación | Interés legítimo / Contrato |

**Datos que NUNCA recopilamos ni almacenamos:**
- Video, frames, imágenes de la cámara
- Landmarks faciales crudos (468 puntos MediaPipe), blendshapes (52 coeficientes)
- Ventanas temporales crudas, rutas reconstructivas, celdas de cuadrícula
- Muestras de puntero (pointer samples), eventos DOM crudos
- Secuencias acción-por-acción, timestamps de estímulo/respuesta individuales
- Datos biométricos que permitan re-identificación

---

## 3. Gobernanza de los datos (Privacy by Design)

Todos los reportes y exports llevan **etiquetas de gobernanza inmutables**:

| Etiqueta | Significado |
|----------|-------------|
| `humanReviewOnly` | Ninguna decisión automatizada de contratación/filtrado/ranking deriva de este reporte. Requiere revisión humana calificada. |
| `noAutomatedDecision` | Cumple Art. 22 GDPR: no hay decisión basada únicamente en tratamiento automatizado con efectos jurídicos. |
| `descriptive_only` | Métricas son descriptivas, no normativas. No son percentiles, diagnósticos ni puntos de corte. |
| `observationalOnly` | Datos observacionales, no inferenciales sobre rasgos clínicos. |
| `privacySafe` | Solo agregados allowlist; sin PII, sin datos crudos, sin reconstrucción posible. |
| `score: null` para constructos provisionales | Ausencia de señal = desconocida, nunca "bajo desempeño". |

---

## 4. Compartición y destinatarios

| Destinatario | Datos | Salvaguardas |
|--------------|-------|--------------|
| **AWS (us-east-1)** | Hosting, Lambda, DynamoDB, SES, Cognito, CloudFront | DPA AWS + SCC; cifrado en tránsito (TLS 1.2+) y reposo (SSE) |
| **PostHog (analytics opcional)** | Pageviews, eventos de navegación (NO telemetría de juego, NO biométricos) | Solo si consentimiento analytics; IP anonimizada; DPA |
| **Empresas cliente** | Reportes agregados de sus Candidatos (bajo su control) | Contrato B2B + DPA anexo; la Empresa es responsable independiente |
| **Autoridades competentes** | Solo si requerido por ley (orden judicial, regulación) | Mínimo necesario; notificación al afectado si legalmente permitido |

**No vendemos datos. No hacemos publicidad dirigida. No compartimos con data brokers.**

---

## 5. Transferencias internacionales

Nuestro backend se ejecuta en **AWS us-east-1 (Virginia, EE. UU.)**. Para usuarios en EEE/Chile:
- Cláusulas Contractuales Tipo (SCC) 2021/914 con AWS y subprocessors.
- Evaluación de transferencia (Schrems II) documentada en DPIA.
- Derecho a solicitar copia de las SCC: privacy@krumm.cl

---

## 6. Retención y supresión

| Dato | Retención | Supresión |
|------|-----------|-----------|
| Sesiones en DynamoDB (payload agregado) | 30 días (TTL automático `expiresAt`) | Auto-purga + entrada en audit_log |
| Audit log (inmutable, append-only) | 13 meses (requisito auditoría) | Auto-purga tras 13 meses |
| Invitaciones (tabla `invitations`) | Hasta expiración (máx 30 días) o uso | Auto-purga TTL |
| Cuenta Empresa / logs acceso | Mientras la cuenta esté activa + 2 años tras cierre | A petición o cierre cuenta |
| Backups (PITR DynamoDB, S3 versioning) | 35 días (PITR) / indefinido (S3) | Según política de retención de backups |

**Derecho al olvido / supresión (Art. 17 GDPR / Art. 11 Ley 19.628):**
- Candidato: solicitud a privacy@krumm.cl → supresión en **<24 h** (runbook `scripts/data-deletion-request.sh` probado).
- Empresa: cierre de cuenta → supresión en 30 días (salvo obligación legal).

---

## 7. Seguridad técnica y organizativa

- **Cifrado:** TLS 1.2+ en tránsito; AES-256 en reposo (DynamoDB SSE, S3 SSE, Lambda env vars).
- **Autenticación:** Cognito User Pool (MFA opcional, rotación de tokens, rate limiting).
- **API:** API Gateway HTTP + JWT authorizer + usage plans (10 req/min/IP) + WAF managed rules.
- **Frontend:** CSP estricta (`script-src 'self'`, `connect-src` allowlist, `frame-ancestors 'none'`), HSTS, XFO, Referrer-Policy, COOP/COEP.
- **CI/CD:** GitHub Actions OIDC (sin claves estáticas), gitleaks, npm audit, tests privacidad obligatorios en PR.
- **Acceso interno:** Mínimo privilegio (IAM roles scoped), MFA obligatorio, logs CloudTrail.
- **Pen testing:** OWASP ZAP baseline en cada release candidate; 0 critical/high antes de deploy.

---

## 8. Derechos de los interesados

Como titular de datos, usted tiene derecho a:

1. **Acceso** — Confirmación de tratamiento + copia de datos (Art. 15 GDPR / Art. 11 Ley 19.628).
2. **Rectificación** — Corrección de datos inexactos/incompletos.
3. **Supresión** — "Derecho al olvido" (Art. 17 GDPR), salvo excepción legal.
4. **Limitación** — Restringir tratamiento mientras se verifica impugnación.
5. **Portabilidad** — Recibir datos en formato estructurado, de uso común, legible por máquina.
6. **Oposición** — Oponerse a tratamiento por interés legítimo (incluye profiling).
7. **Retirar consentimiento** — En cualquier momento, sin afectar licitud previa.
8. **Reclamación** — Ante Autoridad de Control (Chile: Tribunal de Defensa de la Libre Competencia / futuro PDP; UE: AEPD nacional).

**Ejercicio de derechos:** email a **privacy@krumm.cl** con asunto "Derechos ARCO/GDPR" + identificación. Respuesta en **≤30 días** (GDPR) / **≤2 días hábiles** (Ley 19.628 Art. 14).

---

## 9. Cookies y tecnologías similares

| Cookie | Tipo | Duración | Finalidad |
|--------|------|----------|-----------|
| `session` (Cognito) | Esencial | Sesión | Autenticación Empresa |
| `language` | Esencial | 1 año | Preferencia ES/EN |
| `cookie_consent` | Esencial | 1 año | Recordar decisión banner |
| `posthog` (opt-in) | Analytics | 1 año | Funnel producto (páginas, clicks) — **NUNCA** en `/postulaciones/*` |

**Banner cookie:** Al primer acceso, banner con botones "Aceptar analytics" / "Solo esenciales" + enlace a esta política. Preferencia guardada en `cookie_consent`.

---

## 10. Evaluación de Impacto en Protección de Datos (DPIA)

KRUMM ha realizado una **DPIA** (Data Protection Impact Assessment) conforme al Art. 35 GDPR y mejores prácticas, dado que:
- Tratamiento a gran escala de datos de comportamiento (telemetría agregada).
- Uso innovador de señales biométricas opcionales (cámara) como contexto de calidad.
- Decisiones que afectan significativamente a personas (procesos de selección).

La DPIA está disponible a petición del DPO o Autoridad de Control. Conclusión: **riesgo residual medio-bajo** tras medidas implementadas (gobernanza `humanReviewOnly`, agregados only, minimización, cifrado, auditoría).

---

## 11. Menores de edad

La Plataforma **no está dirigida a menores de 18 años**. No recopilamos intencionadamente datos de menores. Si detectamos datos de menor, los suprimimos inmediatamente.

---

## 12. Cambios a esta Política

Cualquier cambio material se notificará:
- Email a usuarios registrados (Empresas + Candidatos con email conocido).
- Banner en la Plataforma 30 días antes de entrada en vigor.
- Historial de versiones en esta página.

---

## 13. Contacto

**KRUMM SpA — Delegado de Protección de Datos**  
📧 privacy@krumm.cl  
📧 legal@krumm.cl  
📍 Av. Apoquindo 4501, Of. 901, Las Condes, Santiago, Chile

**Autoridad de control (Chile):** Tribunal de Defensa de la Libre Competencia / futura Agencia de Protección de Datos Personales  
**Autoridad de control (UE):** AEPD (España) u otra autoridad nacional competente