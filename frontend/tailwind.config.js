/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0F1117',
          surface: '#1A1D27',
          border: 'rgba(255,255,255,0.08)',
        },
        accent: {
          primary: '#22C55E',
          glow: 'rgba(34,197,94,0.15)',
        },
      },
    },
  },
  plugins: [],
}
