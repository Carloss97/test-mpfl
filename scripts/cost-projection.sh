#!/usr/bin/env bash
# F.3 (FASE F, plan 2026-09-12) — FinOps mensual KRUMM staging.
# Presupuesto (actual/forecast) + uso medido (CloudWatch) + costo analítico
# de la infra KRUMM (precios lista us-east-1) + costo por evaluación completa
# + top-5 Cost Explorer (con guard de divergencia billing-view/CE).
# Uso:  bash scripts/cost-projection.sh prev   (mes anterior completo)
#       bash scripts/cost-projection.sh cur    (mes corriente, parcial)
# Salida: reporte markdown para docs/ops/finops.md y kanban heartbeat.
set -euo pipefail
export F3_MODE=${1:-prev}
export F3_REGION=us-east-1
export F3_ACCOUNT=931932531447
python3 <<'PYEOF'
import datetime, json, os, subprocess

REGION = os.environ['F3_REGION']
ACCOUNT = os.environ['F3_ACCOUNT']
MODE = os.environ['F3_MODE']
TODAY = datetime.date.today()
MONTH_START = TODAY.replace(day=1)
if MODE == 'cur':
    T0, T1 = MONTH_START, TODAY
    LABEL = 'mes corriente (parcial; CE con retardo ~2 días)'
else:
    T1 = MONTH_START - datetime.timedelta(days=1)
    T0 = T1.replace(day=1)
    LABEL = 'mes anterior completo'

def aws(*args):
    r = subprocess.run(['aws'] + list(args), capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f'aws {" ".join(args[:3])}… fail: {r.stderr[:200]}')
    return r.stdout

print(f'## FinOps KRUMM — reporte {TODAY.isoformat()}')
print()
print(f'Ventana: **{T0} → {T1}** ({LABEL}).')
print()

# ── 1) Presupuestos (fuente de costo confiable vía billing view) ─────────────
print('### 1) Presupuestos AWS (actual/forecast del período actual)')
print('| Presupuesto | Tope | Actual | Forecast |')
print('|---|---|---|---|')
budgets = json.loads(aws('budgets', 'describe-budgets', '--account-id', ACCOUNT, '--region', REGION, '--output', 'json'))
for b in budgets.get('Budgets', []):
    cs = b.get('CalculatedSpend', {})
    a = float(cs.get('ActualSpend', {}).get('Amount', 0))
    f = float(cs.get('ForecastedSpend', {}).get('Amount', 0))
    limit = float(b['BudgetLimit']['Amount'])
    print(f"| {b['BudgetName']} | ${limit:.0f} | ${a:.2f} | ${f:.2f} |")
print()
print('> Nota (2026-09-13): Cost Explorer desde esta cuenta devuelve ≈$0')
print('> (cuenta nueva, org o-174gs22pfo) mientras la billing view "primary"')
print('> del presupuesto de cuenta ($200) ve gasto distinto → el breakdown')
print('> por servicio se revisa en consola Billing → Cost breakdown.')
print()

# ── 2) Uso medido (CloudWatch — siempre disponible) ──────────────────────────
def cw(namespace, metric, dims, statistic, period, t0=T0, t1=T1):
    out = aws('cloudwatch', 'get-metric-statistics', '--region', REGION,
              '--namespace', namespace, '--metric-name', metric,
              '--dimensions', json.dumps([{'Name': n, 'Value': v} for n, v in dims])
              if dims else '[]',
              '--start-time', str(t0), '--end-time', str(t1),
              '--statistics', statistic, '--period', str(period), '--output', 'json')
    pts = json.loads(out).get('Datapoints', [])
    key = 'Sum' if statistic == 'Sum' else 'Average'
    return sum(p.get(key, 0) for p in pts)

LAMBDA = 'krumm-staging-sessions'
invocations = cw('AWS/Lambda', 'Invocations', [('FunctionName', LAMBDA)], 'Sum', 3600)
avg_ms = cw('AWS/Lambda', 'Duration', [('FunctionName', LAMBDA)], 'Average', 3600)
tables = ['krumm-staging-sessions', 'krumm-staging-audit-log', 'krumm-staging-invitations']
ddb_w = {t: cw('AWS/DynamoDB', 'ConsumedWriteCapacityUnits', [('TableName', t)], 'Sum', 86400) for t in tables}
ddb_r = {t: cw('AWS/DynamoDB', 'ConsumedReadCapacityUnits', [('TableName', t)], 'Sum', 86400) for t in tables}
cf_bytes = sum(cw('AWS/CloudFront', 'BytesDownloaded',
                  [('DistributionId', d), ('Region', 'Global')], 'Sum', 86400)
               for d in ('E2OPPVGDO8R75S', 'EDQ39PDNI931R'))
cf_gb = cf_bytes / 1024**3
# SES v2: métricas a nivel cuenta (sin dimensiones) — Send/Delivery/Bounce.
ses_sent = cw('AWS/SES', 'Send', [], 'Sum', 86400)
ses_delivered = cw('AWS/SES', 'Delivery', [], 'Sum', 86400)
# APIGW HTTP: dimensiones ApiId (+Stage)
api_req = cw('AWS/ApiGateway', 'Count', [('ApiId', 'rwm08ik23m')], 'Sum', 86400)

print('### 2) Uso medido (CloudWatch, ventana del reporte)')
print('| Métrica | Valor |')
print('|---|---|')
print(f'| Lambda {LAMBDA}: invocaciones | {invocations:,.0f} |')
print(f'| Lambda: duración media (ms) | {avg_ms:,.1f} |')
for t in tables:
    print(f'| DynamoDB {t}: writes / reads | {ddb_w[t]:,.0f} / {ddb_r[t]:,.0f} |')
print(f'| CloudFront: GB salientes (2 dists) | {cf_gb:.3f} |')
print(f'| SES: emails enviados / entregados | {ses_sent:,.0f} / {ses_delivered:,.0f} |')
print(f'| APIGW: requests (ApiId rwm08ik23m) | {api_req:,.0f} |')
print()

# ── 3) Costo analítico infra KRUMM (precios lista us-east-1) ─────────────────
LMBD_REQ = 0.20 / 1e6          # $/request
LMBD_GBS = 0.0000166667        # $/GB-s (128 MB)
LMBD_GB = 0.128
DDW, DDR = 1.25 / 1e6, 0.25 / 1e6   # on-demand
CF, SES_, API_ = 0.085, 0.10 / 1000, 1.0 / 1e6
COG_MAU = 0.001                 # $/MAU aprox (2 MAU beta)

lambda_cost = invocations * LMBD_REQ + invocations * LMBD_GB * (avg_ms / 1000) * LMBD_GBS
ddb_cost = sum(ddb_w.values()) * DDW + sum(ddb_r.values()) * DDR
cf_cost = cf_gb * CF
ses_cost = ses_sent * SES_
api_cost = max(0, api_req - 300_000) * API_   # 300k primeros gratis
cog_cost = 2 * COG_MAU
total_krumm = lambda_cost + ddb_cost + cf_cost + ses_cost + api_cost + cog_cost

print('### 3) Costo analítico infra KRUMM staging (precios lista)')
print('| Componente | Cálculo | $/mes |')
print('|---|---|---|')
print(f'| Lambda | {invocations:,.0f} req + GB-s (dur media {avg_ms:,.0f} ms) | {lambda_cost:.4f} |')
print(f'| DynamoDB on-demand | {sum(ddb_w.values()):,.0f} W + {sum(ddb_r.values()):,.0f} R | {ddb_cost:.4f} |')
print(f'| CloudFront | {cf_gb:.3f} GB | {cf_cost:.4f} |')
print(f'| SES | {ses_sent:,.0f} emails | {ses_cost:.4f} |')
print(f'| APIGW | {api_req:,.0f} req (sobre tier gratuito) | {api_cost:.4f} |')
print(f'| Cognito | 2 MAU beta | {cog_cost:.4f} |')
print(f'| **TOTAL infra KRUMM** | | **{total_krumm:.4f}** |')
print()

# ── 4) Costo por evaluación completa (análítico) ─────────────────────────────
# Supuestos por 1 evaluación completa (candidato + lado reclutador), beta:
N_INV, N_W, N_R, N_MB, N_MAIL, N_API = 8, 3, 6, 8, 1, 8
ev_lambda = N_INV * LMBD_REQ + N_INV * LMBD_GB * (avg_ms / 1000) * LMBD_GBS
ev_ddb = N_W * DDW + N_R * DDR
ev_cf = (N_MB / 1024) * CF
ev_ses = N_MAIL * SES_
ev_api = N_API * API_
ev_total = ev_lambda + ev_ddb + ev_cf + ev_ses + ev_api

print('### 4) Costo por evaluación completa (análítico)')
print(f'Suposición: {N_INV} invocaciones Lambda, {N_W} writes + {N_R} reads DynamoDB,')
print(f'{N_MB} MB CloudFront, {N_MAIL} email SES, {N_API} requests APIGW (candidato + reclutador).')
print()
print('| Componente | $/evaluación |')
print('|---|---|')
print(f'| Lambda | {ev_lambda:.6f} |')
print(f'| DynamoDB | {ev_ddb:.6f} |')
print(f'| CloudFront | {ev_cf:.6f} |')
print(f'| SES | {ev_ses:.6f} |')
print(f'| APIGW | {ev_api:.6f} |')
print(f'| **TOTAL** | **${ev_total:.6f}** (~${ev_total*1000:.2f} por 1,000 evaluaciones) |')
print()
print('> La GPU (2xH100 Lambda Labs, $8.38/h) vive en cuenta/aaS separada: NO')
print('> entra en este presupuesto AWS. Costo de GPU por hora de trabajo pesado')
print('> → ver kanban/cron del orquestador (apagado automático 40 min idle).')
print()

# ── 5) Top-5 servicios (Cost Explorer) con guard de divergencia ──────────────
print('### 5) Top-5 servicios del mes (Cost Explorer)')
try:
    ce = json.loads(aws('ce', 'get-cost-and-usage', '--region', REGION,
                        '--time-period', f'Start={T0},End={T1}',
                        '--granularity', 'MONTHLY', '--metrics', 'UnblendedCost',
                        '--group-by', 'Type=DIMENSION,Key=SERVICE',
                        '--query', 'ResultsByTime[0].Groups[].{s:Keys[0].GroupKey,c:Metrics.UnblendedCost.Amount}',
                        '--output', 'json'))
    groups = [(g['s'], float(g['c'])) for g in ce]
    top5 = sorted(groups, key=lambda x: -x[1])[:5]
    if sum(c for _, c in groups) < 0.01:
        print('_(CE ≈ $0 en esta cuenta — ver nota de billing view en §1;_')
        print('_breakdown real: consola Billing → Cost breakdown)_')
    else:
        for s, c in top5:
            print(f'- {s}: ${c:.4f}')
except Exception as e:
    print(f'_(CE no disponible: {str(e)[:80]})_')
print()

print('### 6) Rutina y presupuesto')
print('- Presupuesto KRUMM: `krumm-staging-monthly-billing` **$25/mes**.')
print('- Rutina mensual (día 1): `bash scripts/cost-projection.sh prev` → pegar')
print('  §2-§4 en `docs/ops/finops.md` (historial) + screenshot al kanban')
print('  heartbeat `t_88701e67`.')
print('- Alertas 80/100%: verificar en consola Billing → Budgets (el SDK de la')
print('  Pi no expone las notificaciones de la API nueva de budgets).')
print('- Si el forecast mensual > $15 (60% del presupuesto): revisar top-5 y')
print('  escalado de Lambda (GB-s) antes que tráfico beta.')
PYEOF
