#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Genera un PDF visual del handoff de lanzamiento KRUMM + plan de hitos.

Fuentes de verdad (del repo test-mpfl):
  - docs/plans/2026-08-25-launch-handoff.md
  - docs/plans/2026-08-25-launch-milestones-plan.md
"""
import datetime
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Flowable,
    Preformatted, KeepTogether,
)
from reportlab.pdfgen import canvas

# Datos del roadmap (extraídos de los .md)
START = datetime.date(2026, 8, 25)
END = datetime.date(2027, 3, 1)
TODAY = datetime.date(2026, 8, 27)

# (clave, nombre, inicio, fin, estado, paralelo)
# estado: done | prog | pend
PHASES = [
    ("M0", "Consolidación repo + baseline", datetime.date(2026, 8, 31), datetime.date(2026, 9, 2),  "done", False),
    ("M1", "Infra base AWS",                datetime.date(2026, 9, 3),  datetime.date(2026, 9, 8),  "done", False),
    ("M2", "Backend aggregate-only",        datetime.date(2026, 9, 9),  datetime.date(2026, 9, 22), "pend", False),
    ("M3", "Invitaciones + consentimiento", datetime.date(2026, 9, 23), datetime.date(2026, 9, 29), "pend", False),
    ("M4", "Recruiter Dashboard v1 real",   datetime.date(2026, 9, 30), datetime.date(2026, 10, 9), "pend", False),
    ("M5", "Seguridad / privacidad / CI",   datetime.date(2026, 10, 12),datetime.date(2026, 10, 23),"pend", False),
    ("M6", "Hardening + beta → LANZAMIENTO",datetime.date(2026, 10, 26),datetime.date(2026, 11, 6), "pend", False),
    ("G",  "Mejora juegos/UI-UX (paralelo)",datetime.date(2026, 9, 1),  datetime.date(2026, 10, 31),"prog", True),
    ("T",  "Revisión teórica señales (paralelo)", datetime.date(2026, 9, 1), datetime.date(2026, 10, 31), "prog", True),
    ("P1", "Observabilidad CloudWatch (paralelo)", datetime.date(2026, 10, 1), datetime.date(2026, 10, 31), "pend", True),
    ("P2", "Protocolo R-7 validación (paralelo)", datetime.date(2026, 9, 1), datetime.date(2027, 2, 28), "pend", True),
]

# ---------------------------------------------------------------------------
# Estilos
# ---------------------------------------------------------------------------
styles = getSampleStyleSheet()
H1 = ParagraphStyle("H1", parent=styles["Heading1"], fontSize=18, spaceAfter=4,
                    textColor=colors.HexColor("#0d2c54"), leading=22)
SUB = ParagraphStyle("SUB", parent=styles["Normal"], fontSize=9.5, textColor=colors.HexColor("#455a75"),
                     spaceAfter=2, leading=12)
H2 = ParagraphStyle("H2", parent=styles["Heading2"], fontSize=13, spaceBefore=10, spaceAfter=4,
                    textColor=colors.HexColor("#0d2c54"), leading=16)
BODY = ParagraphStyle("BODY", parent=styles["Normal"], fontSize=9, leading=12, spaceAfter=3)
SMALL = ParagraphStyle("SMALL", parent=styles["Normal"], fontSize=8, leading=10)
CELL = ParagraphStyle("CELL", parent=styles["Normal"], fontSize=8, leading=10)
CELLB = ParagraphStyle("CELLB", parent=styles["Normal"], fontSize=8, leading=10, fontName="Helvetica-Bold")
MONO = ParagraphStyle("MONO", parent=styles["Code"], fontSize=8, leading=10.5,
                      textColor=colors.HexColor("#1b3a2b"))

C_DONE = colors.HexColor("#2e7d32")
C_PROG = colors.HexColor("#f9a825")
C_PEND = colors.HexColor("#1565c0")
C_PARA = colors.HexColor("#6a1b9a")
C_TODAY = colors.HexColor("#c62828")
C_GRID = colors.HexColor("#cfd8dc")
C_HEADBG = colors.HexColor("#0d2c54")
C_ALT = colors.HexColor("#eef2f7")

STATE_LABEL = {"done": "Completada", "prog": "En progreso", "pend": "Pendiente"}

# ---------------------------------------------------------------------------
# Gantt flowable
# ---------------------------------------------------------------------------
class Gantt(Flowable):
    def __init__(self, phases, start, end, today, width, row_h=0.62 * cm):
        super().__init__()
        self.phases = phases
        self.start = start
        self.end = end
        self.today = today
        self.width = width
        self.row_h = row_h
        self.label_w = 5.3 * cm
        self.pad_top = 0.55 * cm
        self.axis_h = 0.5 * cm
        self.legend_h = 0.55 * cm
        self.h = (self.pad_top + self.axis_h + len(phases) * self.row_h +
                  self.legend_h + 0.2 * cm)

    def _x(self, d):
        span = (self.end - self.start).days
        off = (d - self.start).days
        return self.label_w + (off / span) * (self.width - self.label_w - 0.3 * cm)

    def wrap(self, *a):
        return (self.width, self.h)

    def draw(self):
        c = self.canv
        y_top = self.h
        # panel background
        c.setFillColor(colors.HexColor("#f7f9fc"))
        c.roundRect(0, 0, self.width, self.h, 6, stroke=0, fill=1)

        # --- eje de meses ---
        y_axis = y_top - self.pad_top - self.axis_h
        c.setFont("Helvetica", 7)
        cur = datetime.date(self.start.year, self.start.month, 1)
        while cur <= self.end:
            x = self._x(cur)
            c.setStrokeColor(C_GRID)
            c.setLineWidth(0.5)
            c.line(x, y_top - self.pad_top - self.axis_h - len(self.phases) * self.row_h,
                   x, y_top - self.pad_top - self.axis_h)
            c.setFillColor(colors.HexColor("#37474f"))
            lbl = cur.strftime("%b").capitalize()
            if cur.month == 1 or cur.month == 8 and cur.year == self.start.year:
                lbl = f"{cur.year}"
            c.drawCentredString(x + (self._month_step() / 2), y_axis + 2, lbl)
            # siguiente mes
            if cur.month == 12:
                cur = datetime.date(cur.year + 1, 1, 1)
            else:
                cur = datetime.date(cur.year, cur.month + 1, 1)

        # --- filas de fases ---
        y = y_top - self.pad_top - self.axis_h
        for i, (key, name, s, e, st, para) in enumerate(self.phases):
            ry = y - i * self.row_h
            # etiqueta
            c.setFillColor(colors.HexColor("#0d2c54"))
            c.setFont("Helvetica-Bold", 8)
            c.drawString(0.15 * cm, ry - self.row_h + 5, key)
            c.setFont("Helvetica", 7.5)
            c.setFillColor(colors.HexColor("#263238"))
            c.drawString(0.15 * cm, ry - self.row_h + 14, name[:34])
            # barra
            bx = self._x(s)
            bw = max(self._x(e) - bx, 3)
            col = C_PARA if para else {"done": C_DONE, "prog": C_PROG, "pend": C_PEND}[st]
            c.setFillColor(col)
            c.setFillAlpha(0.92)
            c.roundRect(bx, ry - self.row_h + 4, bw, self.row_h - 7, 3, stroke=0, fill=1)
            c.setFillAlpha(1.0)
            # texto de estado dentro/fin de barra
            c.setFillColor(colors.white)
            c.setFont("Helvetica-Bold", 6.5)
            if st == "done":
                c.drawCentredString(bx + bw / 2, ry - self.row_h + 6, "✓")
            elif st == "prog":
                c.drawCentredString(bx + bw / 2, ry - self.row_h + 6, "…")
            # fin de barra: fecha corta
            c.setFillColor(colors.HexColor("#37474f"))
            c.setFont("Helvetica", 6)
            c.drawRightString(bx + bw + 2, ry - self.row_h + 6, e.strftime("%d/%m"))

        # --- linea "Hoy" ---
        tx = self._x(self.today)
        c.setStrokeColor(C_TODAY)
        c.setLineWidth(1.2)
        c.setDash(3, 2)
        c.line(tx, y_top - self.pad_top - self.axis_h - len(self.phases) * self.row_h,
               tx, y_top - self.pad_top - self.axis_h)
        c.setDash()
        c.setFillColor(C_TODAY)
        c.setFont("Helvetica-Bold", 6.5)
        c.drawCentredString(tx, y_top - self.pad_top - self.axis_h + 1, "HOY")

        # --- leyenda ---
        ly = 0.18 * cm + 4
        items = [("done", "Completada"), ("prog", "En progreso"), ("pend", "Pendiente"),
                 ("para", "Paralelo (G/T/P1/P2)"), ("hoy", "Hoy")]
        lx = 0.2 * cm
        for kind, lab in items:
            col = {"done": C_DONE, "prog": C_PROG, "pend": C_PEND, "para": C_PARA, "hoy": C_TODAY}[kind]
            c.setFillColor(col)
            if kind == "hoy":
                c.setLineWidth(1.2)
                c.setStrokeColor(col)
                c.setDash(2, 2)
                c.line(lx, ly + 2, lx + 0.3 * cm, ly + 2)
                c.setDash()
            else:
                c.roundRect(lx, ly, 0.28 * cm, 0.28 * cm, 2, stroke=0, fill=1)
            c.setFillColor(colors.HexColor("#263238"))
            c.setFont("Helvetica", 7)
            c.drawString(lx + 0.35 * cm, ly, lab)
            lx += 0.35 * cm + c.stringWidth(lab, "Helvetica", 7) + 0.45 * cm

    def _month_step(self):
        return (self.width - self.label_w - 0.3 * cm) / ((self.end - self.start).days / 30.4)


# ---------------------------------------------------------------------------
# Helpers de tabla
# ---------------------------------------------------------------------------
def header_style(extra=None):
    base = [
        ("BACKGROUND", (0, 0), (-1, 0), C_HEADBG),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#b0bec5")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, C_ALT]),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ]
    if extra:
        base += extra
    return TableStyle(base)


def cell(t, bold=False):
    return Paragraph(t, CELLB if bold else CELL)


# ---------------------------------------------------------------------------
# Construcción del documento
# ---------------------------------------------------------------------------
OUT = "/mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/test-mpfl/docs/plans/2026-08-25-launch-handoff-and-milestones.pdf"

doc = SimpleDocTemplate(
    OUT, pagesize=landscape(A4),
    leftMargin=1.2 * cm, rightMargin=1.2 * cm,
    topMargin=1.0 * cm, bottomMargin=1.0 * cm,
    title="KRUMM — Handoff de Lanzamiento + Hitos",
    author="Hermes Agent",
)
W = doc.width
E = []

# --- Encabezado ---
E.append(Paragraph("KRUMM — Handoff de Lanzamiento + Plan de Hitos", H1))
E.append(Paragraph(
    "Piloto B2B controlado (~primera semana nov 2026) · Repo <b>test-mpfl</b> · "
    "Ruta producto <b>/postulaciones-demo</b> · Fecha handoff 2026-08-25", SUB))
E.append(Paragraph(
    "Estado de partida: <b>R-0 → R-6d completadas</b> (405 tests, build/audit limpios) · "
    "Sin backend real; HR dashboard sintético · Claims <b>descriptive_only / humanReviewOnly</b>", SUB))
E.append(Spacer(1, 0.15 * cm))

# --- Gantt ---
E.append(Paragraph("Roadmap visual — fases M0–M6 + G/T/P1/P2", H2))
gantt = Gantt(PHASES, START, END, TODAY, W)
E.append(gantt)
E.append(Spacer(1, 0.2 * cm))

# --- Tabla resumen de fases ---
E.append(Paragraph("Resumen de fases", H2))
res_rows = [
    [cell("Fase", True), cell("Nombre", True), cell("Duración", True),
     cell("Fechas aprox.", True), cell("Estado", True)],
    [cell("M0"), cell("Consolidación repo + baseline"), cell("2–3 días"), cell("31 ago – 2 sep"), cell("✓ Completada (26/08)")],
    [cell("M1"), cell("Infra base AWS (S3+CloudFront+IAM+Billing)"), cell("3–4 días"), cell("3 – 8 sep"), cell("✓ Completada (27/08)")],
    [cell("M2"), cell("Backend aggregate-only"), cell("2 sem"), cell("9 – 22 sep"), cell("Pendiente (checklist listo)")],
    [cell("M3"), cell("Invitaciones + consentimiento"), cell("1 sem"), cell("23 – 29 sep"), cell("Pendiente")],
    [cell("M4"), cell("Recruiter Dashboard v1 real"), cell("1–1.5 sem"), cell("30 sep – 9 oct"), cell("Pendiente")],
    [cell("M5"), cell("Seguridad / privacidad / CI guards"), cell("1.5–2 sem"), cell("12 – 23 oct"), cell("Pendiente")],
    [cell("M6"), cell("Hardening + beta → LANZAMIENTO"), cell("1 sem"), cell("26–30 oct (≈3–6 nov)"), cell("Pendiente")],
    [cell("G"), cell("Mejora juegos/UI-UX (paralelo)"), cell("4–5 sem"), cell("sep – oct"), cell("… En progreso (G.1/G.3/G.6 ✓, oleada W1–W3/W5)")],
    [cell("T"), cell("Revisión teórica señales (paralelo)"), cell("3–4 sem"), cell("sep – oct"), cell("… En progreso (T.1/T.2 ✓)")],
    [cell("P1"), cell("Observabilidad CloudWatch (paralelo)"), cell("1 sem"), cell("oct"), cell("Pendiente")],
    [cell("P2"), cell("Protocolo R-7 validación (paralelo)"), cell("3–5 meses"), cell("sep 2026 – feb 2027"), cell("Pendiente")],
]
t = Table(res_rows, colWidths=[1.4 * cm, 6.6 * cm, 2.6 * cm, 4.2 * cm, W - 14.8 * cm])
t.setStyle(header_style())
E.append(t)
E.append(Paragraph(
    "<b>Regla de orden:</b> G y T deben cerrar antes de M5/M6 (congelar producto para hardening/beta). "
    "Si compiten por tiempo, G prioriza UX del flujo candidato; T prioriza calidad de señal local.", SMALL))

# --- Estado actual detallado ---
E.append(Paragraph("Estado actual por fase (evidencia real)", H2))
st_rows = [
    [cell("Fase", True), cell("Estado y evidencia", True)],
    [cell("M0 ✓"),
     cell("Consolidada en <b>aef0806</b>; binarios AWS fuera de tracking (<b>3382fae</b>). "
          "Gates: 405/405 tests, build OK, audit 0 vuln, smoke Playwright 5/5. "
          "Corregida regresión i18n de <i>c3989de</i> (fallback useLanguage ES-first, "
          "UnifiedGameBattery restaurado, TeamCoordination ES-first) + tests desactualizados.")],
    [cell("M1 ✓"),
     cell("Cerrada 27/08: frontend staging (S3 privado + OAC + CloudFront, headers CSP/HSTS, SPA rewrite, "
          "<b>byte-ídem</b>, gates navegador desktop+móvil) + <b>IAM mín. privilegio</b> (rol "
          "<i>krumm-staging-frontend-deploy</i> scoped S3+CloudFront staging; permission set + assignment "
          "SUCCEEDED; e2e SSO→rol reservado→assume-role con controles +/−) + <b>presupuesto $25/mes</b> con "
          "alarmas 80%/100% (SNS→email). Runbook idempotente: <b>scripts/m1-iam-billing-deploy.sh</b>. "
          "Único item abierto: Route53/ACM (dominio propio).")],
    [cell("G …"),
     cell("<b>G.1 ✓</b> (audit UX: 18 hallazgos P01–P08 + L01–L08). <b>G.3 ✓</b> y <b>G.6 ✓</b> — oleada de calidad "
          "W1–W3/W5 (27/08): temas por juego (Láser \"Órbita\", Globo \"Cielo\", Rutas \"Urbano\", Faro pulido) + "
          "<i>GamePips</i> + botones unificados KRUMM (W1); animaciones CSS con <i>prefers-reduced-motion</i>: haz "
          "pulsante, overlays nivel + intersticios, tensión/burst globo, token animado, entradas Faro, SFX WebAudio "
          "default-OFF con toggle (W2); micro-instrucciones animadas ≤15s <i>GameMicroIntro</i> sin telemetría previa "
          "(W3); jerarquía score-vs-caveat en reporte (W5). <b>G.2 …</b> (copy L01/L04 + micro-intros + pips; pendiente "
          "práctica sin puntaje) · <b>G.4 …</b> (pacing Láser con overlays/intersticios; mecánicas intactas) · "
          "<b>G.5 …</b> (touch targets cerrados; pendiente teclado/breakpoints/foco). Decisiones usuario 27/08: L02 "
          "copy-only, L06 2 pasos, P08 BehindPanel se mantiene. Gates: 436/436, oxlint 0, build OK, audit 0, smoke "
          "desktop+móvil 0 errores/0 overflow.")],
    [cell("T …"),
     cell("<b>T.1 ✓</b> (matriz trazabilidad v2 — 2.º intento subagente 27/08): §10 en "
          "<i>docs/research/krumm-talent-game-behavior-mapping-technical-study.md</i> (285→581 líneas) — 66 métricas "
          "clasificadas (3 directa / 22 adyacente / 14 ambigua-no resuelta / 27 interna), 7 citas \"verificación "
          "pendiente\" explícitas, ninguna métrica facial \"directa\". <b>T.2 ✓</b> (audit sync local: 7 paths P1–P7, "
          "sin bugs activos; 6 tests regresión GREEN). T.3 (sanity cámara real) / T.4 (alimentado por las 14 filas "
          "\"ambigua\" de §10, incl. tensión leadership/communication Faro) / T.5 / T.6 pendientes.")],
    [cell("M2–M6, P1, P2"),
     cell("Pendientes. M2 checklist de entrada listo: reusa <i>src/assessment/finalAssessmentPayload.js</i> "
          "(validación server-side, verificado) + infra M1 activa (rol deploy, presupuesto). M4 conecta HR "
          "dashboard (hoy sintético) a sesiones reales, read-only, reglas null≠0. M5 añade CI privacy guard "
          "(scan-forbidden-keys) y ZAP 0 critical/high.")],
]
t = Table(st_rows, colWidths=[3.2 * cm, W - 3.2 * cm])
t.setStyle(header_style([("BACKGROUND", (0, 1), (0, 2), colors.HexColor("#e8f5e9")),
                         ("BACKGROUND", (0, 3), (0, 3), colors.HexColor("#fff8e1"))]))
E.append(t)

# --- Contratos / privacidad ---
E.append(Paragraph("Contratos inmutables y privacidad (no negociables)", H2))
priv = [
    "Baterías: <b>stable_dg</b> default/fallback intocable; original vía <b>?battery=original</b>; "
    "fixtures <b>?fixture=1[&battery=original]</b>.",
    "Contratos de telemetría intactos: game_event_v1, stimulus_shown/response/game_end, "
    "gameCorrelation.aggregate, assessment_feature_vector_v2, allowlist agregados por juego.",
    "Privacidad: nunca persistir video/frames/landmarks/keypoints/pointer samples/rutas reconstructivas/raw events.",
    "Señal ausente = desconocida/caveated, <b>nunca</b> desempeño bajo. Leadership/comunicación = not_measured (score: null). "
    "Adaptabilidad = insufficient. Claims descriptive_only hasta R-7 validado.",
    "Flags de gobernanza: humanReviewOnly / noAutomatedDecision / observationalOnly / privacySafe siempre presentes.",
]
for p in priv:
    E.append(Paragraph("• " + p, BODY))

# --- Riesgos ---
E.append(Paragraph("Riesgos y mitigaciones", H2))
risk_rows = [
    [cell("Riesgo", True), cell("Mitigación", True)],
    [cell("G/T se extienden más allá de oct"), cell("Congelar con lo que esté; lo no cerrado → backlog post-lanzamiento. M5/M6 no esperan.")],
    [cell("Legal/DPO demora firma DPIA"), cell("Lanzar piloto bajo consentimiento explícito reforzado + retención corta; DPIA firmada antes de escalar.")],
    [cell("SES sigue en sandbox"), cell("Invitaciones manuales por email propio durante beta; SES solo acelera escala.")],
    [cell("Desincronización de señales (T.2)"), cell("T.2 cerrado 27/08: sin desincronización activa (6 tests de regresión); P7 (contrato quality) monitorizado.")],
    [cell("Cambios G alteran métricas de juego"), cell("Regla dura: agregados allowlist inmutables; si una mecánica cambia una métrica, versionar feature vector + fixtures.")],
]
t = Table(risk_rows, colWidths=[7.5 * cm, W - 7.5 * cm])
t.setStyle(header_style())
E.append(t)

# --- AWS free tier ---
E.append(Paragraph("AWS free tier — mapeo por fase", H2))
aws_rows = [
    [cell("Servicio", True), cell("Fase", True), cell("Free tier", True)],
    [cell("S3 + CloudFront"), cell("M1"), cell("Hosting estático ~gratis a volumen piloto")],
    [cell("API Gateway HTTP + Lambda"), cell("M2"), cell("1M req/mes")],
    [cell("DynamoDB on-demand"), cell("M2"), cell("25 GB permanente")],
    [cell("SES"), cell("M3"), cell("62k emails/mes (salir de sandbox en sep)")],
    [cell("Cognito"), cell("M3"), cell("10k MAU")],
    [cell("EventBridge Scheduler + CloudWatch"), cell("M2/P1"), cell("Dentro de free tier")],
]
t = Table(aws_rows, colWidths=[7.5 * cm, 3 * cm, W - 10.5 * cm])
t.setStyle(header_style([("BACKGROUND", (0, 7), (-1, 7), colors.HexColor("#fff3e0"))]))
t.setStyle(header_style())
E.append(Paragraph("Evitar hasta Fase F: RDS, ECS/K8s, WAF (opcional), ELB.", SMALL))

# --- Comandos de gates ---
E.append(Paragraph("Comandos de gates (fijos)", H2))
code = (
    "NODE_ENV=test npx vitest run <focales> --pool=threads --reporter=default\n"
    "NODE_ENV=test npx vitest run --pool=threads --reporter=default   # suite completa\n"
    "npx oxlint src/postulation-demo src/tasks src/main.jsx src/assessment src/telemetry/gameCorrelation.js\n"
    "npm run build\n"
    "npm audit --audit-level=high --omit=dev\n"
    "git diff --check\n"
    "# Smoke dev (nunca NODE_ENV=production con Vite):\n"
    "NODE_ENV=development npx vite --host 127.0.0.1 --port 5173"
)
code_tbl = Table([[Preformatted(code, MONO)]], colWidths=[W])
code_tbl.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#eef6f0")),
    ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#9ccc9c")),
    ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ("TOPPADDING", (0, 0), (-1, -1), 6),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
]))
E.append(code_tbl)

E.append(Spacer(1, 0.2 * cm))
E.append(Paragraph(
    "Fuente: docs/plans/2026-08-25-launch-handoff.md + docs/plans/2026-08-25-launch-milestones-plan.md · "
    "Generado con reportlab.", SMALL))


def _footer(canvas, doc_):
    canvas.saveState()
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(colors.HexColor("#78909c"))
    canvas.drawString(doc_.leftMargin, 0.55 * cm,
                      "KRUMM — Handoff de Lanzamiento + Hitos · confidencial / uso interno")
    canvas.drawRightString(doc_.leftMargin + doc_.width, 0.55 * cm,
                           "pág. %d" % doc_.page)
    canvas.restoreState()


doc.build(E, onFirstPage=_footer, onLaterPages=_footer)
print("PDF generado:", OUT)
