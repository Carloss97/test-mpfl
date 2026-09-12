# Contrato Marco de Prueba Piloto B2B — KRUMM

**Versión:** 1.0
**Fecha:** 2026-09-12
**Partes:** KRUMM SpA ("KRUMM") y **[EMPRESA CLIENTE]** ("la Empresa" / "el Cliente")

---

## 1. Objeto

KRUMM pone a disposición de la Empresa su plataforma de evaluación de talento ("la Plataforma") para la realización de un **programa piloto controlado** ("el Piloto") consistente en la evaluación de hasta **[N]** candidatos a puestos de **[ROL(ES)]** durante **[DURACIÓN, ej. 8 semanas]**, bajo los términos del presente Contrato y sus Anexos.

---

## 2. Alcance del Piloto

| Elemento | Detalle |
|----------|---------|
| **Candidatos máximos** | [N] (ej. 50) |
| **Duración** | [Fecha inicio] – [Fecha fin] (ej. 8 semanas) |
| **Batería** | `stable_dg` (5 juegos, ~14–16 min) o `original` (7 juegos, ~26–32 min) — a definir por la Empresa |
| **Idiomas** | ES / EN (selección por candidato) |
| **Cámara/biometría** | Opcional, opt-in granular por candidato; solo contexto de calidad |
| **Entorno** | Stage (`stage.krumm.cl`) o Prod (`krumm.cl`) — a definir |
| **Soporte** | Email `soporte@krumm.cl` (SLA 24 h hábiles) + canal Discord opcional |

---

## 3. Obligaciones de KRUMM

1. **Disponibilidad:** 99.5% uptime mensual (excluyendo mantenimiento programado avisado 48 h).
2. **Integridad de datos:** Solo agregados allowlist; gobernanza `humanReviewOnly`/`descriptive_only`/`noAutomatedDecision`/`privacySafe` en todos los reportes.
3. **Seguridad:** Cifrado TLS 1.2+/AES-256, CSP, WAF, rate limiting, Cognito MFA, PITR DynamoDB 35 días.
4. **Privacidad:** Cumplimiento Ley 19.628 (Chile) + GDPR (si aplica). DPIA realizada. DPO: privacy@krumm.cl.
5. **Soporte:** Respuesta ≤24 h hábiles a incidencias reportadas por la Empresa.
6. **Entregables finales:** Al cierre del Piloto, KRUMM entrega:
   - Dataset anonimizado agregado (CSV) con métricas por constructo por candidato.
   - Informe de uso de la Plataforma (completion rates, tiempo medio, quality flags).
   - Acceso a exports individuales (CSV/MD) para cada candidato evaluado.

---

## 4. Obligaciones de la Empresa

1. **Uso autorizado:** Solo para evaluar candidatos propios a puestos definidos. No reventa, no sublicencia, no ingeniería inversa.
2. **Invitaciones válidas:** Cada Candidato debe recibir invitación única mediante la Plataforma (token expirable, uso único). La Empresa no compartirá tokens públicamente.
3. **Consentimiento del Candidato:** La Empresa asegurará que cada Candidato otorga consentimiento informado, libre y explícito **antes** de iniciar la evaluación (la Plataforma obliga a aceptarlo en pantalla).
4. **Decisiones humanas:** La Empresa **no tomará decisiones automatizadas de contratación, filtrado o ranking** basadas únicamente en los Reportes KRUMM. Toda decisión final requiere revisión humana calificada (`humanReviewOnly`).
5. **Protección de datos:** La Empresa actúa como **Responsable del Tratamiento** independiente de los datos de sus Candidatos. KRUMM es Encargado del Tratamiento (ver Anexo DPA).
6. **No discriminación:** La Empresa no utilizará los Reportes para discriminar por características protegidas (edad, género, origen, discapacidad, etc.).
7. **Feedback:** La Empresa colaborará de buena fe proporcionando feedback cualitativo sobre la Plataforma y los Reportes (encuesta final + reuniones de seguimiento quincenales).

---

## 5. Condiciones Económicas

| Concepto | Valor |
|----------|-------|
| **Coste del Piloto** | **GRATUITO** (coste cero) a cambio de feedback estructurado, testimonio escrito (con autorización) y caso de uso anonimizado para material comercial de KRUMM. |
| **Costes de infraestructura** | Asumidos por KRUMM (AWS free tier + budget $25/mes). |
| **Post-Piloto** | Si la Empresa desea continuar, se negociará contrato comercial (modelo: por evaluación / suscripción anual). Precio de referencia: **$[XX] USD por evaluación completa** o **$[YY] USD/mes** suscripción ilimitada. |

---

## 6. Propiedad Intelectual

- KRUMM conserva **todos los derechos** sobre la Plataforma, juegos, algoritmos, reportes, marca, código, documentación y mejoras derivadas del Piloto.
- La Empresa obtiene **licencia limitada, no exclusiva, intransferible, revocable** para usar los Reportes generados **internamente** durante el Piloto y 12 meses tras su finalización.
- Los datos agregados y anonimizados generados durante el Piloto podrán ser utilizados por KRUMM para mejora de producto e investigación (R-7), sin posibilidad de re-identificación de la Empresa ni de sus Candidatos.

---

## 7. Confidencialidad

Ambas Partes mantendrán estricta confidencialidad sobre:
- Información técnica, comercial, financiera y estratégica de la otra Parte.
- Datos personales de Candidatos (sujetos a Anexo DPA).
- Condiciones económicas y términos de este Contrato.

Excepciones: información pública, desarrollada independientemente, recibida de tercero sin obligación de confidencialidad, o requerida por ley/orden judicial (con notificación previa a la otra Parte).

---

## 8. Protección de Datos — Anexo DPA (Data Processing Agreement)

**Adjunto como Anexo A:** Data Processing Agreement (DPA) conforme Art. 28 GDPR y mejores prácticas internacionales.

Resumen clave del DPA:
- **Responsable:** La Empresa (determina finalidades/medios del tratamiento de sus Candidatos).
- **Encargado:** KRUMM (trata por cuenta de la Empresa: telemetría agregada, reportes, metadatos).
- **Sub-encargados autorizados:** AWS (infraestructura), PostHog (analytics opcional, solo con consentimiento).
- **Medidas técnicas:** Cifrado, PITR, acceso mínimo privilegio, logs inmutables, DR testado.
- **Derechos del interesado:** KRUMM asiste a la Empresa en ejercicio de derechos ARCO/GDPR en <24 h.
- **Supresión/retorno:** A fin del Piloto o a petición, KRUMM suprime o retorna datos en <24 h (runbook probado).
- **Notificación de brecha:** KRUMM notificará a la Empresa en <72 h tras detección de brecha de seguridad.

---

## 9. Limitación de Responsabilidad

- La Plataforma se proporciona **"tal cual"** ("as is") para fines de **piloto/validación**. No hay garantía de validez psicométrica normativa (pendiente estudio R-7 con N=200).
- Responsabilidad máxima agregada de KRUMM: **$1,000 USD** (o monto pagado si hubiera coste).
- Exclusión de daños indirectos, lucro cesante, pérdida de datos, daño reputacional.
- La Empresa indemniza a KRUMM por reclamos de terceros derivados de uso indebido de la Plataforma o incumplimiento de sus obligaciones (consentimiento, decisiones automatizadas, discriminación).

---

## 10. Duración y Terminación

- **Vigencia:** Desde la firma hasta **[Fecha fin Piloto]** o hasta que se evalúen **[N]** candidatos, lo primero que ocurra.
- **Terminación anticipada:** Cualquier Parte con **15 días de aviso escrito**.
- **Terminación por causa:** Incumplimiento material no subsanado en 10 días tras notificación.
- **Efectos de terminación:**
  - Acceso a la Plataforma deshabilitado.
  - Datos personales: supresión en <24 h (salvo obligación legal).
  - Reportes ya exportados por la Empresa: licencia continua por 12 meses.
  - Confidencialidad: sobrevive 3 años.

---

## 11. Ley Aplicable y Jurisdicción

- Ley de la República de Chile.
- Tribunales de Santiago, Chile (sin perjuicio de fueros imperativos de consumidor/usuario en otras jurisdicciones).

---

## 12. Disposiciones Generales

- **Cesión:** Ninguna Parte podrá ceder sin consentimiento escrito de la otra (excepto KRUMM a filial 100% controlada).
- **Fuerza mayor:** Ninguna Parte responsable por retraso/incumplimiento por causa ajena a su control razonable.
- **Acuerdo completo:** Este Contrato + Anexos sustituyen cualquier acuerdo previo (oral o escrito).
- **Modificaciones:** Solo por escrito firmado por representantes autorizados de ambas Partes.
- **Notificaciones:** Email a direcciones indicadas en el preámbulo (válidas si enviadas a esas direcciones).

---

## 13. Firmas

**KRUMM SpA**                              **[EMPRESA CLIENTE]**

_________________________________        _________________________________
Carlos Saldivia                              [Nombre Representante Legal]
Founder / CEO                                [Cargo]
Fecha: _______________                      Fecha: _______________

---

## ANEXO A — DATA PROCESSING AGREEMENT (DPA)

### A.1 Definiciones
Términos en mayúscula según GDPR Art. 4 y Ley 19.628.

### A.2 Objeto y Duración
Tratamiento de datos personales de Candidatos para generar Reportes agregados. Duración: vigencia del Contrato Marco + 30 días post-terminación.

### A.3 Naturaleza y Finalidad
KRUMM trata como Encargado: telemetría agregada de juego, métricas por constructo, quality/integrity flags, metadatos de sesión. Finalidad: prestación del Servicio de evaluación.

### A.4 Categorías de Datos e Interesados
Ver Política de Privacidad §2.2. Interesados: Candidatos invitados por la Empresa.

### A.5 Obligaciones de KRUMM (Encargado)
1. Tratar solo según instrucciones documentadas de la Empresa (este Contrato + configuración en Plataforma).
2. Garantizar confidencialidad (NDA firmado por personal con acceso).
3. Implementar medidas técnicas/organizativas Art. 32 GDPR (ver §7 Política).
4. No subcontratar sin autorización previa por escrito (AWS y PostHog pre-autorizados).
5. Asistir a la Empresa en: derechos ARCO/GDPR, notificación brechas, DPIA, auditorías.
6. A fin del tratamiento: suprimir o retornar todos los datos a la Empresa (elección de la Empresa) y certificar por escrito.

### A.6 Obligaciones de la Empresa (Responsable)
1. Base legal válida para cada tratamiento (consentimiento candidato + contrato KRUMM).
2. Informar a Candidatos (transparencia Art. 13/14 GDPR) — la Plataforma incluye pantalla de consentimiento.
3. Garantizar exactitud de datos proporcionados (emails correctos, roles reales).
4. Supervisar el cumplimiento de KRUMM (derecho a auditoría con 30 días aviso, coste a cargo de la Empresa salvo hallazgo material).

### A.7 Transferencias Internacionales
AWS us-east-1 + SCC 2021/914. Evaluación Schrems II en DPIA. Copia SCC disponible a petición.

### A.8 Notificación de Brechas
KRUMM notificará a la Empresa **sin demora indebida y, en todo caso, <72 h** tras tener constancia de brecha de seguridad que afecte datos personales. Notificación incluirá: naturaleza, categorías/volumen afectados, consecuencias probables, medidas adoptadas/propuesas, contacto DPO.

### A.9 Sub-encargados
| Sub-encargado | Servicio | Ubicación | Medidas |
|---------------|----------|-----------|---------|
| Amazon Web Services | Hosting, compute, DB, email, auth, CDN | us-east-1 (EE. UU.) | DPA AWS + SCC + ISO 27001 / SOC 2 |
| PostHog (opt-in) | Analytics producto (solo pageviews/nav, NO telemetría juego) | Cloud EU/US (configurable) | DPA + SCC; solo si consentimiento analytics |

### A.10 Auditorías
La Empresa puede auditar (o mandatar auditor tercero independiente, bajo NDA) el cumplimiento de este DPA con **30 días de aviso escrito**, durante horario laboral, máximo 1 vez/año (o tras incidente material). Costes a cargo de la Empresa salvo hallazgo de incumplimiento material por KRUMM.

### A.11 Ley Aplicable y Jurisdicción
Igual que Contrato Marco (Ley Chile, Tribunales Santiago).

---

**Firmas del Anexo DPA**

**KRUMM SpA**                              **[EMPRESA CLIENTE]**

_________________________________        _________________________________
Carlos Saldivia                              [Nombre Representante Legal]
Founder / CEO                                [Cargo]
Fecha: _______________                      Fecha: _______________