import type { Config } from "tailwindcss";

const config: Config = {
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
        primary: "#4F46E5",
        accent: "#7C3AED",
        bg: "#F9FAFB",
        surface: "#FFFFFF",
        textMain: "#111827",
        textSecondary: "#6B7280",
        border: "#E5E7EB",
        error: "#EF4444",
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
