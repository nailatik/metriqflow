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
        primaryHover: "var(--color-primary-hover)",
        accent: "var(--color-accent)",
        onAccent: "var(--color-on-accent)",
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        surfaceMuted: "var(--color-surface-2)",
        textMain: "var(--color-text-main)",
        textSecondary: "var(--color-text-secondary)",
        border: "var(--color-border)",
        success: "var(--color-success)",
        error: "var(--color-error)",
        chart1: "var(--color-chart-1)",
        chart2: "var(--color-chart-2)",
        chart3: "var(--color-chart-3)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "var(--font-sans-cyr)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        xl: "14px",
        "2xl": "20px",
      },
      boxShadow: {
        soft: "0 4px 20px rgba(0,0,0,0.05)",
        card: "0 1px 2px rgba(28,25,23,0.04), 0 8px 24px rgba(28,25,23,0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
