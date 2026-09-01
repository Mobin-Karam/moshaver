import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Vazirmatn', 'Tahoma', 'Arial', 'sans-serif'],
      },
      colors: {
        ink: "#172033",
        paper: "#f4f7fb",
        brand: "#4338ca",
        saffron: "#b45309",
        rosewood: "#be123c",
      },
    },
  },
  plugins: [],
} satisfies Config;
