// t_legal (FASE E.1, KRU-117): carga las páginas /legal/privacidad y
// /legal/terminos DESDE los documentos canónicos (docs/legal/*.md) vía
// import `?raw` de Vite. Garantía de no-duplicación: la página nunca aloja el
// texto legal en JS; si el documento cambia, la página cambia con él.
//
// Los documentos son la versión en español (gobernante; ley chilena). La
// página conserva ese contenido como fuente de verdad y advierte que la
// versión con fuerza legal es el texto en español — la UI no inventa una
// traducción "oficial" que no ha sido revisada por abogados.
import terminosEs from '../../docs/legal/terminos-de-servicio.md?raw';
import privacidadEs from '../../docs/legal/politica-privacidad.md?raw';

export const LEGAL_DOCS = Object.freeze({
  terminos: {
    es: terminosEs,
    governingLang: 'es',
  },
  privacidad: {
    es: privacidadEs,
    governingLang: 'es',
  },
});

export const LEGAL_DOC_TYPES = Object.freeze(['terminos', 'privacidad']);