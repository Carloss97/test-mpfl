# F.3 — FinOps KRUMM staging (mensual)

> Scope: costos AWS de la infra staging (`krumm-staging-*` + CloudFront).
> La GPU (2xH100 Lambda Labs, $8.38/h) vive en proveedor separado — **no entra
> en este presupuesto AWS**. Script: `scripts/cost-projection.sh`
> (presupuesto + uso medido + costo analítico + costo por evaluación).

## Datos al 2026-09-13 (septiembre, parcial día 1→13)

### Presupuesto AWS (fuente confiable — billing view "primary")

| Presupuesto | Tope | Actual | Forecast |
|---|---|---|---|
| `My Monthly Cost Budget` (cuenta, billing view) | $200 | $29.62 | $29.81 |
| `krumm-staging-monthly-billing` (KRUMM staging) | **$25** | $0.00 | **$0.27** |

- **El stack KRUMM staging vive en ~$0.27/mes de forecast** — margen enorme
  vs el presupuesto de $25. A escala beta (2 empresas, pocas evaluaciones) no
  es un riesgo de costo. Si el forecast supera $15 (60%) revisar §top-5.
- ⚠️ **Pendiente usuario (consola)**: el presupuesto de cuenta ve $29.62 pero
  Cost Explorer desde la cuenta ve ≈$0 y no hay EC2/RDS — esa diferencia se
  identifica en **AWS Console → Billing → Cost breakdown (billing view
  "primary")**. No es gasto del stack KRUMM (ver tabla §2).
- ⚠️ **Alarmas 80/100 %** del presupuesto $25: el SDK de la Pi (botocore clásico)
  no expone las notificaciones de la API nueva de budgets → verificar en
  consola Billing → Budgets → `krumm-staging-monthly-billing`.
- **2026-09-14 (G.3)**: WAF CloudFront `krumm-cf-waf` (CommonRuleSet +
  KnownBadInputsRuleSet en stage+prod) → +$1-2/mes (web ACL + evaluación sobre
  tráfico mínimo). Rate limiting API: ≈$0 (DDB on-demand, volumen mínimo).
  El forecast del stack pasa de ~$0.27 a ~$1.5-2.5/mes — sigue muy dentro del
  budget de $25. Verificar costo real en el cierre de septiembre.

### Uso medido (CloudWatch, 1→13 sep)

| Métrica | Valor |
|---|---|
| Lambda `krumm-staging-sessions` invocaciones | 154 |
| Lambda duración media | 5,184 ms (sube por llamadas SES de invitación, ~1-2 s c/u; el resto <200 ms) |
| DynamoDB writes / reads (3 tablas) | 92 / 262 |
| CloudFront GB salientes (2 dists) | 0.352 |
| SES Send / Delivery (métrica cuenta) | 0 / 0¹ |
| APIGW requests | 153 |

¹ SES `Send`/`Delivery` (v2, nivel cuenta) no reflejó los 2 emails del día del
reporte — investigar métrica por identity en consola si se quiere volumen SES
real; SES cobra $0.10/1000 emails (marginal).

### Costo analítico infra KRUMM (precios lista us-east-1, este mes)

| Componente | $/mes (tráfico beta actual) |
|---|---|
| Lambda (154 req + GB-s) | 0.0017 |
| DynamoDB on-demand (92W + 262R) | 0.0002 |
| CloudFront (0.352 GB) | 0.0299 |
| SES | <0.0001 |
| APIGW (153 req; gratis hasta 300k/mes) | 0.0000 |
| Cognito (2 MAU) | 0.0020 |
| **Total infra staging** | **≈ $0.034/mes** |

### Costo por evaluación completa (análítico — el número del pitch)

Supuestos por evaluación (candidato + reclutador): 8 invocaciones Lambda,
3 writes + 6 reads DynamoDB, 8 MB CloudFront, 1 email SES, 8 requests APIGW.

| Componente | $/evaluación |
|---|---|
| Lambda | 0.000002 |
| DynamoDB | 0.000005 |
| CloudFront | 0.000664 |
| SES | 0.000100 |
| APIGW | 0.000008 |
| **TOTAL** | **$0.00078** → **~$0.78 por 1,000 evaluaciones** |

Con 100,000 evaluaciones/mes: ≈ $78/mes en infra (sin GPU ni S3 largo plazo).
El costo marginal de evaluación es **sub-céntimo** — el negocio escala por
precio del plan, no por infra.

### Top-5 servicios del mes (Cost Explorer)

CE devuelve ≈$0 desde esta cuenta (nueva, jun-2026; billing view activa en el
modelo de budgets nuevo). El breakdown confiable por servicio se consulta en
consola Billing → Cost breakdown. Re-evaluar en nov-2026 cuando el pipeline
de CE madure.

## Rutina mensual (día 1)

1. `bash scripts/cost-projection.sh prev` (mes anterior) → actualizar la tabla
   "Historial".
2. Screenshot del presupuesto + §uso → kanban heartbeat `t_88701e67`.
3. Si forecast mensual > $15 (60 % del presupuesto) → revisar §top-5 +
   alertas, y evaluar provisioned concurrency o pagados según tráfico.

## Historial

| Fecha | Reporte | Notas |
|---|---|---|
| 2026-09-13 | infra staging ≈ $0.034/mes; $0.00078/evaluación; forecast presupuesto $0.27/mes | F.3 primera corrida; CE aún vacío (cuenta nueva) |

## Referencias

- Script: `scripts/cost-projection.sh` (uso: `bash scripts/cost-projection.sh [prev|cur]`).
- Presupuesto: `krumm-staging-monthly-billing` ($25/mes, verificado por API).
- Métricas de producto (PostHog): `docs/ops/metrics.md`.
- GPU/orquestador: skill `krumm-autono-orquestador` + cron watchdog 40 min.
