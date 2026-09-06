import { describe, it, expect } from 'vitest';
import {
  TANGRAM_SILHOUETTE,
  buildTangramSlots,
  buildTangramTray,
  toPixels,
  slotVerticesPx,
  trayVerticesPx,
  coveragePercent,
} from './tangramStages.js';

describe('tangramStages — slots por nivel', () => {
  it('genera tantos slots como pieceCount del nivel', () => {
    expect(buildTangramSlots(1)).toHaveLength(4);
    expect(buildTangramSlots(4)).toHaveLength(7);
  });

  it('cada slot tiene posición, rotación y shapeId coherente con una forma conocida', () => {
    const slots = buildTangramSlots(2);
    slots.forEach((slot) => {
      expect(slot.slotId).toBeTruthy();
      expect(slot.position).toHaveLength(2);
      expect(typeof slot.rotationDeg).toBe('number');
      expect(slot.shapeId).toBeTruthy();
    });
  });

  it('silueta es un polígono con 4 vértices dentro de [0,1]', () => {
    expect(TANGRAM_SILHOUETTE).toHaveLength(4);
    TANGRAM_SILHOUETTE.forEach(([x, y]) => {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(1);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(1);
    });
  });
});

describe('tangramStages — bandeja y drawing', () => {
  it('Genera piezas para el nivel con trayPosition dentro de [0,1] y unique pieceId', () => {
    const tray = buildTangramTray(2, 600, 400);
    expect(tray.length).toBeGreaterThan(0);
    const ids = new Set(tray.map((p) => p.pieceId));
    expect(ids.size).toBe(tray.length);
    tray.forEach((p) => {
      expect(p.trayPosition[0]).toBeGreaterThanOrEqual(0);
      expect(p.trayPosition[0]).toBeLessThanOrEqual(1);
      expect(p.trayPosition[1]).toBeGreaterThanOrEqual(0);
      expect(p.trayPosition[1]).toBeLessThanOrEqual(1);
      expect(p.snappedSlotId).toBeNull();
    });
  });

  it('convierte coordenadas relativas a px', () => {
    expect(toPixels([0.5, 0.5], 200, 100)).toEqual([100, 50]);
  });

  it('slotVerticesPx devuelve vértices absolutos del slot', () => {
    const slot = buildTangramSlots(1)[0];
    const verts = slotVerticesPx(slot, 600, 400);
    expect(verts.length).toBe(3); // triángulo
    verts.forEach(([x, y]) => {
      expect(Number.isFinite(x)).toBe(true);
      expect(Number.isFinite(y)).toBe(true);
    });
  });

  it('trayVerticesPx devuelve polígono para la pieza en bandeja', () => {
    const piece = buildTangramTray(1, 600, 400)[0];
    const verts = trayVerticesPx(piece, 600, 400);
    expect(verts.length).toBeGreaterThanOrEqual(3);
  });
});

describe('tangramStages — cobertura', () => {
  it('0% sin piezas encajadas', () => {
    const slots = buildTangramSlots(2);
    expect(coveragePercent([], slots)).toBe(0);
  });

  it('100% cuando todas las piezas están en su slot', () => {
    const slots = buildTangramSlots(1);
    const placed = slots.map((slot, i) => ({ pieceId: `P${i}`, snappedSlotId: slot.slotId }));
    expect(coveragePercent(placed, slots)).toBe(100);
  });

  it('no duplica cobertura por slots repetidos', () => {
    const slots = buildTangramSlots(1);
    const placed = [
      { pieceId: 'p1', snappedSlotId: slots[0].slotId },
      { pieceId: 'p2', snappedSlotId: slots[0].slotId },
    ];
    expect(coveragePercent(placed, slots)).toBe(25); // 1/4 slots únicos
  });
});