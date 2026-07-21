"use client";
type Props = {
  children: React.ReactNode; onClick?: () => void;
  variant?: "primary" | "secondary"; type?: "button" | "submit"; disabled?: boolean;
};
export default function Button({ children, onClick, variant = "primary", type = "button", disabled }: Props) {
  const base = "font-display font-extrabold rounded-chip px-5 py-3 text-base transition-transform active:translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-50 disabled:pointer-events-none";
  const primary = "border-[3px] border-ink bg-en text-white active:shadow-none";
  const secondary = "border-2 border-ink bg-surface text-ink active:shadow-none";
  const style = variant === "primary" ? { boxShadow: "0 4px 0 #CC6200" } : { boxShadow: "0 4px 0 #D8D0C0" };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`${base} ${variant === "primary" ? primary : secondary}`} style={style}>
      {children}
    </button>
  );
}
