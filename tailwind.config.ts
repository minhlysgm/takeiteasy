import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)", surface: "var(--surface)", text: "var(--text)",
        bright: "var(--bright)", muted: "var(--muted)", line: "var(--line)",
        accent: "var(--accent)", "accent-soft": "var(--accent-soft)", "accent-strong": "var(--accent-strong)", ink: "var(--ink)", "ink-strong": "var(--ink-strong)",
        danger: "var(--danger)", sel: "var(--sel)", scrim: "var(--scrim)",
      },
      // Thẻ tra nghĩa hiện ra / đổi trạng thái: mờ dần vào. Đoạn mô tả hiện dần khi hình vẽ xong.
      // Chỗ dùng luôn kèm `motion-reduce:animate-none`.
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
      },
      // caption-in: mô tả hiện dần sau khi vẽ xong — cùng keyframe fade-in, chậm hơn một chút
      animation: { "fade-in": "fade-in 180ms ease-out", "caption-in": "fade-in 300ms ease-out" },
      fontFamily: {
        mono: ["var(--font-mono)", "SF Mono", "Menlo", "monospace"],
        hand: ["var(--font-hand)", "Comic Sans MS", "cursive"],
      },
    },
  },
  plugins: [],
};
export default config;
