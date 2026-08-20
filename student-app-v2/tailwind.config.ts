import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#203040',
        paper: '#f7f9f6',
        mint: '#4f8f7a',
        saffron: '#d99a3d',
        berry: '#8b4d63',
      },
      fontFamily: {
        sans: ['Vazirmatn', 'Tahoma', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
