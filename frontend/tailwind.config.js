/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'ev-bg': '#0F1117',
        'ev-surface': '#161922',
        'ev-elevated': '#1C1F2E',
        'ev-card': '#1A1D2E',
        'ev-border': '#2A2D3E',
        'ev-border-subtle': '#1E2132',
        'ev-text': '#F1F5F9',
        'ev-text-secondary': '#94A3B8',
        'ev-text-muted': '#64748B',
        'ev-accent': '#00E68A',
        'ev-accent-hover': '#00CC7A',
        'ev-accent-dim': 'rgba(0, 230, 138, 0.15)',
        'ev-glow': 'rgba(0, 230, 138, 0.4)',
        'ev-sidebar-hover': 'rgba(255, 255, 255, 0.05)',
      },
      fontFamily: {
        brand: ['Orbitron', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
