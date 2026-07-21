export default function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 border-2 border-ink rounded-chip bg-surface px-2.5 py-1 text-xs font-display font-bold text-ink">
      {children}
    </span>
  );
}
