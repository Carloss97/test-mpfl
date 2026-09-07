# Handoff — H4.6b: audit visual post-marca v2 + fix CSP fuentes (2026-09-07)

## Hito
Kanban `t_be89dafb` (done 16:4x -03): audit visual SOLO de flujo candidato
(landing interna, guard, setup, stage 5 juegos con recorrido vivo, reporte) y
/reclutador bajo marca v2 (scope reducido de la card, comentario 15:49).
**Hallazgo crítico:** la CSP de CloudFront (RHP m2) bloqueaba Google Fonts →
krumm.cl renderizaba la marca v2 con fallback del sistema. **Fix aplicado:**
RHP m3 vía API + update-distribution + m2 eliminada + template CFN sincronizado.

## Evidencia
- Audit: `docs/qa/h46b-visual-audit/h46b-visual-audit.md` (21 vistas + recorrido;
  `failures: []`, `consoleErrors: []`, 22 shots, `h46b-run.json`).
- Suite 705/705 (123 archivos) · oxlint scripts nuevos 0 errores.
- Verificación prod post-fix: Manrope render real en 4 vistas de flujo,
  Archivo 900 + h1 Archivo en landing, 0 errores de consola (antes 2/página),
  0 overflow. `scripts/prod-verify-h46b.mjs`.
- Contraste: todo AA salvo kicker terracota #9a7355 sobre crema = **3.72:1
  documentado** (decisión abierta §10; ver audit F3).

## Trackers
- Kanban: `t_be89dafb` done (comentario de cierre con evidencia). Parent
  `t_69044ae0` ya estaba archivado (cierre de la fase H4 por el port de marca).
- Linear: ver §Sync (issue del audit + KRU-80 contexto).
- Commits: ver §Repo (audit + scripts + yaml + docs; push autorizado por el
  usuario en sesión 2026-09-07).

## Infra — CloudFront (estado real post-fix)
- Distribución `EDQ39PDNI931R` (krumm.cl + www.krumm.cl), ETag `E13V1IB3VIYZZH`.
- RHP vigente: **`krumm-staging-rhp-m3`** (`aaac7f10-372b-461e-b387-1ed1f2eeadd6`)
  = m2 + `fonts.googleapis.com` (style-src) + `fonts.gstatic.com` (font-src)
  − `wasm-src` (directive no reconocida → error de consola).
- RHP m2 (`23b296b7-…`) eliminada. RHP m1 (`24c8a9d6-…`, época B1) = orphan,
  sin referenciar, no tocada.
- CSP completa vigente: audit F1.

## ⚠ CFN (infra/m1-frontend-stack.yaml) — reconciliación pendiente antes del próximo deploy del stack m1
El template ahora declara `krumm-staging-rhp-m3` bajo el logical resource
`ResponseHeadersPolicy`, pero la política **fue creada vía API** (no por CFN):
el physical ID que CFN tiene registrado en el stack state es el de m2 (ya
borrada). El próximo `cloudformation/sam deploy` del stack m1 hará:
1. delete del logical antiguo → m2 ya no existe en live (CFN tolera);
2. create del logical con nombre m3 → **AlreadyExists** (m3 vive en CloudFront)
   → el update FALLARÁ.

**Procedimiento para el próximo deploy del stack m1** (elegir uno):
- (a) `aws cloudfront delete-response-headers-policy --id aaac7f10-372b-461e-b387-1ed1f2eeadd6`
  (la distribución queda ~10-20 min sin headers de seguridad — hacer en ventana
  baja) y dejar que CFN re-cree m3; o
- (b) no deployear el stack m1 por CFN mientras el RHP viva fuera del stack:
  los deploys de frontend son S3 + `scripts/deploy-frontend.sh` (no tocan la
  distribución); el stack m1 solo se necesita para cambios de
  origin/aliases/cert/distribution.
- Ver también el pitfall en el skill `krumm-autono-orquestador` (RHP m3).

## Secuencia / siguiente
1. **Decisión del usuario (abierta):** contraste del kicker terracota #9a7355
   sobre crema (3.72:1 < AA 4.5). Si se exige AA estricto: oscurecer
   `--k-ink-terracotta` (1 token + re-audit de kickers).
2. Cola ready (sin bloqueos): `t_f40921bf` (stage móvil canvas <500px),
   `t_24a0e428` (copy HR sin EN — incluye "Revisar caveats"), `t_42978412`
   (copy juegos ES-only), `t_c1892485` (T.3b sensibilidades MoveNet/FaceMesh).
3. Observación F5 (tangram: pieza inicial cruza el borde de la silueta) →
   revisarla en la próxima tarea que toque juegos.
4. GPU: instancia viva (modo manual, la apaga el usuario); watchdog solo loguea.

## Entorno
- AWS SSO válido (usado para el fix CloudFront); gh Carloss97 OK.
- Vite 5173 (audit) levantado para el hito — dejarlo o matarlo al cerrar
  (el 5174 del usuario sigue corriendo, **stale en tokens** — ver audit F6:
  reiniciar si se usará de nuevo).
