import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        page: "#FFFCF2", surface: "#FFFFFF", sunken: "#F2ECE0",
        ink: "#2B2118", "ink-soft": "#8A7F6E",
        en: "#FF7A00", vi: "#00B2A9", mastered: "#FFD029",
        ok: "#7ED957", no: "#FF4D3D",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      fontSize: {
        "2xs": "11px", xs: "12.5px", sm: "14px", base: "15.5px",
        lg: "18px", xl: "22px", "3xl": "32px",
      },
      borderRadius: { tile: "14px", card: "14px", chip: "20px" },
    },
  },
  plugins: [],
};
export default config;
