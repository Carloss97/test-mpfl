// t_1c27edbf (V0 fase v3): placeholder honesto por página de la fase.
// El contenido real llega en V1–V4; V0 garantiza que cada ruta existe,
// renderiza su shell y su nota "próxima iteración" bilingüe (plan maestro
// §4 riesgos 1–4: no inventar roles, datos ni promesas).
import React from 'react';

export default function V3Placeholder({ page, eyebrow, backTo, backLabel }) {
  return (
    <div className="v3-placeholder">
      {eyebrow ? <p className="v3-placeholder__eyebrow">{eyebrow}</p> : null}
      <h1>{page.title}</h1>
      {page.note ? <p className="v3-placeholder__note">{page.note}</p> : null}
      {backTo ? (
        <a className="v3-back" href={backTo}>
          <span aria-hidden="true">←</span> {backLabel}
        </a>
      ) : null}
    </div>
  );
}
