import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
    "./widgets/**/*.{ts,tsx}",
    "./shared/**/*.{ts,tsx}",
    "./entities/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "var(--color-primary)",
        accent: "var(--color-accent)",
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        textMain: "var(--color-text-main)",
        textSecondary: "var(--color-text-secondary)",
        border: "var(--color-border)",
        error: "var(--color-error)",
      },
      borderRadius: {
        xl: "12px",
      },
      boxShadow: {
        soft: "0 4px 20px rgba(0,0,0,0.05)",
      },
    },
  },
  plugins: [],
};

export default config;
