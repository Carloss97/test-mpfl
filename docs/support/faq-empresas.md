# Preguntas Frecuentes — Empresas / Reclutadores

**Última actualización:** 2026-09-12

---

## 🏢 Primeros Pasos

### ¿Cómo creo mi cuenta de empresa?
Actualmente en **beta cerrada**. Contacta a `soporte@krumm.cl` o `carlos@krumm.cl` para solicitar acceso. Te crearemos la cuenta en Cognito y recibirás credenciales temporales por email.

### ¿Cómo accedo al dashboard?
1. Ve a `krumm.cl` → "Iniciar sesión" (empresa) o directo a `/empresa/acceso`.
2. Ingresa email + contraseña (Cognito, MFA opcional).
3. Accedes a `/empresa` (dashboard KPIs + tabla de procesos).

### ¿Qué veo en el dashboard?
- **KPIs reales:** Procesos activos, Candidatos evaluados, Score medio ponderado, Recomendados.
- **Tabla de procesos:** Búsqueda + filtros (Departamento, Ubicación, Estado derivado, Período 7d/30d).
- **CTA "Nueva solicitud":** Crear proceso vía upload o diseño guiado.

---

## 📋 Gestión de Procesos

### ¿Cómo creo un proceso de evaluación?
Dos vías en `/empresa/nueva-solicitud`:

1. **QUICK — Subir perfil (PDF/DOCX/TXT ≤10 MB):** Subes descripción del cargo; KRUMM extrae metadatos (no lee contenido con NLP aún) y crea proceso *draft*.
2. **RECOMMENDED — Diseñar con KRUMM:** Formulario guiado 3 pasos (Cargo/Área/Ubicación → Modalidad/Perfil → Resumen) → crea proceso *draft* con configuración completa.

El proceso *draft* aparece en `/empresa/procesos` y dashboard. Sin candidatos hasta que envíes invitaciones.

### ¿Cómo invito candidatos?
En `/empresa/proceso/:id` → "Ver candidatos" → **"Crear invitación"**:
- Email del candidato.
- TTL (horas, default 72, máx 30 días).
- Uso único (default sí).
- La Plataforma envía email vía SES con link único: `krumm.cl/candidato/acceso?invite=<token>`.

### ¿Puedo revocar una invitación?
Sí. En la lista de invitaciones del proceso → "Revocar". El token deja de funcionar inmediatamente (estado `revoked`).

### ¿Cuántos candidatos por proceso?
Sin límite técnico en el Piloto. Recomendamos **≤50 por proceso** para gestión humana de reportes.

---

## 📊 Reportes y Decisiones

### ¿Qué contiene el reporte de un candidato?
Acceso en `/empresa/proceso/:id/candidatos/:sessionId`:

| Sección | Contenido |
|---------|-----------|
| **Resumen ejecutivo** | Battery, duración, quality flags, governance badges |
| **8–10 constructos** | Métrica descriptiva (0–100), sub-dimensiones, caveats, `humanReviewOnly` |
| **Detalle por juego** | Métricas clave, integrity flags, timestamp |
| **Calidad de señal** | `postureScore`, `blinkRate`, `cameraActive` (si opt-in) |
| **Export** | Botón "Descargar CSV" (proceso) + "Descargar MD" (candidato individual) |

### ⚠️ REGLAS DE ORO — LEER ANTES DE USAR

| Regla | Explicación |
|-------|-------------|
| **`humanReviewOnly`** | **Ninguna decisión automatizada** de contratación, filtrado o ranking basada *solo* en el Reporte. Requiere revisión humana calificada. |
| **`descriptive_only`** | Scores 0–100 **no son percentiles, normas, diagnósticos ni puntos de corte**. Son descriptivos internos. |
| **`score: null`** | Constructos provisionales (`proceduralWorkingMemory`, `appliedCommunication`, `leadership`, `adaptability`) muestran `null` = "sin señal suficiente", **nunca 0 ni 50**. |
| **No discriminación** | No usar reportes para filtrar por edad, género, origen, discapacidad u otras características protegidas. |
| **Contexto de cámara** | Si el candidato activó cámara: `postureScore`/`blinkRate` son **contexto de calidad**, **nunca** inferencia de estrés, fatiga, sinceridad o personalidad. |

### ¿Puedo exportar los datos?
- **CSV del proceso** (UTF-8 BOM): una fila por candidato, columnas por constructo + metadatos. Botón en `/empresa/proceso/:id`.
- **MD por candidato**: reporte narrativo completo en Markdown. Botón en detalle de candidato.
- Ambos incluyen watermarks `humanReviewOnly` + `descriptive_only` + timestamp.

### ¿Hay ranking automático?
**No.** La tabla de candidatos en `/empresa/proceso/:id` muestra **fit bands** calibradas contra el motor real (ej. 89/87/85/82/80/78) pero **sin ordenamiento por score**. El orden es cronológico (más reciente arriba). La Empresa decide.

---

## 🔒 Seguridad y Privacidad

### ¿Dónde se guardan los datos?
- **AWS us-east-1** (Virginia, EE. UU.).
- DynamoDB (cifrado AES-256, PITR 35 días).
- S3 + CloudFront (assets estáticos, CSP estricta).
- SES (emails transaccionales).
- Cognito (auth, MFA, tokens rotativos).

### ¿Cumplen GDPR / Ley 19.628?
**Sí.**
- DPIA realizada y documentada.
- DPO: `privacy@krumm.cl`.
- DPA (Anexo en contrato piloto) firmado antes de invitar candidatos.
- Derechos ARCO/GDPR ejercibles en <24 h (`privacy@krumm.cl`).
- Transferencias: SCC 2021/914 con AWS.

### ¿Quién es Responsable / Encargado?
- **Empresa = Responsable** (decide finalidades: evaluar sus candidatos).
- **KRUMM = Encargado** (trata por cuenta de la Empresa: telemetría, reportes).
- Ver Anexo DPA en `docs/legal/piloto-b2b-contrato-template.md`.

### ¿Qué pasa si hay una brecha de seguridad?
KRUMM notifica a la Empresa **<72 h** tras detección (Art. 33 GDPR), con naturaleza, volumen, consecuencias y medidas. Runbook de incidentes probado.

---

## 💰 Costes y Facturación

### ¿Cuánto cuesta el Piloto?
**Gratuito (coste cero)** a cambio de:
- Feedback estructurado (encuestas + reuniones quincenales).
- Testimonio escrito anonimizado (con autorización) para material comercial.
- Caso de uso anonimizado.

### ¿Y después del Piloto?
Modelos en definición:
- **Por evaluación:** ~$[XX] USD / evaluación completa (batería 5 o 7 juegos).
- **Suscripción anual:** ~$[YY] USD/mes (evaluaciones ilimitadas, hasta N usuarios empresa).
- Negociación caso a caso.

---

## 🛠️ Problemas Técnicos

| Problema | Solución |
|----------|----------|
| No recibo email de invitación (candidato) | Revisar spam/promociones. Reenviar desde `/empresa/proceso/:id` → "Reenviar". Verificar email correcto. |
| Dashboard no carga datos / KPIs a 0 | Verificar que hay sesiones completadas (no solo invitaciones enviadas). Modo demo = datos sintéticos; modo real = requiere `VITE_KRUMM_API_BASE` en build prod. |
| Export CSV con caracteres raros | Abrir en Excel → Datos → Desde texto/CSV → Codificación: UTF-8 (BOM). |
| "Acceso denegado" al ver reporte | Verificar que el `sessionId` pertenece a un proceso tuyo (aislamiento multi-tenant). |
| Candidato dice que link expira | Tokens duran 72 h por defecto. Crear nueva invitación. |

---

## 📞 Contacto y Soporte

| Canal | Uso | SLA |
|-------|-----|-----|
| `soporte@krumm.cl` | Incidencias, dudas técnicas, bugs | ≤24 h hábiles |
| `privacy@krumm.cl` | Derechos ARCO/GDPR, brechas, DPIA | ≤30 días (GDPR) / ≤2 días (Ley 19.628) |
| `legal@krumm.cl` | Contratos, DPA, términos | ≤48 h |
| Discord (opcional) | Canal `#krumm-auto` para alertas operativas | Tiempo real (best effort) |
| `krumm.cl` → Footer | Enlaces a Ayuda / Privacidad / Términos | — |

---

## 📎 Recursos

- [Contrato Piloto B2B (template)](/legal/piloto-b2b-contrato-template.md)
- [Política de Privacidad](/legal/privacidad)
- [Términos de Servicio](/legal/terminos)
- [Guía rápida Reclutador (PDF)](/assets/guia-reclutador.pdf) *(pendiente)*
- [Video demo 3 min](/assets/demo-video.mp4) *(pendiente)*