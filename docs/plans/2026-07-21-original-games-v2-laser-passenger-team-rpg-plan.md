# Original Games V2 — Laser, Passenger y Team RPG Implementation Plan

> **For Hermes:** Execute directly with TDD; preserve aggregate-only telemetry and the current report/mapping contracts.

**Goal:** Increase Laser puzzle depth, rebuild Passenger Routes as a fair logistics game, and transform Team Coordination into an accessible text-RPG role-play without changing compatible aggregate outputs.

**Architecture:** Keep game mechanics and scoring in pure telemetry/authoring modules. Author levels against the existing solvers, add explicit fairness/depth tests, then reskin React surfaces without adding reconstructive telemetry. Preserve `game_event_v1`, aggregate schemas and final feature mappings.

**Tech Stack:** React 19, Vite 8, Vitest, pure JS authoring solvers, responsive CSS, Playwright smoke.

---

## Phase A — Laser depth and portals

**Estado:** `[x] Completado`

- Require authored placement depth of at least `4 / 5 / 6` moves.
- Add portal routing to levels 2 and 3.
- Keep level 3 multi-target with bifurcation plus portal traversal.
- Prove authored solutions, unsolved starts, compact board fit and no 1–3 move shortcuts where tractable.
- Add portal-level counts to authoring QA without exporting geometry.

## Phase B — Passenger Routes V2

**Estado:** `[x] Completado`

- Replace all three authored circuits with a cleaner progression and new mission fantasy.
- Circuit 1: onboarding without recharge.
- Circuit 2: two deliveries, optional or single strategic recharge, meaningful finish margin.
- Circuit 3: advanced ordering constraint with at most one required recharge.
- Extend solver QA with remaining-energy output and fairness thresholds.
- Rebuild visible UI hierarchy: mission, map, vehicle status, passenger cards, energy forecast and clearer controls.
- Preserve movement costs, pickup/delivery rules, aggregate schema and privacy.

## Phase C — Team Coordination text RPG

**Estado:** `[x] Completado`

- Keep the four scenario decisions and scoring formulas.
- Add chapter/speaker/scene metadata used only for presentation.
- Render a text-RPG command room: scene art, narrator/dialogue panel, party/role status and turn progression.
- Keep choices as structured buttons; no free text and no option/category persistence.
- Preserve response aggregate and feature mapping.

## Phase D — Integration and final gates

**Estado:** `[x] Completado`

```bash
NODE_ENV=test npx vitest run src/tasks/original-games --pool=threads --reporter=default
NODE_ENV=test npx vitest run --pool=threads --reporter=default
npx oxlint src/postulation-demo src/tasks src/main.jsx src/assessment src/telemetry/gameCorrelation.js
npm run build
npm audit --audit-level=high --omit=dev
git diff --check
```

Browser gates:

- Complete original battery desktop and mobile.
- No horizontal overflow, console/page/request errors or raw-field leakage.
- Verify portal visibility, Passenger V2 mission/energy clarity and Team RPG scene progression.

### Resultado verificado

- Laser: soluciones authoring `4/5/6`, portales en 2 niveles y piezas necesarias verificadas.
- Passenger: reservas finales óptimas `4/5/4`; recargas mínimas `0/0/1`.
- Team: cuatro turnos RPG, consecuencias locales y ninguna opción/categoría persistida.
- Vitest completo: `96 files / 405 tests` aprobados.
- Oxlint: `0 warnings / 0 errors`.
- Build: `1395 modules transformed`.
- Audit: `0 vulnerabilities`.
- Smokes original desktop `1280×720` y móvil `390×844`: `failures: []`.
- `git diff --check`: limpio.
