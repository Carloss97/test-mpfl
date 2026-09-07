#!/usr/bin/env python3
"""Migracion H4.3 de postulationDemo.css a tokens --k-* (flujo candidato).

Scope: solo secciones de chrome del flujo (:root, shell, landing interna,
setup, HUD, camara, stage, reporte, guard). NO toca la seccion de UI de juegos
(las tasks) que es scope de H4.5 (t_5d775c9a).

Cada (old, new) debe ser UNICA en el archivo; el script aborta si no.
"""
import sys

PATH = 'src/postulation-demo/postulationDemo.css'

PAIRS = [
# P1 :root — mapa semantico -> k tokens (juegos se mantienen, H4.5)
(
""":root {
  --postulation-bg: #f8fafc;
  --postulation-ink: #0f172a;
  --postulation-muted: #64748b;
  --postulation-line: rgba(148, 163, 184, 0.28);
  --postulation-primary: #4f46e5;
  --postulation-primary-strong: #312e81;
  --postulation-accent: #06b6d4;
  --postulation-success: #10b981;
  --postulation-warning: #f59e0b;
  --postulation-danger: #ef4444;
  --postulation-surface: rgba(255, 255, 255, 0.86);
  --postulation-game-surface: #ffffff;
  --postulation-game-control-bg: #f8fafc;
  --postulation-game-control-text: #0f172a;
  --postulation-game-control-border: rgba(49, 46, 129, 0.42);
  --postulation-game-target: #0f766e;
  --postulation-game-distractor: #334155;
  --postulation-game-focus-ring: rgba(79, 70, 229, 0.78);
}

.postulation-demo {""",
""":root {
  /* H4.3: mapa semantico del flujo candidato -> tokens --k-*.
     Fuente unica: src/styles/krumm-tokens.css — no duplicar valores aqui. */
  --postulation-bg: var(--k-bg-light);
  --postulation-ink: var(--k-ink-espresso);
  --postulation-muted: var(--k-ink-medium);
  --postulation-line: var(--k-divider);
  --postulation-primary: var(--k-accent-sand);
  --postulation-primary-strong: var(--k-ink-espresso);
  --postulation-accent: var(--k-accent-sand);
  --postulation-success: var(--k-status-ok);
  --postulation-warning: var(--k-status-warn);
  --postulation-danger: var(--k-status-error);
  --postulation-surface: rgba(255, 255, 255, 0.86);
  /* Superficies de juego: scope H4.5 (t_5d775c9a) — se conservan hasta ese rebuild. */
  --postulation-game-surface: #ffffff;
  --postulation-game-control-bg: #f8fafc;
  --postulation-game-control-text: #0f172a;
  --postulation-game-control-border: rgba(49, 46, 129, 0.42);
  --postulation-game-target: #0f766e;
  --postulation-game-distractor: #334155;
  /* Focus ring: terracota AA (#74543e a 0.9; ≥3:1 sobre crema — §6.1). */
  --postulation-game-focus-ring: rgba(116, 84, 62, 0.9);
}

/* Guard de invitacion (invite-check / invite-invalid): estado de transicion —
   pantalla espresso con texto crema (design-system §3, patron de accesos). */
.postulation-demo__invite-guard {
  position: relative;
  min-height: 100dvh;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 12px;
  padding: 24px;
  background: var(--k-bg-dark-deep);
  color: var(--k-text-cream);
  font-family: var(--k-font-sans);
  text-align: center;
}

.postulation-demo__invite-guard h1 {
  margin: 0;
  max-width: 640px;
  font-size: clamp(1.8rem, 4vw, 2.6rem);
  letter-spacing: var(--k-tracking-display);
}

.postulation-demo__invite-guard p {
  margin: 0;
  max-width: 560px;
  color: var(--k-text-cream-dim);
  line-height: 1.6;
}

.postulation-demo__invite-guard--invalid p {
  color: var(--k-text-cream);
}

/* H4.3: pill de idioma sobre el fondo espresso del guard — override oscuro
   (mismo esquema que .landing, design-system §6 pill de idioma). */
.postulation-demo__invite-guard .krumm-lang-toggle {
  border: 1px solid var(--k-border-ghost);
  background: transparent;
}

.postulation-demo__invite-guard .krumm-lang-toggle__btn {
  color: var(--k-text-cream-dim);
}

.postulation-demo__invite-guard .krumm-lang-toggle__btn:hover,
.postulation-demo__invite-guard .krumm-lang-toggle__btn:focus-visible {
  color: var(--k-text-cream);
  outline-color: var(--k-accent-sand);
}

.postulation-demo__invite-guard .krumm-lang-toggle__btn.is-active {
  background: transparent;
  color: var(--k-text-cream);
  text-decoration: underline;
  text-underline-offset: 4px;
}

.postulation-demo__invite-guard .krumm-lang-toggle__sep {
  color: var(--k-border-ghost);
}

.postulation-demo {""",
),
# P2 shell background (font-family: P76)
(
"""  background:
    radial-gradient(circle at top left, rgba(79, 70, 229, 0.18), transparent 36rem),
    radial-gradient(circle at bottom right, rgba(6, 182, 212, 0.18), transparent 32rem),
    var(--postulation-bg);""",
"""  background:
    radial-gradient(circle at top left, var(--k-tint-gold-strong), transparent 36rem),
    radial-gradient(circle at bottom right, color-mix(in srgb, var(--k-ink-terracotta) 14%, transparent), transparent 32rem),
    var(--postulation-bg);""",
),
# P3 landing/setup container
(
""".postulation-demo__landing,
.postulation-demo__setup {
  width: min(1180px, calc(100% - 32px));""",
""".postulation-demo__landing,
.postulation-demo__setup {
  width: min(var(--k-container), calc(100% - 32px));""",
),
# P4 eyebrow
(
"""  padding: 8px 14px;
  border: 1px solid rgba(79, 70, 229, 0.22);
  border-radius: 999px;
  background: rgba(79, 70, 229, 0.08);
  color: var(--postulation-primary-strong);
  font-weight: 850;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;""",
"""  padding: 8px 14px;
  border: 1px solid var(--k-tint-gold-strong);
  border-radius: var(--k-radius-pill);
  background: var(--k-tint-gold);
  color: var(--k-ink-terracotta);
  font-weight: var(--k-weight-bold);
  font-size: var(--k-size-kicker);
  letter-spacing: var(--k-tracking-kicker);
  text-transform: uppercase;""",
),
# P5 h1 group (hero/setup-preview/setup-panel)
(
"""  margin: 0;
  max-width: 820px;
  font-size: clamp(3rem, 8vw, 6.4rem);
  line-height: 0.9;
  letter-spacing: -0.075em;
  color: var(--postulation-ink);""",
"""  margin: 0;
  max-width: 820px;
  font-size: var(--k-size-hero);
  line-height: 0.9;
  letter-spacing: var(--k-tracking-display);
  color: var(--postulation-ink);""",
),
# P6 subtitle
(
"""  font-size: clamp(1.35rem, 3vw, 2.45rem);
  line-height: 1.08;
  font-weight: 820;
  letter-spacing: -0.04em;
  color: #1e293b;""",
"""  font-size: clamp(1.35rem, 3vw, 2.45rem);
  line-height: 1.08;
  font-weight: 820;
  letter-spacing: -0.04em;
  color: var(--k-ink-espresso);""",
),
# P7 coverage strong
(
""".postulation-demo__coverage strong {
  color: var(--postulation-accent, #4f46e5);""",
""".postulation-demo__coverage strong {
  color: var(--k-ink-espresso);""",
),
# P8 button base
(
"""  border: 0;
  border-radius: 18px;
  min-height: 50px;
  padding: 15px 22px;
  font-weight: 850;""",
"""  border: 0;
  border-radius: var(--k-radius-btn);
  min-height: 50px;
  padding: 15px 22px;
  font-weight: var(--k-weight-bold);""",
),
# P9 primary CTA
(
""".postulation-demo__primary {
  color: white;
  background: linear-gradient(135deg, var(--postulation-primary), var(--postulation-primary-strong));
  box-shadow: 0 20px 42px rgba(79, 70, 229, 0.28);
}""",
""".postulation-demo__primary {
  color: var(--k-cta-ink);
  background: var(--k-cta-bg);
  box-shadow: var(--k-shadow-cta);
}""",
),
# P10 primary disabled
(
""".postulation-demo__primary:disabled {
  cursor: default;
  opacity: 0.76;
  transform: none;
}""",
""".postulation-demo__primary:disabled {
  cursor: not-allowed;
  opacity: 0.6;
  transform: none;
}""",
),
# P11 brief
(
"""  padding: clamp(20px, 3vw, 30px);
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 34px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.94), rgba(255,255,255,0.66)),
    rgba(255, 255, 255, 0.8);
  box-shadow: 0 28px 70px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(16px);""",
"""  padding: clamp(20px, 3vw, 30px);
  border: 1px solid var(--k-divider);
  border-radius: var(--k-radius-panel);
  background: rgba(255, 255, 255, 0.82);
  box-shadow: var(--k-shadow-soft);
  backdrop-filter: blur(16px);""",
),
# P12 brief rows
(
"""  gap: 18px;
  padding: 16px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 22px;
  background: rgba(248, 250, 252, 0.82);
}""",
"""  gap: 18px;
  padding: 16px;
  border: 1px solid var(--k-divider);
  border-radius: var(--k-radius-card);
  background: rgba(255, 255, 255, 0.6);
}""",
),
# P13 brief-link hover
(
""".postulation-demo__brief-link:hover {
  border-color: rgba(79, 70, 229, 0.42);
  background: #ffffff;""",
""".postulation-demo__brief-link:hover {
  border-color: var(--k-tint-gold-strong);
  background: #ffffff;""",
),
# P14 shared surface shadow (cards/privacy/setup/hud/camera/game)
(
"""  border: 1px solid var(--postulation-line);
  background: var(--postulation-surface);
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(14px);
}""",
"""  border: 1px solid var(--postulation-line);
  background: var(--postulation-surface);
  box-shadow: var(--k-shadow-soft);
  backdrop-filter: blur(14px);
}""",
),
# P15 card radius
(
""".postulation-demo__card {
  min-height: 190px;
  padding: 24px;
  border-radius: 28px;
}""",
""".postulation-demo__card {
  min-height: 190px;
  padding: 24px;
  border-radius: var(--k-radius-panel);
}""",
),
# P16 privacy radius
(
""".postulation-demo__privacy {
  margin-top: 18px;
  padding: 26px;
  border-radius: 28px;
}""",
""".postulation-demo__privacy {
  margin-top: 18px;
  padding: 26px;
  border-radius: var(--k-radius-panel);
}""",
),
# P17 privacy li
(
""".postulation-demo__privacy li {
  color: #475569;""",
""".postulation-demo__privacy li {
  color: var(--k-ink-medium);""",
),
# P18 setup-preview radius
(
"""  margin: 16px auto;
  padding: clamp(28px, 5vw, 54px);
  border-radius: 36px;
  display: grid;
  align-content: center;""",
"""  margin: 16px auto;
  padding: clamp(28px, 5vw, 54px);
  border-radius: var(--k-radius-panel);
  display: grid;
  align-content: center;""",
),
# P19 report-preview
(
"""  border: 1px solid var(--postulation-line);
  border-radius: 36px;
  background: var(--postulation-surface);
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(14px);""",
"""  border: 1px solid var(--postulation-line);
  border-radius: var(--k-radius-panel);
  background: var(--postulation-surface);
  box-shadow: var(--k-shadow-soft);
  backdrop-filter: blur(14px);""",
),
# P20 report-preview h1
(
""".postulation-demo__report-preview h1 {
  margin: 0;
  font-size: clamp(2.4rem, 7vw, 5.2rem);
  line-height: 0.92;
  letter-spacing: -0.07em;
}""",
""".postulation-demo__report-preview h1 {
  margin: 0;
  font-size: var(--k-size-hero);
  line-height: 0.92;
  letter-spacing: var(--k-tracking-display);
}""",
),
# P21 report-grid div
(
""".postulation-demo__report-grid div {
  padding: 14px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 18px;
  background: rgba(248, 250, 252, 0.82);
}""",
""".postulation-demo__report-grid div {
  padding: 14px;
  border: 1px solid var(--k-divider);
  border-radius: var(--k-radius-card);
  background: rgba(255, 255, 255, 0.6);
}""",
),
# P22 report-text
(
"""  max-height: 320px;
  margin: 0;
  padding: 18px;
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  background: #0f172a;
  color: #e2e8f0;""",
"""  max-height: 320px;
  margin: 0;
  padding: 18px;
  border-radius: var(--k-radius-card);
  border: 1px solid var(--k-border-ghost);
  background: var(--k-bg-dark-deep);
  color: var(--k-text-cream-dim);""",
),
# P23 report-error
(
""".postulation-demo__report-error {
  margin: 0;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(239, 68, 68, 0.1);
  color: #991b1b;""",
""".postulation-demo__report-error {
  margin: 0;
  padding: 12px 14px;
  border-radius: var(--k-radius-card);
  background: var(--k-status-error-soft);
  color: var(--k-status-error);""",
),
# P24 setup-steps span
(
""".postulation-demo__setup-steps span {
  padding: 10px 12px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.06);
  color: #334155;""",
""".postulation-demo__setup-steps span {
  padding: 10px 12px;
  border-radius: var(--k-radius-pill);
  background: var(--k-tint-gold);
  color: var(--k-ink-espresso);""",
),
# P25 setup panel/side radius
(
""".postulation-demo__setup-panel,
.postulation-demo__setup-side {
  border-radius: 34px;
  padding: clamp(24px, 4vw, 42px);
}""",
""".postulation-demo__setup-panel,
.postulation-demo__setup-side {
  border-radius: var(--k-radius-panel);
  padding: clamp(24px, 4vw, 42px);
}""",
),
# P26 setup-panel h1
(
""".postulation-demo__setup-panel h1 {
  font-size: clamp(2.6rem, 7vw, 5.5rem);
}""",
""".postulation-demo__setup-panel h1 {
  font-size: var(--k-size-hero);
}""",
),
# P27–P39: eliminadas (2026-09-07, post-H2) — las reglas
# .postulation-demo__hud* fueron retiradas por H2 (BehindTheScenesMiniHud);
# el feedback de señal ahora vive en .postulation-demo__signal-hint* (P78–P81).
# P40 camera card
(
"""  border-radius: 22px;
  padding: 12px;
  border: 1.5px solid rgba(49, 46, 129, 0.24);
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.1);""",
"""  border-radius: var(--k-radius-card);
  padding: 12px;
  border: 1.5px solid var(--k-divider);
  background: rgba(255, 255, 255, 0.96);
  box-shadow: var(--k-shadow-soft);""",
),
# P41 camera preview
(
"""  object-fit: cover;
  border-radius: 16px;
  background: linear-gradient(135deg, #111827, #312e81);""",
"""  object-fit: cover;
  border-radius: var(--k-radius-card);
  background: linear-gradient(135deg, var(--k-bg-dark-deep), var(--k-card-navy));""",
),
# P42 camera card strong
(
""".postulation-demo__camera-card strong {
  display: block;
  margin-bottom: 4px;
  color: #1e293b;
}""",
""".postulation-demo__camera-card strong {
  display: block;
  margin-bottom: 4px;
  color: var(--k-ink-espresso);
}""",
),
# P43 device select
(
""".postulation-demo__device-label select {
  min-height: 46px;
  border: 1.5px solid rgba(49, 46, 129, 0.45);
  border-radius: 14px;
  padding: 10px 12px;
  background: #ffffff;
  color: var(--postulation-ink);
  font-weight: 800;
  outline: none;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.08);
}""",
""".postulation-demo__device-label select {
  min-height: 46px;
  border: 1.5px solid var(--k-divider);
  border-radius: var(--k-radius-btn);
  padding: 10px 12px;
  background: #ffffff;
  color: var(--postulation-ink);
  font-weight: 800;
  outline: none;
  box-shadow: var(--k-shadow-soft);
}""",
),
# P44 device select focus
(
""".postulation-demo__device-label select:focus-visible {
  border-color: var(--postulation-primary);
  box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.12);
}""",
""".postulation-demo__device-label select:focus-visible {
  border-color: var(--k-accent-sand);
  box-shadow: 0 0 0 4px var(--k-tint-gold);
}""",
),
# P45 game header radius
(
""".postulation-demo__game-header {
  border-radius: 26px;""",
""".postulation-demo__game-header {
  border-radius: var(--k-radius-panel);""",
),
# P46 game progress color
(
""".postulation-demo__game-progress {
  display: grid;
  gap: 8px;
  justify-items: end;
  white-space: nowrap;
  color: #334155;
}""",
""".postulation-demo__game-progress {
  display: grid;
  gap: 8px;
  justify-items: end;
  white-space: nowrap;
  color: var(--k-ink-espresso);
}""",
),
# P47 progress dots
(
""".postulation-demo__progress-dots span {
  width: 11px;
  height: 11px;
  border-radius: 999px;
  background: #cbd5e1;
}""",
""".postulation-demo__progress-dots span {
  width: 11px;
  height: 11px;
  border-radius: var(--k-radius-pill);
  background: var(--k-divider);
}""",
),
# P48 game stage radius
(
""".postulation-demo__game-stage {
  min-height: 0;
  height: 100%;
  overflow: auto;
  overflow-x: hidden;
  border-radius: 30px;""",
""".postulation-demo__game-stage {
  min-height: 0;
  height: 100%;
  overflow: auto;
  overflow-x: hidden;
  border-radius: var(--k-radius-panel);""",
),
# P49 report shared surfaces
(
"""  border: 1px solid var(--postulation-line);
  border-radius: 32px;
  background: var(--postulation-surface);
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(14px);
}""",
"""  border: 1px solid var(--postulation-line);
  border-radius: var(--k-radius-panel);
  background: var(--postulation-surface);
  box-shadow: var(--k-shadow-soft);
  backdrop-filter: blur(14px);
}""",
),
# P50 report screen container
(
""".postulation-demo__report-screen {
  width: min(1180px, calc(100% - 32px));""",
""".postulation-demo__report-screen {
  width: min(var(--k-container), calc(100% - 32px));""",
),
# P51 report hero h1
(
""".postulation-demo__report-hero h1 {
  margin: 14px 0 14px;
  max-width: 820px;
  font-size: clamp(2.5rem, 7vw, 5.6rem);
  line-height: 0.9;
  letter-spacing: -0.075em;
}""",
""".postulation-demo__report-hero h1 {
  margin: 14px 0 14px;
  max-width: 820px;
  font-size: var(--k-size-hero);
  line-height: 0.9;
  letter-spacing: var(--k-tracking-display);
}""",
),
# P52 report status card (navy: dato frio sobre calido)
(
""".postulation-demo__report-status-card {
  padding: 20px;
  border-radius: 26px;
  background: linear-gradient(135deg, rgba(79, 70, 229, 0.12), rgba(6, 182, 212, 0.1));
  border: 1px solid rgba(79, 70, 229, 0.18);
}""",
""".postulation-demo__report-status-card {
  padding: 20px;
  border-radius: var(--k-radius-card);
  background: var(--k-card-navy);
  border: 1px solid var(--k-border-ghost);
  box-shadow: var(--k-shadow-float);
}""",
),
# P53 status card span
(
""".postulation-demo__report-status-card span {
  display: inline-flex;
  margin-bottom: 12px;
  padding: 7px 10px;
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.14);
  color: #047857;
  font-size: 0.76rem;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}""",
""".postulation-demo__report-status-card span {
  display: block;
  margin-bottom: 12px;
  color: var(--k-accent-sand);
  font-size: 0.76rem;
  font-weight: 900;
  letter-spacing: 0.06em;
  line-height: 1.5;
  text-transform: uppercase;
}""",
),
# P54 status card strong + p + blocked
(
""".postulation-demo__report-status-card strong {
  display: block;
  overflow-wrap: anywhere;
  color: var(--postulation-primary-strong);
  font-size: 1.05rem;
  margin-bottom: 10px;
}""",
""".postulation-demo__report-status-card strong {
  display: block;
  overflow-wrap: anywhere;
  color: var(--k-text-cream);
  font-size: 1.05rem;
  margin-bottom: 10px;
}

.postulation-demo__report-status-card p {
  color: var(--k-text-card-navy);
}

.postulation-demo__report-status-card--blocked {
  background: var(--k-status-error-soft);
  border-color: color-mix(in srgb, var(--k-status-error) 34%, transparent);
  box-shadow: none;
}

.postulation-demo__report-status-card--blocked span {
  color: var(--k-status-error);
}

.postulation-demo__report-status-card--blocked strong {
  color: var(--k-ink-espresso);
}

.postulation-demo__report-status-card--blocked p {
  color: var(--k-ink-medium);
}""",
),
# P55 fixture banner
(
"""  padding: 18px 22px;
  border: 1px solid rgba(245, 158, 11, 0.32);
  border-radius: 24px;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.14), rgba(255, 255, 255, 0.84));
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.06);""",
"""  padding: 18px 22px;
  border: 1px solid color-mix(in srgb, var(--k-status-warn) 34%, transparent);
  border-radius: var(--k-radius-card);
  background: linear-gradient(135deg, var(--k-status-warn-soft), rgba(255, 255, 255, 0.84));
  box-shadow: var(--k-shadow-soft);""",
),
# P56 fixture banner strong
(
""".postulation-demo__fixture-banner strong {
  color: #92400e;""",
""".postulation-demo__fixture-banner strong {
  color: var(--k-status-warn);""",
),
# P57 executive summary background
(
""".postulation-demo__executive-summary {
  padding: 22px;
  display: grid;
  gap: 18px;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.02), rgba(79, 70, 229, 0.08)), var(--postulation-surface);
}""",
""".postulation-demo__executive-summary {
  padding: 22px;
  display: grid;
  gap: 18px;
  background: linear-gradient(135deg, transparent, var(--k-tint-gold)), var(--postulation-surface);
}""",
),
# P58 exec summary head strong
(
"""  min-height: 34px;
  padding: 8px 12px;
  border: 1px solid rgba(16, 185, 129, 0.28);
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.12);
  color: #047857;""",
"""  min-height: 34px;
  padding: 8px 12px;
  border: 1px solid color-mix(in srgb, var(--k-status-ok) 28%, transparent);
  border-radius: var(--k-radius-pill);
  background: var(--k-status-ok-soft);
  color: var(--k-status-ok);""",
),
# P59 executive card
(
""".postulation-demo__executive-card {
  min-width: 0;
  padding: 16px;
  border: 1px solid rgba(79, 70, 229, 0.16);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
}""",
""".postulation-demo__executive-card {
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--k-divider);
  border-radius: var(--k-radius-card);
  background: rgba(255, 255, 255, 0.82);
  box-shadow: var(--k-shadow-soft);
}""",
),
# P60 executive card h3
(
""".postulation-demo__executive-card h3 {
  margin: 8px 0;
  color: #1e293b;""",
""".postulation-demo__executive-card h3 {
  margin: 8px 0;
  color: var(--k-ink-espresso);""",
),
# P61 quality/talent/game-result shared
(
""".postulation-demo__quality-card,
.postulation-demo__talent-card,
.postulation-demo__game-result-card {
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.84);
  box-shadow: 0 12px 34px rgba(15, 23, 42, 0.06);
}""",
""".postulation-demo__quality-card,
.postulation-demo__talent-card,
.postulation-demo__game-result-card {
  border: 1px solid var(--k-divider);
  border-radius: var(--k-radius-card);
  background: rgba(255, 255, 255, 0.84);
  box-shadow: var(--k-shadow-soft);
}""",
),
# P62 quality card tones
(
""".postulation-demo__quality-card--ok { border-color: rgba(16, 185, 129, 0.34); }
.postulation-demo__quality-card--warn { border-color: rgba(245, 158, 11, 0.36); }
.postulation-demo__quality-card--danger { border-color: rgba(239, 68, 68, 0.36); }""",
""".postulation-demo__quality-card--ok { border-color: color-mix(in srgb, var(--k-status-ok) 34%, transparent); }
.postulation-demo__quality-card--warn { border-color: color-mix(in srgb, var(--k-status-warn) 36%, transparent); }
.postulation-demo__quality-card--danger { border-color: color-mix(in srgb, var(--k-status-error) 36%, transparent); }""",
),
# P63 demo environment
(
""".postulation-demo__demo-environment {
  padding: 16px;
  border: 1px solid rgba(79, 70, 229, 0.18);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.76);
}""",
""".postulation-demo__demo-environment {
  padding: 16px;
  border: 1px solid var(--k-divider);
  border-radius: var(--k-radius-card);
  background: rgba(255, 255, 255, 0.76);
}""",
),
# P64 evidence warning
(
""".postulation-demo__evidence-warning {
  padding: 12px 16px;
  border: 1px solid rgba(217, 119, 6, 0.34);
  border-radius: 16px;
  background: #fffbeb;
  color: #78350f;""",
""".postulation-demo__evidence-warning {
  padding: 12px 16px;
  border: 1px solid color-mix(in srgb, var(--k-status-warn) 34%, transparent);
  border-radius: var(--k-radius-card);
  background: color-mix(in srgb, var(--k-status-warn) 10%, white);
  color: var(--k-status-warn);""",
),
# P65 section h2 group
(
"""  margin: 0;
  letter-spacing: -0.025em;
  color: #1e293b;
}""",
"""  margin: 0;
  letter-spacing: -0.025em;
  color: var(--k-ink-espresso);
}""",
),
# P66 talent score
(
""".postulation-demo__talent-score {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  color: white;
  background: linear-gradient(135deg, var(--postulation-primary), var(--postulation-accent));""",
""".postulation-demo__talent-score {
  width: 64px;
  height: 64px;
  border-radius: var(--k-radius-card);
  display: grid;
  place-items: center;
  color: var(--k-text-cream);
  background: linear-gradient(135deg, var(--k-bg-dark), var(--k-card-navy));""",
),
# P67 talent score provisional
(
""".postulation-demo__talent-score--provisional {
  align-content: center;
  gap: 1px;
  padding: 6px 4px;
  border: 1px solid rgba(79, 70, 229, 0.28);
  background: #eef2ff;""",
""".postulation-demo__talent-score--provisional {
  align-content: center;
  gap: 1px;
  padding: 6px 4px;
  border: 1px solid var(--k-tint-gold-strong);
  background: var(--k-tint-gold);""",
),
# P68 provisional strong
(
""".postulation-demo__talent-score--provisional strong {
  color: #312e81;""",
""".postulation-demo__talent-score--provisional strong {
  color: var(--k-ink-espresso);""",
),
# P69 provisional tag
(
""".postulation-demo__provisional-tag {
  display: inline-flex;
  width: max-content;
  margin-bottom: 7px;
  padding: 4px 7px;
  border: 1px solid rgba(79, 70, 229, 0.2);
  border-radius: 999px;
  background: #eef2ff;
  color: #4338ca;""",
""".postulation-demo__provisional-tag {
  display: inline-flex;
  width: max-content;
  margin-bottom: 7px;
  padding: 4px 7px;
  border: 1px solid var(--k-tint-gold-strong);
  border-radius: var(--k-radius-pill);
  background: var(--k-tint-gold);
  color: var(--k-ink-terracotta);""",
),
# P70 measurement explainer
(
""".postulation-demo__measurement-explainer {
  margin-top: 10px;
  padding: 10px;
  border: 1px solid rgba(79, 70, 229, 0.16);
  border-radius: 14px;
  background: #f8fafc;
}""",
""".postulation-demo__measurement-explainer {
  margin-top: 10px;
  padding: 10px;
  border: 1px solid var(--k-divider);
  border-radius: var(--k-radius-iconbox);
  background: rgba(255, 255, 255, 0.6);
}""",
),
# P71 game feedback
(
""".postulation-demo__game-feedback {
  margin-top: 16px;
  padding: 14px;
  border: 1px solid rgba(14, 165, 233, 0.24);
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.1), rgba(255, 255, 255, 0.86));
}""",
""".postulation-demo__game-feedback {
  margin-top: 16px;
  padding: 14px;
  border: 1px solid var(--k-divider);
  border-radius: var(--k-radius-card);
  background: linear-gradient(135deg, var(--k-tint-gold), rgba(255, 255, 255, 0.86));
}""",
),
# P72 game feedback strong
(
""".postulation-demo__game-feedback strong {
  display: inline-flex;
  margin-bottom: 8px;
  color: #0369a1;""",
""".postulation-demo__game-feedback strong {
  display: inline-flex;
  margin-bottom: 8px;
  color: var(--k-ink-terracotta);""",
),
# P73 caveat list
(
""".postulation-demo__caveat-list span {
  padding: 8px 10px;
  border-radius: 999px;
  background: rgba(245, 158, 11, 0.12);
  color: #92400e;""",
""".postulation-demo__caveat-list span {
  padding: 8px 10px;
  border-radius: var(--k-radius-pill);
  background: var(--k-status-warn-soft);
  color: var(--k-status-warn);""",
),
# P74 technical grid div
(
""".postulation-demo__technical-grid > div {
  padding: 18px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 20px;
  background: rgba(248, 250, 252, 0.74);
}""",
""".postulation-demo__technical-grid > div {
  padding: 18px;
  border: 1px solid var(--k-divider);
  border-radius: var(--k-radius-card);
  background: rgba(255, 255, 255, 0.6);
}""",
),
# P75 game progress span
(
""".postulation-demo__game-progress span {
  color: #475569;""",
""".postulation-demo__game-progress span {
  color: var(--k-ink-medium);""",
),
# P76 shell font-family (fuente del sistema)
(
"""  color: var(--postulation-ink);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}""",
"""  color: var(--postulation-ink);
  font-family: var(--k-font-sans);
}""",
),
# P77 fusion del anclaje H3 del guard: la regla base de pantalla espresso vive
#    arriba (P1); aqui solo queda el anclaje absoluto del toggle.
(
"""/* Guard de invitación (check/invalid): pill en la esquina superior derecha. */
.postulation-demo__invite-guard {
  position: relative;
  min-height: 100dvh;
}

.postulation-demo__invite-guard .krumm-lang-toggle {""",
"""/* Guard de invitación (check/invalid): pill en la esquina superior derecha.
   (El estilo base de la pantalla espresso vive arriba, junto al mapa :root
   H4.3; aquí solo el anclaje absoluto del toggle.) */
.postulation-demo__invite-guard .krumm-lang-toggle {""",
),
# P78 SignalErrorHint base (H2) — feedback sobre tokens de estado
(
""".postulation-demo__signal-hint {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  width: max-content;
  max-width: min(360px, calc(100vw - 48px));
  padding: 8px 12px;
  border-radius: 18px;
  background: rgba(255, 251, 235, 0.97);
  border: 1px solid rgba(180, 83, 9, 0.35);
  color: #78350f;""",
""".postulation-demo__signal-hint {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  width: max-content;
  max-width: min(360px, calc(100vw - 48px));
  padding: 8px 12px;
  border-radius: var(--k-radius-card);
  background: color-mix(in srgb, var(--k-card-cream) 96%, white);
  border: 1px solid color-mix(in srgb, var(--k-status-warn) 35%, transparent);
  color: var(--k-status-warn);""",
),
# P79 SignalErrorHint variante bloqueante
(
""".postulation-demo__signal-hint--blocking {
  background: rgba(254, 242, 242, 0.98);
  border-color: rgba(185, 28, 28, 0.4);
  color: #7f1d1d;
}""",
""".postulation-demo__signal-hint--blocking {
  background: color-mix(in srgb, var(--k-status-error) 7%, white);
  border-color: color-mix(in srgb, var(--k-status-error) 40%, transparent);
  color: var(--k-status-error);
}""",
),
# P80 botón "Detener evaluación"
(
""".postulation-demo__signal-hint-stop {
  flex: none;
  min-height: 34px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid rgba(185, 28, 28, 0.5);
  background: #ffffff;
  color: #b91c1c;""",
""".postulation-demo__signal-hint-stop {
  flex: none;
  min-height: 34px;
  padding: 6px 12px;
  border-radius: var(--k-radius-pill);
  border: 1px solid color-mix(in srgb, var(--k-status-error) 50%, transparent);
  background: #ffffff;
  color: var(--k-status-error);""",
),
# P81 hover del botón de detener
(
""".postulation-demo__signal-hint-stop:hover {
  background: #fee2e2;
}""",
""".postulation-demo__signal-hint-stop:hover {
  background: var(--k-status-error-soft);
}""",
),
]


def main():
    with open(PATH, encoding='utf-8') as f:
        css = f.read()

    failures = []
    for i, (old, new) in enumerate(PAIRS, 1):
        count = css.count(old)
        if count != 1:
            failures.append(f'P{i}: {count} occurrences (expected 1) — {old.splitlines()[0][:70]!r}')
            continue
        css = css.replace(old, new)

    if failures:
        print('ABORT — pairs no únicas:')
        for f_ in failures:
            print(' ', f_)
        sys.exit(1)

    with open(PATH, 'w', encoding='utf-8') as f:
        f.write(css)
    print(f'OK — {len(PAIRS)} pairs aplicadas en {PATH}')


if __name__ == '__main__':
    main()
