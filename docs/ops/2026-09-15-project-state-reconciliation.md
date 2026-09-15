# Reconciliación operativa — 2026-09-15

## Estado de producto

| Área | Estado canónico | Evidencia |
|---|---|---|
| G.5 multi-tenancy | Cerrado en staging | `c4329e4`; `custom:companyId` en Cognito/JWT, GSI `companyId-index`, smoke A/B sintético sin PII, backend 39/39. |
| Fase E | Cerrada materialmente | Legal/rutas, ayuda/soporte, feedback y runbook beta incluidos en `c4329e4`; verificaciones focales y build pasaron. |
| Fase H | Cerrada | KRU-120 Done; pitch deck, data room, guion demo seguro y roadmap presentes. No se grabó/publicó video. |
| Fase G | En progreso | Lighthouse sigue abierto; no se relajaron los budgets. |
| Beta externa | Pendiente humano | KRU-141: revisión DPO/legal, contratos y onboarding de dos empresas. |
| Fase B | En progreso | Auditorías B.7–B.12 pendientes. |
| T.3b / C7 | Pendiente/dependiente | T.3b requiere webcam; C7 biométrica sigue post-pilotaje. |

## Kanban y Linear

- Linear es el registro de transición de fase: KRU-117, KRU-120 y KRU-140 están Done; KRU-119 y KRU-110 siguen In Progress; KRU-141 concentra los gates humanos de beta.
- Algunas tarjetas Kanban antiguas no pueden cerrarse desde un run de orquestación ajeno. No representan trabajo activo y se excluyen únicamente del snapshot por `~/.hermes/kanban/reporting-exclusions.json`; el archivo documenta el motivo de cada exclusión.
- El snapshot operativo se publica por `~/.hermes/scripts/kanban_discord_reporter.py` cada 10 minutos, con deduplicación basada en estado estable. Muestra solo trabajo actual y los últimos cinco cierres.

## Discord

| Canal | Política |
|---|---|
| `#kanban` | Solo snapshot deduplicado de Kanban. |
| `#hermes-alerts` | Solo cambios de estado GPU, AWS SSO próximo a expirar/expirado y tareas que requieren input o autorización humana. |
| `#krumm-auto` | Mantiene eventos operativos y ejecución del orquestador. |
| `#general` | Conversación normal del gateway. |

El job `krumm-alerts` usa `~/.hermes/scripts/krumm_alerts.py` en modo script-only: stdout vacío no envía mensaje. El monitor genérico de disco/temperatura/gateway se retiró del crontab para evitar alertas fuera de esta política.

## GPU Lambda

- `~/bin/gpu.sh` no cambia Hermes al endpoint GPU hasta que `/health` y `/v1/models` respondan por el túnel `127.0.0.1:18000`.
- `scripts/launch_lambda_manual.py` comprueba capacidad antes de lanzar, detecta instancias existentes por nombre o filesystem y termina una instancia que falle durante bootstrap.
- Estado actual al reconciliar: sin instancias activas. No se levantó GPU durante esta reconciliación.
- Un fallo de CUDA 802 después de driver propietario y smoke CUDA debe tratarse como incidente de host/fleet Lambda: terminar la instancia y conservar evidencia, sin bucles de reintento.
