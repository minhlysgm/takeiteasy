import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)", surface: "var(--surface)", text: "var(--text)",
        bright: "var(--bright)", muted: "var(--muted)", line: "var(--line)",
        accent: "var(--accent)", ink: "var(--ink)", "ink-strong": "var(--ink-strong)",
        danger: "var(--danger)", sel: "var(--sel)", scrim: "var(--scrim)",
      },
      fontFamily: {
        mono: ["var(--font-mono)", "SF Mono", "Menlo", "monospace"],
        hand: ["var(--font-hand)", "Comic Sans MS", "cursive"],
      },
    },
  },
  plugins: [],
};
export default config;
