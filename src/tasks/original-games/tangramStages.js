// Tangram EXP-TANGRAM-001 — plan de nivel: bandeja inicial (piezas esparcidas)
// y slots objetivo (posición en la silueta). Centralizado para TDD y para que el
// componente React solo pinte y despache eventos. Las posiciones están en unidades
// de "canvas lógico" (el componente las escala a px).

import {
  buildTangramLevelShapes,
  getTangramLevelParams,
  getShapeVertices,
} from './tangramTelemetry.js';

// Slots objetivo base (composición cuadrada aproximada). El nivel define qué
// slots están activos (los primeros N del pool según pieceCount).
const SLOT_LAYOUT = [
  // fila superior
  { shapeId: 'tri_large', rotationDeg: 0, x: 0.14, y: 0.18 },
  { shapeId: 'tri_large', rotationDeg: 180, x: 0.34, y: 0.18 },
  { shapeId: 'square', rotationDeg: 0, x: 0.55, y: 0.14 },
  { shapeId: 'tri_medium', rotationDeg: 90, x: 0.75, y: 0.18 },
  // fila inferior
  { shapeId: 'tri_small', rotationDeg: 0, x: 0.20, y: 0.62 },
  { shapeId: 'tri_small', rotationDeg: 180, x: 0.40, y: 0.62 },
  { shapeId: 'rhombus', rotationDeg: 0, x: 0.62, y: 0.58 },
  { shapeId: 'tri_medium', rotationDeg: 180, x: 0.80, y: 0.60 },
];

// Silueta objetivo (bounding polygon aproximado del cuadrado final).
export const TANGRAM_SILHOUETTE = Object.freeze([
  [0.10, 0.10], [0.85, 0.10], [0.85, 0.80], [0.10, 0.80],
]);

let slotUid = 0;

export function buildTangramSlots(level) {
  const params = getTangramLevelParams(level);
  const count = params?.pieceCount ?? 4;
  const slots = [];
  const usedShapes = [];
  for (let i = 0; i < count && i < SLOT_LAYOUT.length; i += 1) {
    const def = SLOT_LAYOUT[i];
    slotUid += 1;
    slots.push(Object.freeze({
      slotId: `TANGRAM_${level}_${i}_${slotUid}`,
      shapeId: def.shapeId,
      rotationDeg: def.rotationDeg,
      position: Object.freeze([def.x, def.y]),
      scale: 1,
      slotIndex: i,
    }));
    usedShapes.push(def.shapeId);
  }
  return Object.freeze(slots);
}

export function buildTangramTray(level, _width, _height) {
  // piezas en bandeja inferior, repartidas de forma estable
  const shapes = buildTangramLevelShapes(level);
  const n = Math.max(1, shapes.length);
  return Object.freeze(shapes.map((shapeId, i) => Object.freeze({
    pieceId: `PIEZA_${level}_${i}_${shapeId}`,
    shapeId,
    rotationDeg: 0,
    trayPosition: Object.freeze([0.08 + (i * (0.84 / n)), 0.92]),
    snappedSlotId: null,
    scale: 1,
  })));
}

// Convierte coordenadas relativas [0..1] a px según el viewport lógico.
export function toPixels([x, y], width, height) {
  return [Math.round(x * width), Math.round(y * height)];
}

export function slotVerticesPx(slot, width, height) {
  const verts = getShapeVertices(slot.shapeId, slot.rotationDeg, 60); // radio base ~60px
  const [cx, cy] = toPixels(slot.position, width, height);
  return verts.map(([x, y]) => [round(cx + x), round(cy + y)]);
}

function round(n) { return Math.round(n); }

export function trayVerticesPx(piece, width, height) {
  const verts = getShapeVertices(piece.shapeId, piece.rotationDeg, 40);
  const [cx, cy] = toPixels(piece.trayPosition, width, height);
  return verts.map(([x, y]) => [round(cx + x), round(cy + y)]);
}

// Polígono actual de una pieza en el lienzo (si está "en curso"): tray o en curso con offset.
export function polygonForPiece(piece, dragOffset, width, height) {
  if (piece.snappedSlotId) return null;
  const [px, py] = dragOffset ? [piece.dragX, piece.dragY] : toPixels(piece.trayPosition, width, height);
  const verts = getShapeVertices(piece.shapeId, piece.rotationDeg, 40);
  return verts.map(([x, y]) => [round(px + x), round(py + y)]);
}

export function coveragePercent(placedPieces, targetSlots) {
  if (!targetSlots?.length) return 0;
  const bySlot = new Set(placedPieces.map((p) => p.snappedSlotId).filter(Boolean));
  return Math.round((bySlot.size / targetSlots.length) * 100);
}
