import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FAF9F6",
        ink: "#111110",
        olive: "#7F8C4F",
        "olive-soft": "#A8B37E",
        line: "rgba(17,17,16,0.12)",
        bone: "#F3F2F2",
        char: "#201E1D",
        signal: "#EC3013",
        "signal-dark": "#B5230D",
        mute: "#4A4644",
        well: "#E4E2E0",
        night: "#111110",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-manrope)", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
        serif: ["var(--font-serif)", "serif"],
        jet: ["var(--font-jet)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
