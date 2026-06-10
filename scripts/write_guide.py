# Write ReferenceGuide.jsx from scratch
content = open('/mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/test-mpfl/src/components/ReferenceGuide.jsx.bak', 'r').read() if __import__('os').path.exists('/mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/test-mpfl/src/components/ReferenceGuide.jsx.bak') else None

jsx = '''import React, { useState } from 'react';

function Section({title,children}){
  const [open,setOpen]=useState(false);
  return(
    <div className="guide-section">
      <div className="guide-hdr" onClick={()=>setOpen(!open)} style={{cursor:'pointer',userSelect:'none'}}>
        <span className="guide-arrow">{open?'▼':'▶'}</span>
        <span className="guide-title">{title}</span>
      </div>
      {open&&<div className="guide-body">{children}</div>}
    </div>
  );
}

export default function ReferenceGuide(){
  return(
    <section className="panel reference-guide" style={{marginTop:'32px'}}>
      <div className="panel-heading"><h2>📖 Guía de referencia</h2></div>
      <p className="caption">Documentación de todos los indicadores con sus fuentes académicas y fórmulas de cálculo.</p>
    </section>
  );
}'''

with open('/mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/test-mpfl/src/components/ReferenceGuide.jsx', 'w') as f:
    f.write(jsx)
print('minimal guide written')