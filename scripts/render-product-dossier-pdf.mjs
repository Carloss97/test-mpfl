import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const root = '/mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/test-mpfl';
const sources = [
  {
    title: 'Índice del paquete documental',
    path: 'docs/product/README.md',
  },
  {
    title: 'Contrato de datos, señales e inferencia',
    path: 'docs/product/krumm-data-signal-inference-contract.md',
  },
  {
    title: 'Estado de desarrollo',
    path: 'docs/product/krumm-development-state-report.md',
  },
  {
    title: 'Línea de tiempo hacia producto real',
    path: 'docs/product/krumm-productization-roadmap.md',
  },
];

const htmlPath = resolve(root, 'docs/product/krumm-product-readiness-dossier.html');
const pdfPath = resolve(root, 'exports/krumm-product-readiness-dossier.pdf');

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderInline(value) {
  let text = escapeHtml(value);
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return text;
}

function isTableSeparator(line) {
  return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line.trim());
}

function splitTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function renderTable(lines, startIndex) {
  const rows = [];
  let index = startIndex;
  while (index < lines.length && /^\s*\|/.test(lines[index])) {
    rows.push(lines[index]);
    index += 1;
  }
  const header = splitTableRow(rows[0] ?? '');
  const bodyRows = rows.slice(1).filter((line) => !isTableSeparator(line)).map(splitTableRow);
  const headHtml = header.map((cell) => `<th>${renderInline(cell)}</th>`).join('');
  const bodyHtml = bodyRows.map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join('')}</tr>`).join('\n');
  return {
    html: `<div class="table-wrap"><table><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`,
    nextIndex: index,
  };
}

function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const html = [];
  let i = 0;
  let inFence = false;
  let fence = [];
  let listType = null;

  function closeList() {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  }

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      closeList();
      if (!inFence) {
        inFence = true;
        fence = [];
      } else {
        html.push(`<pre><code>${escapeHtml(fence.join('\n'))}</code></pre>`);
        inFence = false;
        fence = [];
      }
      i += 1;
      continue;
    }

    if (inFence) {
      fence.push(line);
      i += 1;
      continue;
    }

    if (!trimmed) {
      closeList();
      i += 1;
      continue;
    }

    if (/^\s*\|/.test(line) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      closeList();
      const rendered = renderTable(lines, i);
      html.push(rendered.html);
      i = rendered.nextIndex;
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      closeList();
      const level = Math.min(6, heading[1].length + 1);
      html.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      i += 1;
      continue;
    }

    const unordered = trimmed.match(/^[-*]\s+(.+)$/);
    if (unordered) {
      if (listType !== 'ul') {
        closeList();
        listType = 'ul';
        html.push('<ul>');
      }
      html.push(`<li>${renderInline(unordered[1])}</li>`);
      i += 1;
      continue;
    }

    const ordered = trimmed.match(/^\d+\.\s+(.+)$/);
    if (ordered) {
      if (listType !== 'ol') {
        closeList();
        listType = 'ol';
        html.push('<ol>');
      }
      html.push(`<li>${renderInline(ordered[1])}</li>`);
      i += 1;
      continue;
    }

    closeList();
    html.push(`<p>${renderInline(trimmed)}</p>`);
    i += 1;
  }
  closeList();
  return html.join('\n');
}

function buildDocument() {
  const sourceHtml = sources.map((source, index) => {
    const md = readFileSync(resolve(root, source.path), 'utf8');
    return `
      <section class="doc-section ${index > 0 ? 'page-break' : ''}">
        <div class="section-kicker">Fuente: ${escapeHtml(source.path)}</div>
        ${markdownToHtml(md)}
      </section>
    `;
  }).join('\n');

  const toc = sources.map((source, index) => `<li><span>${index + 1}</span><strong>${escapeHtml(source.title)}</strong><em>${escapeHtml(source.path)}</em></li>`).join('\n');

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>KRUMM Postulación — dossier de transición a producto</title>
  <style>
    @page { size: A4; margin: 14mm 12mm; }
    :root {
      --bg: #08111f;
      --panel: #111c2f;
      --ink: #182033;
      --muted: #617089;
      --line: #dbe3ef;
      --blue: #2458ff;
      --cyan: #1eb6d9;
      --green: #13a66b;
      --amber: #b67a08;
      --danger: #a53a3a;
      --paper: #ffffff;
      --soft: #f3f6fb;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--paper);
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.48;
      font-size: 11px;
    }
    a { color: var(--blue); text-decoration: none; }
    code { background: #eef3ff; color: #1d3b88; border-radius: 4px; padding: 0.05rem 0.28rem; font-size: 0.92em; }
    pre { background: #0a1322; color: #d7e6ff; border-radius: 12px; padding: 12px; white-space: pre-wrap; overflow-wrap: anywhere; }
    .cover {
      min-height: 270mm;
      padding: 28mm 18mm 18mm;
      background: radial-gradient(circle at 15% 15%, rgba(30, 182, 217, 0.34), transparent 34%), linear-gradient(145deg, #07111f 0%, #101c31 58%, #152846 100%);
      color: white;
      page-break-after: always;
      position: relative;
      overflow: hidden;
    }
    .cover:after {
      content: "";
      position: absolute;
      inset: auto -40mm -30mm auto;
      width: 170mm;
      height: 170mm;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 50%;
    }
    .brand { letter-spacing: 0.18em; text-transform: uppercase; color: #8edaf0; font-size: 10px; font-weight: 800; }
    h1 { font-size: 48px; line-height: 1.03; margin: 18mm 0 8mm; max-width: 176mm; letter-spacing: -0.025em; }
    .subtitle { font-size: 18px; line-height: 1.42; color: #e0edff; max-width: 168mm; }
    .meta-row { display: flex; flex-wrap: wrap; gap: 3mm; margin-top: 9mm; }
    .meta-pill { border: 1px solid rgba(255,255,255,0.22); background: rgba(255,255,255,0.08); color: #e8f3ff; border-radius: 999px; padding: 2.2mm 4mm; font-size: 11px; font-weight: 700; }
    .cover-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5mm; margin-top: 25mm; }
    .cover-card { background: rgba(255,255,255,0.11); border: 1px solid rgba(255,255,255,0.22); border-radius: 18px; padding: 7mm; min-height: 35mm; }
    .cover-card strong { display: block; font-size: 20px; margin-bottom: 2.5mm; color: #ffffff; }
    .cover-card span { color: #dbeaff; font-size: 12px; }
    .cover-note { position: absolute; left: 18mm; right: 18mm; bottom: 18mm; color: #d1dfef; border-top: 1px solid rgba(255,255,255,0.22); padding-top: 6mm; font-size: 11px; }
    .toc { page-break-after: always; padding: 4mm 2mm; }
    .toc h2 { font-size: 28px; margin: 0 0 8mm; }
    .toc ol { list-style: none; padding: 0; margin: 0; display: grid; gap: 4mm; }
    .toc li { display: grid; grid-template-columns: 12mm 1fr; gap: 5mm; border: 1px solid var(--line); border-radius: 14px; padding: 5mm; background: var(--soft); }
    .toc li span { display: grid; place-items: center; width: 11mm; height: 11mm; border-radius: 50%; background: var(--blue); color: white; font-weight: 900; }
    .toc li strong { display: block; font-size: 15px; }
    .toc li em { display: block; color: var(--muted); font-style: normal; margin-top: 1mm; }
    .executive-strip { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4mm; margin-top: 9mm; }
    .strip-card { border-left: 4px solid var(--cyan); background: #f5fbff; padding: 5mm; border-radius: 12px; }
    .doc-section { padding: 2mm 0; }
    .page-break { page-break-before: always; }
    .section-kicker { color: var(--muted); text-transform: uppercase; letter-spacing: 0.12em; font-size: 9px; font-weight: 800; margin: 0 0 3mm; }
    h2 { font-size: 24px; line-height: 1.12; color: #0d1a2e; margin: 10mm 0 4mm; page-break-after: avoid; }
    h3 { font-size: 17px; color: #102b5d; margin: 7mm 0 3mm; page-break-after: avoid; }
    h4 { font-size: 13px; color: #213653; margin: 5mm 0 2mm; page-break-after: avoid; }
    p { margin: 0 0 3mm; }
    ul, ol { margin: 0 0 4mm 5mm; padding-left: 5mm; }
    li { margin: 0 0 1.4mm; }
    .table-wrap { width: 100%; overflow: hidden; margin: 4mm 0 6mm; page-break-inside: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 8.6px; table-layout: auto; }
    th { background: #102341; color: #fff; text-align: left; padding: 2.4mm; border: 1px solid #263a59; font-weight: 800; }
    td { padding: 2.1mm; border: 1px solid var(--line); vertical-align: top; }
    tr:nth-child(even) td { background: #f7f9fd; }
    tr, td, th { page-break-inside: avoid; }
    hr { border: none; border-top: 1px solid var(--line); margin: 8mm 0; }
    .footer { position: fixed; bottom: 5mm; left: 12mm; right: 12mm; color: #8290a8; font-size: 8px; border-top: 1px solid #e2e8f2; padding-top: 2mm; }
    @media print {
      .page-break { break-before: page; }
      .cover { break-after: page; }
      .toc { break-after: page; }
    }
  </style>
</head>
<body>
  <section class="cover">
    <div class="brand">KRUMM Edge / Postulación</div>
    <h1>Dossier de transición a producto real</h1>
    <p class="subtitle">Entradas, salidas, elementos, indicadores, señales telemétricas, inferencia, estado de desarrollo y línea de tiempo para pasar de demo avanzada a producto piloto B2B validable.</p>
    <div class="meta-row">
      <span class="meta-pill">Fecha: 2026-07-20</span>
      <span class="meta-pill">Versión: product dossier v1</span>
      <span class="meta-pill">Estado: demo avanzada → producto piloto</span>
      <span class="meta-pill">Uso: revisión humana</span>
    </div>
    <div class="cover-grid">
      <div class="cover-card"><strong>Estado</strong><span>Demo técnica avanzada; no producto decisional.</span></div>
      <div class="cover-card"><strong>Ruta</strong><span>/postulaciones-demo</span></div>
      <div class="cover-card"><strong>Batería</strong><span>stable_dg + original_games controlada</span></div>
      <div class="cover-card"><strong>Principio</strong><span>Aggregate-only, revisión humana, R-7 antes de comparar.</span></div>
    </div>
    <div class="cover-note">Generado desde documentos fuente en <strong>docs/product/</strong>. Fecha de corte: <strong>2026-07-20</strong>. Este dossier no valida psicométricamente la batería ni autoriza decisión automática.</div>
  </section>
  <section class="toc">
    <h2>Contenido</h2>
    <ol>${toc}</ol>
    <div class="executive-strip">
      <div class="strip-card"><strong>Demo</strong><br/>Flujo, juegos y reporte funcionan para presentación controlada.</div>
      <div class="strip-card"><strong>Producto piloto</strong><br/>Requiere backend aggregate-only, privacidad formal, roles y operación.</div>
      <div class="strip-card"><strong>Validación</strong><br/>R-7 debe cerrar contenido, confiabilidad, fairness y criterio antes de claims fuertes.</div>
    </div>
  </section>
  ${sourceHtml}
  <div class="footer">KRUMM Postulación — Dossier producto · aggregate-only · human-review-only · sin decisión automatizada</div>
</body>
</html>`;
}

mkdirSync(dirname(htmlPath), { recursive: true });
mkdirSync(resolve(root, 'exports'), { recursive: true });
writeFileSync(htmlPath, buildDocument(), 'utf8');

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1240, height: 1754 }, deviceScaleFactor: 1 });
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: false,
    margin: { top: '12mm', right: '10mm', bottom: '12mm', left: '10mm' },
  });
  console.log(JSON.stringify({ htmlPath, pdfPath }, null, 2));
} finally {
  await browser.close();
}
