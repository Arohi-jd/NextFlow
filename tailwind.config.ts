import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#0a0a0a",
        surface: "#111111",
        surfaceAlt: "#171717",
        accent: "#8b5cf6"
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(139, 92, 246, 0.35), 0 0 30px rgba(139, 92, 246, 0.18)"
      }
    }
  },
  plugins: []
};

export default config;