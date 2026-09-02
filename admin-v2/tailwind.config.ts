import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Vazirmatn', 'Tahoma', 'Arial', 'sans-serif'],
      },
      colors: {
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        paper: "rgb(var(--color-paper) / <alpha-value>)",
        brand: "rgb(var(--color-brand) / <alpha-value>)",
        saffron: "rgb(var(--color-saffron) / <alpha-value>)",
        rosewood: "rgb(var(--color-rosewood) / <alpha-value>)",
      },
    },
  },
  plugins: [],
} satisfies Config;
