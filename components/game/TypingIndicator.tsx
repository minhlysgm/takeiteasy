export default function TypingIndicator() {
  return (
    <div className="self-start max-w-[80%] border-2 border-ink rounded-card bg-surface px-3 py-2 flex gap-1.5">
      {[0, 1, 2].map(i => (
        <span key={i} className="w-2 h-2 rounded-full bg-ink"
          style={{ animation: "dot-blink 1s infinite", animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  );
}
