import { useEffect, useRef } from 'react';
import PoseOverlay from '../telemetry/PoseOverlay.js';

export default function PoseOverlayWrapper({ containerRef, landmarks }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    const container = containerRef?.current;
    if (!container) return;
    const overlay = new PoseOverlay(container);
    overlayRef.current = overlay;
    overlay.mount();
    return () => overlay.unmount();
  }, [containerRef]);

  useEffect(() => {
    overlayRef.current?.update({ landmarks });
  }, [landmarks]);

  return null;
}