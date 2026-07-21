"use client";
import { useEffect, useState } from "react";
export default function Particles({ x, y, color }: { x: number; y: number; color: string }) {
  const [reduced, setReduced] = useState(false);
  useEffect(() => { setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches); }, []);
  if (reduced) return null;
  const n = 8;
  return (
    <>
      {Array.from({ length: n }).map((_, i) => {
        const ang = (i / n) * Math.PI * 2;
        const dx = Math.cos(ang) * 46, dy = Math.sin(ang) * 46;
        return (
          <span key={i} className="fixed z-50 pointer-events-none"
            style={{
              left: x, top: y, width: 10, height: 10, background: color,
              border: "2px solid #2B2118",
              // @ts-expect-error custom props
              "--dx": `${dx}px`, "--dy": `${dy}px`,
              animation: "particle .42s ease-out forwards",
            }} />
        );
      })}
    </>
  );
}
