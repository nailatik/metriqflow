/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#4F46E5",
        accent: "#7C3AED",
        bg: "#F9FAFB",
        surface: "#FFFFFF",      // карточки
        textMain: "#111827",
        textSecondary: "#6B7280",
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
