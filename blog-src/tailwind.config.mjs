/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        'fp-bg':           '#050505',
        'fp-bg-alt':       '#0a0a12',
        'fp-surface':      'rgba(255,255,255,0.05)',
        'fp-border':       'rgba(255,255,255,0.10)',
        'fp-purple':       '#8b5cf6',
        'fp-purple-light': '#a855f7',
        'fp-cyan':         '#06b6d4',
        'fp-cyan-light':   '#22d3ee',
        'fp-pink':         '#ec4899',
        'fp-green':        '#10b981',
        'fp-text':         '#ffffff',
        'fp-muted':        'rgba(255,255,255,0.60)',
        'fp-secondary':    'rgba(255,255,255,0.80)',
      },
      fontFamily: {
        sans: ['Pretendard', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        'fp': '16px',
        'fp-sm': '12px',
        'fp-xs': '8px',
      },
      backgroundImage: {
        'fp-gradient': 'linear-gradient(135deg, #a855f7, #22d3ee)',
      },
    },
  },
  plugins: [],
};
