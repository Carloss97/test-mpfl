import React, { useCallback, useEffect, useRef } from 'react';

/**
 * FaceMeshOverlay — dibuja facial landmarks en tiempo real sobre un canvas
 * superpuesto al elemento <video>.
 *
 * Usa requestAnimationFrame para dibujo continuo y lee los landmarks
 * directamente de una ref para evitar problemas de closure con useCallback.
 *
 * Características:
 *  - Suavizado EMA de landmarks (reduce jitter)
 *  - Compensación de object-fit: cover
 *  - Regiones faciales coloreadas según activación de AUs
 *  - Leyenda de colores para AUs activas
 *  - Puntos de referencia + líneas de contorno + iris
 */

const FACE_CONNECTIONS = [
  ...Array.from({ length: 16 }, (_, i) => [i, i + 1]),
  [33, 41], [41, 48], [48, 55], [55, 62], [62, 70], [70, 77], [77, 84], [84, 91], [91, 98],
  [103, 109], [109, 116], [116, 123], [123, 130], [130, 137], [137, 144], [144, 151], [151, 158],
  [168, 169], [169, 170], [170, 171], [171, 172], [172, 173], [173, 174], [174, 175], [175, 176],
  [193, 196], [196, 199], [199, 202], [202, 205],
  [33, 160], [160, 158], [158, 156], [156, 154], [154, 153], [153, 145], [145, 144], [144, 163], [163, 33],
  [362, 387], [387, 385], [385, 383], [383, 381], [381, 380], [380, 374], [374, 373], [373, 390], [390, 362],
  [468, 469], [469, 470], [470, 471], [471, 468],
  [473, 474], [474, 475], [475, 476], [476, 473],
  [61, 67], [67, 73], [73, 79], [79, 85], [85, 91], [91, 95], [95, 99], [99, 103],
  [103, 106], [106, 109], [109, 113], [113, 117], [117, 121], [121, 125], [125, 129],
  [129, 132], [132, 135], [135, 138], [138, 141], [141, 144], [144, 147], [147, 61],
  [61, 187], [187, 186], [186, 185], [185, 184], [184, 183], [183, 80], [80, 81], [81, 82], [82, 13], [13, 14], [14, 15], [15, 16],
  [16, 77], [77, 192], [192, 191], [191, 190], [190, 189], [189, 188], [188, 61],
];

const AU_REGION_INDICES = {
  upper: [33, 41, 48, 55, 62, 70, 77, 84, 91, 98, 103, 109, 116, 123, 130, 137, 144, 151, 158],
  mid: [33, 160, 158, 156, 154, 153, 145, 144, 163, 362, 387, 385, 383, 381, 380, 374, 373, 390],
  lower: [61, 67, 73, 79, 85, 91, 95, 99, 103, 106, 109, 113, 117, 121, 125, 129, 132, 135, 138, 141, 144, 147],
  jaw: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
};

const REGION_COLORS = {
  upper: [116, 167, 255],
  mid: [255, 209, 102],
  lower: [77, 212, 172],
  jaw: [77, 212, 172],
};

const REGION_LABELS = { upper: 'Upper Face', mid: 'Mid Face', lower: 'Lower Face', jaw: 'Jaw' };

const POINT_RADIUS = 1.0;
const IRIS_RADIUS = 1.6;
const EMA_ALPHA = 0.35;

let smoothedLandmarks = null;

function emaSmooth(current, prev, alpha = EMA_ALPHA) {
  if (!prev || prev.length !== current.length) return new Float32Array(current);
  const result = new Float32Array(current.length);
  for (let i = 0; i < current.length; i++) {
    result[i] = prev[i] * alpha + current[i] * (1 - alpha);
  }
  return result;
}

function computeVideoOffset(video, containerW, containerH) {
  if (!video) return { ox: 0, oy: 0, scaleX: 1, scaleY: 1, drawW: containerW, drawH: containerH };
  const videoW = video.videoWidth || 640;
  const videoH = video.videoHeight || 480;
  if (!videoW || !videoH) return { ox: 0, oy: 0, scaleX: 1, scaleY: 1, drawW: containerW, drawH: containerH };
  const containerRatio = containerW / containerH;
  const videoRatio = videoW / videoH;
  if (videoRatio > containerRatio) {
    const drawH = containerH, drawW = containerH * videoRatio;
    return { ox: (containerW - drawW) / 2, oy: 0, scaleX: drawW / videoW, scaleY: drawH / videoH, drawW, drawH };
  } else {
    const drawW = containerW, drawH = containerW / videoRatio;
    return { ox: 0, oy: (containerH - drawH) / 2, scaleX: drawW / videoW, scaleY: drawH / videoH, drawW, drawH };
  }
}

export default function FaceMeshOverlay({ landmarks, videoRef, visible = true, auRegionActivation = {} }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const landmarksRef = useRef(null);
  const auRef = useRef({});

  // Keep refs in sync with props
  landmarksRef.current = landmarks;
  auRef.current = auRegionActivation;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const video = videoRef?.current;
    if (!canvas || !container || !visible) return;

    const rect = container.getBoundingClientRect();
    const cw = Math.floor(rect.width);
    const ch = Math.floor(rect.height);
    if (cw <= 0 || ch <= 0) return;

    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, cw, ch);

    // Read landmarks from ref (always fresh)
    const currentLandmarks = landmarksRef.current;
    if (!currentLandmarks || currentLandmarks.length < 3) return;

    smoothedLandmarks = emaSmooth(currentLandmarks, smoothedLandmarks);
    const { ox, oy, scaleX, scaleY } = computeVideoOffset(video, cw, ch);

    const count = smoothedLandmarks.length / 3;
    const points = [];
    for (let i = 0; i < count; i++) {
      const nx = smoothedLandmarks[i * 3];
      const ny = smoothedLandmarks[i * 3 + 1];
      points.push({
        x: ox + nx * cw * scaleX + (1 - scaleX) * cw * 0.5,
        y: oy + ny * ch * scaleY + (1 - scaleY) * ch * 0.5,
      });
    }

    const auAct = auRef.current;

    // ── Region glows ──
    for (const [region, indices] of Object.entries(AU_REGION_INDICES)) {
      const activation = auAct[region] ?? 0;
      if (activation < 0.03) continue;
      const [r, g, b] = REGION_COLORS[region];
      const alpha = Math.min(0.55, activation * 0.7);
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.strokeStyle = `rgba(${r},${g},${b},${Math.min(0.8, alpha + 0.2)})`;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      if (indices[0] < points.length) ctx.moveTo(points[indices[0]].x, points[indices[0]].y);
      for (let j = 1; j < indices.length; j++) {
        if (indices[j] < points.length) ctx.lineTo(points[indices[j]].x, points[indices[j]].y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // ── Connections ──
    ctx.strokeStyle = 'rgba(77,212,172,0.25)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (const [a, b] of FACE_CONNECTIONS) {
      if (a < points.length && b < points.length) {
        ctx.moveTo(points[a].x, points[a].y);
        ctx.lineTo(points[b].x, points[b].y);
      }
    }
    ctx.stroke();

    // ── Iris ──
    ctx.fillStyle = 'rgba(116,167,255,0.65)';
    for (let i = 468; i <= 477 && i < points.length; i++) {
      ctx.beginPath();
      ctx.arc(points[i].x, points[i].y, IRIS_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Points ──
    ctx.fillStyle = 'rgba(77,212,172,0.35)';
    for (let i = 0; i < points.length; i++) {
      if (i >= 468 && i <= 477) continue;
      ctx.beginPath();
      ctx.arc(points[i].x, points[i].y, POINT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── AU legend (top-left) ──
    let legendY = 14;
    ctx.font = '10px Inter, system-ui, sans-serif';
    for (const [region, activation] of Object.entries(auAct)) {
      if (activation < 0.05) continue;
      const [r, g, b] = REGION_COLORS[region] || [255, 255, 255];
      const label = REGION_LABELS[region] || region;
      const pct = Math.round(activation * 100);
      ctx.fillStyle = `rgba(${r},${g},${b},0.9)`;
      ctx.fillText(`${label}: ${pct}%`, 10, legendY);
      legendY += 14;
    }
  }, [videoRef, visible]); // Only depend on stable refs

  useEffect(() => {
    let raf;
    const loop = () => { draw(); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [draw]);

  if (!visible) return null;

  return (
    <div ref={containerRef} className="face-mesh-container">
      <canvas ref={canvasRef} className="face-mesh-overlay" aria-label="Facial landmarks overlay" />
    </div>
  );
}