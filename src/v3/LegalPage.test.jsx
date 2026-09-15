// t_legal (FASE E.1, KRU-117): spec de páginas /legal/privacidad y
// /legal/terminos. Verifica que (1) renderizan el documento canónico cargado
// de docs/legal/*.md (single source of truth — la página no duplica texto en
// JS), (2) el renderizador maneja el subconjunto de markdown usado por los
// documentos (título, secciones, listas, tablas, negrita), y (3) el footer
// de candidate enlaza a las rutas reales.
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';
import LegalPage from './LegalPage.jsx';
import { LEGAL_DOCS, LEGAL_DOC_TYPES } from './legalDocs.jsx';
import renderMarkdown, { renderInline } from './legalRender.jsx';
import { V3_COPY } from './v3Copy.js';
import fs from 'node:fs';

function renderLegal(docType) {
  return render(
    <LanguageProvider>
      <LegalPage docType={docType} />
    </LanguageProvider>,
  );
}

describe('LEGAL_DOCS (single source of truth → docs/legal/*.md)', () => {
  it('expone terminos y privacidad', () => {
    expect(LEGAL_DOC_TYPES).toEqual(['terminos', 'privacidad']);
    for (const type of LEGAL_DOC_TYPES) {
      expect(LEGAL_DOCS[type]).toHaveProperty('es');
      expect(LEGAL_DOCS[type].es).toContain('KRUMM');
    }
  });

  it('el contenido cargado coincide con el archivo canónico en disco', () => {
    // Garantía de single-source-of-truth: lo que renderiza la página ES el
    // mismo texto que está en docs/legal/*.md (sin copia en JS).
    const diskTerms = fs.readFileSync('docs/legal/terminos-de-servicio.md', 'utf8');
    const diskPrivacy = fs.readFileSync('docs/legal/politica-privacidad.md', 'utf8');
    expect(LEGAL_DOCS.terminos.es).toBe(diskTerms);
    expect(LEGAL_DOCS.privacidad.es).toBe(diskPrivacy);
  });
});

describe('renderMarkdown (subconjunto legal)', () => {
  it('renderiza título, secciones, listas y párrafos', () => {
    const md = [
      '# Términos de Servicio — KRUMM',
      '',
      '## 1. Aceptación de los Términos',
      '',
      'Al acceder o utilizar la **Plataforma**, usted acepta.',
      '',
      '- ítem uno',
      '- ítem dos',
      '',
      '1. primero',
      '2. segundo',
    ].join('\n');
    const nodes = renderMarkdown(md);
    const { container } = render(<div>{nodes}</div>);
    expect(container.querySelector('h1').textContent).toBe('Términos de Servicio — KRUMM');
    expect(container.querySelector('h2').textContent).toBe('1. Aceptación de los Términos');
    expect(container.querySelector('p strong').textContent).toBe('Plataforma');
    expect(container.querySelectorAll('ul li')).toHaveLength(2);
    expect(container.querySelectorAll('ol li')).toHaveLength(2);
  });

  it('renderiza tablas markdown', () => {
    const md = [
      '## Sección con tabla',
      '',
      '| A | B |',
      '|---|---|',
      '| x | y |',
      '| z | w |',
    ].join('\n');
    const nodes = renderMarkdown(md);
    const { container } = render(<div>{nodes}</div>);
    const table = container.querySelector('.legal-table');
    expect(table).toBeTruthy();
    expect(within(table).getByText('A')).toBeInTheDocument();
    expect(within(table).getByText('x')).toBeInTheDocument();
    expect(within(table).getByText('w')).toBeInTheDocument();
  });

  it('renderInline maneja negrita y código en línea', () => {
    render(<p>{renderInline('usa `score: null` y **humanReviewOnly**')}</p>);
    expect(screen.getByText('humanReviewOnly').tagName).toBe('STRONG');
    const code = screen.getByText('score: null');
    expect(code.tagName).toBe('CODE');
  });
});

describe('LegalPage (/legal/privacidad y /legal/terminos)', () => {
  it('renderiza el documento de términos con título y secciones desde disco', () => {
    renderLegal('terminos');
    expect(screen.getByRole('heading', { name: V3_COPY.es.pages.terminos.title })).toBeInTheDocument();
    // heading(1) del documento canónico + título de página
    expect(screen.getByRole('heading', { name: /Términos de Servicio — KRUMM/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Aceptación de los Términos/ })).toBeInTheDocument();
    expect(screen.getByText(/Ley de la República de Chile/)).toBeInTheDocument();
  });

  it('renderiza la política de privacidad con su sección de Cookies', () => {
    renderLegal('privacidad');
    expect(screen.getByRole('heading', { name: V3_COPY.es.pages.privacidad.title })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Cookies y tecnologías similares/ })).toBeInTheDocument();
    expect(screen.getByText(/No vendemos datos/)).toBeInTheDocument();
  });

  it('advierte que es plantilla legal sin revisión de abogados y versión gobernante', () => {
    renderLegal('terminos');
    expect(screen.getByText(V3_COPY.es.legal_governingNote)).toBeInTheDocument();
    expect(screen.getByText(V3_COPY.es.legal_notLawyerReviewed)).toBeInTheDocument();
  });

  it('chrome: marca + toggle de idioma + volver', () => {
    renderLegal('privacidad');
    expect(screen.getByRole('link', { name: V3_COPY.es.common_logoAlt })).toHaveAttribute('href', '/');
    expect(screen.getByRole('group', { name: /Idioma|Language/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: V3_COPY.es.common_backHome })).toHaveAttribute('href', '/portal');
  });
});