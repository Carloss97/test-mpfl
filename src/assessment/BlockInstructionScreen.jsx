import React from 'react';

export default function BlockInstructionScreen({ block, totalBlocks = 0, onStartBlock, onCancel }) {
  if (!block) return null;
  return (
    <div className="dash-section-body">
      <h3>{block.label}</h3>
      <p className="caption">Bloque {block.index + 1} de {totalBlocks}. Trials: {block.trialCount}. Habilidad: {block.skill}.</p>
      <button type="button" className="primary" onClick={onStartBlock}>Iniciar bloque</button>
      {onCancel && <button type="button" className="secondary" onClick={onCancel}>Cancelar evaluación</button>}
    </div>
  );
}
