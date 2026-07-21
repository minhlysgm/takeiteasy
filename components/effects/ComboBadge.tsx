"use client";
export default function ComboBadge({ combo }: { combo: number }) {
  if (combo < 2) return null;
  return (
    <div className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center">
      <span className="font-display font-extrabold text-3xl text-ink bg-mastered border-[3px] border-ink rounded-card px-4 py-1"
        style={{ animation: "combo-in .5s cubic-bezier(.2,1.5,.4,1) both" }}>
        Combo {combo}×!
      </span>
    </div>
  );
}
