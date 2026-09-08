// t_1c27edbf (V0 fase v3): diccionario i18n base del chrome + placeholders.
// Fuente EN: referencia krumm_frontend.zip v2 (docs/spec/frontend-ref-v2/script.js,
// bloque "en"); ES: mismo bloque "es" de la referencia (reutilizado textualmente)
// + las páginas nuevas de la fase. Regla del plan maestro §3-V0: "Copys EN de la
// referencia + diccionario ES (t(es,en))".
import { describe, expect, it } from 'vitest';
import { V3_COPY, getV3Copy, flattenKeys } from './v3Copy.js';

function flatten(obj, prefix = '') {
  const out = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out.push(path);
    else if (value && typeof value === 'object') out.push(...flatten(value, path));
  }
  return out;
}

describe('v3Copy (fase v3 — i18n base)', () => {
  it('expone exactamente los idiomas en y es', () => {
    expect(Object.keys(V3_COPY).sort()).toEqual(['en', 'es']);
  });

  it('paridad: cada clave EN existe en ES y viceversa (misma arboleda)', () => {
    const enKeys = flatten(V3_COPY.en).sort();
    const esKeys = flatten(V3_COPY.es).sort();
    expect(esKeys).toEqual(enKeys);
  });

  it('sin strings vacíos ni placeholders sin traducir en ningún idioma', () => {
    for (const lang of ['en', 'es']) {
      for (const path of flatten(V3_COPY[lang])) {
        const value = path.split('.').reduce((node, key) => node[key], V3_COPY[lang]);
        expect(value.trim(), `${lang}.${path}`).not.toEqual('');
        expect(value, `${lang}.${path}`).not.toMatch(/\{\{|\{\w+\}\}/);
      }
    }
  });

  it('getV3Copy: devuelve el idioma pedido; fallback es (canónico del producto)', () => {
    expect(getV3Copy('es')).toBe(V3_COPY.es);
    expect(getV3Copy('en')).toBe(V3_COPY.en);
    // Idioma no soportado/ausente → ES (canónico: LanguageContext default 'es',
    // t(es,en) ES-primero). En la referencia el fallback era EN (estática).
    expect(getV3Copy('fr')).toBe(V3_COPY.es);
    expect(getV3Copy(undefined)).toBe(V3_COPY.es);
  });

  it('las 12 páginas de la fase tienen title (y note/backLabel donde aplique)', () => {
    const pageKeys = [
      'candidateHome', 'candidateAccess', 'jobs',
      'dashboard', 'processes', 'processDetail', 'processReport',
      'newRequest', 'requestDesign', 'requestUpload',
      'portal', 'companyAccess',
    ];
    for (const lang of ['en', 'es']) {
      for (const page of pageKeys) {
        expect(V3_COPY[lang].pages[page], `${lang}.pages.${page}`).toBeTruthy();
        expect(V3_COPY[lang].pages[page].title.trim()).not.toEqual('');
      }
      // notas de "próxima iteración" (placeholder honesto, plan maestro §4 riesgo 1-4)
      for (const page of ['candidateHome', 'candidateAccess', 'jobs']) {
        expect(V3_COPY[lang].pages[page].note).toBeTruthy();
        expect(V3_COPY[lang].pages[page].backLabel).toBeTruthy();
      }
      for (const page of ['processes', 'processDetail', 'processReport', 'newRequest', 'requestDesign', 'requestUpload']) {
        expect(V3_COPY[lang].pages[page].note).toBeTruthy();
        expect(V3_COPY[lang].pages[page].backLabel).toBeTruthy();
      }
      // hub: sin note (portal es navegable ya en V0; dashboard es el hub empresa)
      expect(V3_COPY[lang].pages.dashboard.note).toBeUndefined();
      expect(V3_COPY[lang].pages.portal.note).toBeUndefined();
      expect(V3_COPY[lang].pages.companyAccess.note).toBeUndefined();
    }
  });

  it('chrome candidato: help/privacy/terms + footer + eyebrow bilingües', () => {
    for (const lang of ['en', 'es']) {
      const copy = V3_COPY[lang];
      for (const key of ['cp_help', 'cp_helpText', 'cp_privacy', 'cp_terms', 'common_footerYear', 'cp_eyebrow']) {
        expect(copy[key], `${lang}.${key}`).toBeTruthy();
      }
    }
    // el footer es el mismo año en ambos idiomas (© 2026 KRUMM — referencia)
    expect(V3_COPY.en.common_footerYear).toContain('2026');
    expect(V3_COPY.es.common_footerYear).toContain('2026');
  });

  it('chrome empresa: nav, user chip demo, banner demo workspace bilingües', () => {
    for (const lang of ['en', 'es']) {
      const copy = V3_COPY[lang];
      for (const key of [
        'company_workspace', 'company_dashboard', 'company_newRequest', 'company_processes',
        'company_settings', 'company_help', 'company_account', 'company_notifications',
        'company_signOut', 'company_openNavigation', 'company_portalNavigation',
        'company_demoBadge', 'company_demoNotice',
        'company_userName', 'company_userOrg', 'company_userInitials',
        'company_previewTitle', 'company_previewText',
        'company_notificationsText', 'company_accountText', 'company_enterDemo',
      ]) {
        expect(copy[key], `${lang}.${key}`).toBeTruthy();
      }
    }
  });

  it('flattenKeys expone la arboleda plana (para tests de paridad externas)', () => {
    const flat = flattenKeys(V3_COPY.en);
    expect(flat).toContain('pages.dashboard.title');
    expect(flat).toContain('company_demoNotice');
    expect(flat.length).toBeGreaterThanOrEqual(40);
  });
});
