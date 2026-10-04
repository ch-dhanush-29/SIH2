import { useState, useEffect, useRef } from 'react';

export interface PointerState {
  // Raw client coordinates
  x: number;
  y: number;
  // Normalized device coordinates: -1 to +1
  ndcX: number;
  ndcY: number;
  // Smoothed / lerped coordinates: -1 to +1
  smoothX: number;
  smoothY: number;
  // Light position (pixels)
  lightX: number;
  lightY: number;
}

export function useIntroPointer() {
  const [pointer, setPointer] = useState<PointerState>({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 500,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 : 400,
    ndcX: 0,
    ndcY: 0,
    smoothX: 0,
    smoothY: 0,
    lightX: typeof window !== 'undefined' ? window.innerWidth / 2 : 500,
    lightY: typeof window !== 'undefined' ? window.innerHeight / 2 : 400,
  });

  const stateRef = useRef(pointer);
  stateRef.current = pointer;

  const targetRef = useRef({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 500,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 : 400,
    ndcX: 0,
    ndcY: 0,
  });

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const w = window.innerWidth || 1000;
      const h = window.innerHeight || 800;

      targetRef.current = {
        x: e.clientX,
        y: e.clientY,
        ndcX: Math.max(-1, Math.min(1, (e.clientX / w) * 2 - 1)),
        ndcY: Math.max(-1, Math.min(1, (e.clientY / h) * 2 - 1)),
      };
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    // Smooth animation loop using lerp damping (target 60 FPS)
    let animId: number;
    const lerpFactor = 0.085; // smooth damping
    const lightLerp = 0.06;

    const tick = () => {
      const cur = stateRef.current;
      const tgt = targetRef.current;

      const nextSmoothX = cur.smoothX + (tgt.ndcX - cur.smoothX) * lerpFactor;
      const nextSmoothY = cur.smoothY + (tgt.ndcY - cur.smoothY) * lerpFactor;
      const nextLightX = cur.lightX + (tgt.x - cur.lightX) * lightLerp;
      const nextLightY = cur.lightY + (tgt.y - cur.lightY) * lightLerp;

      setPointer({
        x: tgt.x,
        y: tgt.y,
        ndcX: tgt.ndcX,
        ndcY: tgt.ndcY,
        smoothX: nextSmoothX,
        smoothY: nextSmoothY,
        lightX: nextLightX,
        lightY: nextLightY,
      });

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      cancelAnimationFrame(animId);
    };
  }, []);

  return pointer;
}
