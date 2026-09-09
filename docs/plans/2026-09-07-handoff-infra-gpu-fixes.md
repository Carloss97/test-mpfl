# Handoff — Fixes infra GPU Lambda + modo manual (2026-09-07)

**Fecha:** 2026-09-07 · **Autor:** orquestador (sesión CLI) · **Estado:** CERRADO (evidencia abajo)

## Contexto
- AWS SSO expiró de madrugada (~05:10); el usuario lo renovó a las 12:18 vía device code.
- La instancia GPU (2xH100, `$8.38/h`) estaba encendida desde ~00:00 y **nadie la podía apagar
  automáticamente**: el watchdog era no-op (schema drift de la API Lambda) y ni siquiera estaba
  programado en el crontab. Decisión del usuario (12:20): **GPU en modo manual — él apaga la
  instancia; sin auto-apagado hoy.**

## Fixes aplicados (verificados live)
| # | Bug | Causa raíz | Fix | Archivo | Verificación |
|---|-----|-----------|-----|---------|--------------|
| 1 | Túnel caído ~10 h sin reconectar (00:10→10:03) | `gpu_tunnel_check.sh` validaba `http://<ip-pública>:8000/health` (inalcanzable por firewall Lambda) → la rama de reconexión jamás dispare; además la clave se pasaba como literal `"***"` | Reescrito: API Lambda (estado de instancia) + `pkill` stale + `ssh -fNL`; limpia `gpu_state.json` si la instancia ya no existe; distingue "vLLM cargando" (puerto escuchando) de "túnel muerto" | `~/.hermes/scripts/gpu_tunnel_check.sh` (crontab `*/5`) | Túnel matado a mano → reconectado en ~5 s, `/health` OK |
| 2 | Watchdog 40min/6h muerto | (a) fuera del crontab; (b) API Lambda ahora responde `{data:[...]}` con `file_system_names` (no `file_systems`) → lista vacía; (c) sin `launched_at` en la API | Vuelto al crontab (`*/5`); filtro por nombre de instancia con fallback fs; edad por stamp persistente `~/.hermes/lambda_age_since`; **modo AUTO-OFF** (solo log del umbral en `cost-watchdog.log`; `GPU_AUTO_OFF=1` lo restaura) | `~/.hermes/scripts/lambda_idle_watchdog.sh` + crontab | Run manual: detecta instancia, no apaga, state intacto |
| 3 | Orquestador "gpu=DOWN" permanente + reintentos `gpu.sh up` cada tick | `gpu_health()` hacía HTTP directo a `<ip-pública>:8000` | Salud por túnel `127.0.0.1:18000/health`; `ensure_tunnel()` antes de chequear; post-up con polling (boot vLLM 4-10 min); costo en aviso $8.38/h | `~/bin/model_orchestrate.py` | Run manual: `gpu=UP`, sin spam |
| 4 | `gpu.sh status` decía "cargando modelo" con vLLM listo | Mismo chequeo por IP pública | Status por túnel 18000 | `~/bin/gpu.sh` | `VLLM: listo (túnel ...)` |
| 5 | **`switch_model.py` reiniciaba el gateway en cada llamada** (aunque la config ya apuntara al target) | Restart incondicional al final de `main()` | Idempotente: compara provider/model actual vs target; solo escribe config + reinicia si cambió | `~/bin/switch_model.py` | Run con config ya en target: "sin cambios, no reinicio gateway", rc=0 |

## Incidente correlacionado (documentado en t_36dd7011)
- **10:56** — corrida manual del orquestador (con el bug #5 activo) → `switch_model("gpu")` →
  SIGTERM al gateway (10:56:18) → **murió la worker H4.3 run 78** (26 min de trabajo).
  WIP stasheado en `stash@{0}` "wip(H4.3 rerun t_36dd7011)". Re-claim manual a las 11:04
  (orquestador, con instrucción `git stash pop` en la card).
- **12:50** — H4.3 relanzada por la sesión CLI (PID 447256) por instrucción del usuario
  ("lanza ahora mismo"); el tick del dispatcher 12:30 seguía corriendo lento (NIM 529 →
  fallback deepseek-v4-flash).

## Entorno
- GPU: **UP**, instancia `13823254880549ada9290d9302600015` (ip 68.209.72.141), **modo manual**
  (el usuario apaga). Costo $8.38/h desde ~00:00 (~$103 a las 12:50).
- AWS SSO: renovado en la Pi (12:18, device code) — `admin-carlos` @ 931932531447.
- Hermes: **v0.21.0** (update 10:26, config v40→v41). SQLite del venv: 3.53.1 nativo
  (≥3.51.3 → el fix WAL-reset ya está incluido; no se requiere `fix_sqlite_wal_reset.sh`).
- `AGENTS.md`: sección GPU actualizada con los 5 fixes (una nota adicional sobre el incidente
  run 78 quedó pendiente de aprobación de escritura del archivo).
- **Discord alerts migrados a server KRUMM (2026-09-08)**: webhooks nuevos `DISCORD_ALERTS_WEBHOOK_URL` → `hermes-alerts` y `DISCORD_OPS_WEBHOOK_URL` → `krumm-auto`; reporter kanban usa bot → `kanban` embed Linear; legacy `DISCORD_WEBHOOK_URL` (server ajeno) queda 30 días de fallback.

## Cartas de kanban (estado 12:50)
| Card | Título | Estado |
|------|--------|--------|
| t_36dd7011 | H4.3 Rediseño flujo candidato + vista /reclutador | **running** (relanzada 12:50) |
| t_5d775c9a | H4.5 Aplicar tokens a juegos | ready (espera a H4.3, 1-worker-tree) |
| t_be89dafb | Auditar visualmente y desplegar H4 | todo (sign-off usuario) |
| t_69044ae0 | H4 Rediseño landing | todo (sign-off usuario) |
| t_f40921bf | Fix stage móvil <500px | ready |
| t_24a0e428 / t_42978412 | Copy EN (dashboard HR / juegos stable_dg) | ready |
| t_c1892485 | T.3b sensibilidades biométricas | ready (NEVER_HEAVY, hardware) |

## Siguiente (orden)
1. H4.3 corre → al cerrar se desbloquea H4.5 (1-worker-tree).
2. Tras H4.5: sign-off visual del usuario (t_be89dafb) y **deploy solo con su instrucción
   explícita** (t_69044ae0).
3. Cola posterior: t_f40921bf → copies EN → T.3b.
4. GPU: el usuario apaga la instancia manualmente cuando termine de usarla;
   `GPU_AUTO_OFF=1` en el crontab restaura el watchdog automático.
