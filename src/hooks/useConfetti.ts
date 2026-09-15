import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";

/**
 * Triggers a celebration confetti effect when the component mounts with valid results.
 * @param shouldFire - If false, confetti will not run. Defaults to true.
 */
export function useConfetti(shouldFire = true) {
  const hasFiredRef = useRef(false);

  useEffect(() => {
    if (!shouldFire || hasFiredRef.current) return;
    hasFiredRef.current = true;

    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899"],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899"],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    // Small delay so confetti appears as results render
    const timeoutId = setTimeout(() => {
      frame();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [shouldFire]);
}
