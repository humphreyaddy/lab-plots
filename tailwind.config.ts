import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          50:  '#f7f7f8',
          100: '#eeeef1',
          200: '#d9dade',
          300: '#b6b8bf',
          400: '#878a93',
          500: '#5d6068',
          600: '#3d3f45',
          700: '#26282d',
          800: '#16171a',
          900: '#0b0c0e',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
