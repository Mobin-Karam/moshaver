import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'rgb(var(--text-primary) / <alpha-value>)',
        paper: 'rgb(var(--background) / <alpha-value>)',
        mint: 'rgb(var(--success) / <alpha-value>)',
        saffron: 'rgb(var(--warning) / <alpha-value>)',
        berry: 'rgb(var(--danger) / <alpha-value>)',
        primary: 'rgb(var(--primary) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Vazirmatn', 'Tahoma', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
