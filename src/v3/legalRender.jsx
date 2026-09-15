// t_legal (FASE E.1, KRU-117): renderizador mínimo de Markdown para las
// páginas /legal/privacidad y /legal/terminos. Renderiza SOLO el subconjunto
// que usan los documentos canónicos de docs/legal (título #, secciones ##,
// subsecciones ###, párrafos con **negrita** y `código`, listas - y numeradas,
// ---, y tablas |). Es puro y testable; no introduce un parser externo.
// Fuente de verdad: docs/legal/*.md (import ?raw); esta página nunca duplica
// el texto legal en JS.
//
// Patrón de bloques soportado:
//   # Título
//   ## Sección / ### Subsección
//   ---
//   Párrafo con **negrita** y `inline`.
//   - ítem 1
//   1. ítem numerado
//   | A | B |
//   |---|---|
//   | x | y |
import React from 'react';

// Divide un bloque en nodos inline, manejando **negrita** y `código` en línea.
export function renderInline(text) {
  const nodes = [];
  // Re. pasadas sobre tokens **bold** y `code`; el resto es texto plano.
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**')) {
      nodes.push(<strong key={key += 1}>{token.slice(2, -2)}</strong>);
    } else {
      nodes.push(<code key={key += 1}>{token.slice(1, -1)}</code>);
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

function isTableSeparator(line) {
  return /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(line) && line.includes('-');
}

// Renderiza el markdown de una documento legal completo.
export default function renderMarkdown(markdown) {
  const lines = String(markdown || '').split('\n');
  const out = [];
  let i = 0;
  let listType = null; // 'ul' | 'ol'
  let listKey = 0;
  let listItems = [];

  const flushList = () => {
    if (listItems.length > 0) {
      const Tag = listType === 'ol' ? 'ol' : 'ul';
      out.push(
        <Tag key={`list-${listKey += 1}`}>
          {listItems.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </Tag>,
      );
      listItems = [];
      listType = null;
    }
  };

  const flushTable = (start, headerCols) => {
    // Acumula filas de datos hasta una línea no-tabla o fin.
    const rows = [headerCols];
    let j = start;
    while (j < lines.length) {
      const line = lines[j];
      if (!line.trim().startsWith('|')) break;
      const cells = line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
      rows.push(cells);
      j += 1;
    }
    const header = rows[0];
    out.push(
      <div className="legal-table" role="table" key={`table-${i}`}>
        <div className="legal-table__head" role="rowgroup">
          <div className="legal-table__row" role="row">
            {header.map((cell, idx) => (
              <div className="legal-table__cell legal-table__cell--head" role="columnheader" key={idx}>{renderInline(cell)}</div>
            ))}
          </div>
        </div>
        <div role="rowgroup">
          {rows.slice(1).map((cells, ridx) => (
            <div className="legal-table__row" role="row" key={ridx}>
              {cells.map((cell, cidx) => (
                <div className="legal-table__cell" role="cell" key={cidx}>{renderInline(cell)}</div>
              ))}
            </div>
          ))}
        </div>
      </div>,
    );
    return j;
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      i += 1;
      continue;
    }
    if (trimmed === '---' || /^---\s*$/.test(trimmed)) {
      flushList();
      out.push(<hr key={`hr-${i}`} />);
      i += 1;
      continue;
    }
    const h1 = /^#\s+(.*)$/.exec(trimmed);
    if (h1) {
      flushList();
      out.push(<h1 key={`h1-${i}`}>{renderInline(h1[1])}</h1>);
      i += 1;
      continue;
    }
    const h2 = /^##\s+(.*)$/.exec(trimmed);
    if (h2) {
      flushList();
      out.push(<h2 key={`h2-${i}`}>{renderInline(h2[1])}</h2>);
      i += 1;
      continue;
    }
    const h3 = /^###\s+(.*)$/.exec(trimmed);
    if (h3) {
      flushList();
      out.push(<h3 key={`h3-${i}`}>{renderInline(h3[1])}</h3>);
      i += 1;
      continue;
    }
    // Tabla: la fila actual empieza con | y la siguiente es el separador.
    if (trimmed.startsWith('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      flushList();
      const headerCols = trimmed.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
      i = flushTable(i + 2, headerCols);
      continue;
    }
    const bullet = /^[-*]\s+(.*)$/.exec(trimmed);
    if (bullet) {
      if (listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(renderInline(bullet[1]));
      i += 1;
      continue;
    }
    const num = /^\d+[.)]\s+(.*)$/.exec(trimmed);
    if (num) {
      if (listType !== 'ol') flushList();
      listType = 'ol';
      listItems.push(renderInline(num[1]));
      i += 1;
      continue;
    }
    flushList();
    out.push(<p key={`p-${i}`}>{renderInline(trimmed)}</p>);
    i += 1;
  }
  flushList();
  return out;
}