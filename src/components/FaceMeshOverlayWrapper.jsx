import { useEffect, useRef } from 'react';
import FaceMeshOverlay from '../telemetry/FaceMeshOverlay.js';

export default function FaceMeshOverlayWrapper({ containerRef, landmarks, auRegionActivation, visible, quality }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    const container = containerRef?.current;
    if (!container) return;
    const overlay = new FaceMeshOverlay(container);
    overlayRef.current = overlay;
    overlay.mount();
    return () => overlay.unmount();
  }, [containerRef]);

  useEffect(() => {
    overlayRef.current?.update({ landmarks, auRegionActivation, visible, quality });
  }, [landmarks, auRegionActivation, visible, quality]);

  return null;
}