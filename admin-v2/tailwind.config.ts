import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Vazirmatn', 'Tahoma', 'Arial', 'sans-serif'],
      },
      colors: {
        ink: "#172026",
        paper: "#f7f8f5",
        brand: "#0f766e",
        saffron: "#d97706",
        rosewood: "#9f1239",
      },
    },
  },
  plugins: [],
} satisfies Config;
