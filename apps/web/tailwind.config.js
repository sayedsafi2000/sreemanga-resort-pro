/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      // ── Eco resort color palette ──────────────────────────────────────────
      colors: {
        /** Muted tea-leaf greens — primary brand palette */
        forest: {
          50:  '#f1f5f1',
          100: '#e3ebe3',
          200: '#c7d7c7',
          300: '#a6c2a6',
          400: '#8aad8a',
          500: '#759975',
          600: '#628562',
          700: '#527252',
          800: '#325632',
          900: '#253f25',
          950: '#1a2d1a',
        },
        /** Warm parchment background */
        cream: '#faf9f7',
        stone: {
          warm: '#f5f2eb',
        },
        /** Earth tones — secondary accents */
        earth: {
          50:  '#fdf8f0',
          100: '#fbefd9',
          200: '#f5dca8',
          300: '#eec672',
          400: '#e5a93b',
          500: '#d9911e',
          600: '#b87218',
          700: '#925615',
          800: '#704113',
          900: '#5a3411',
        },
        /** Deep dark for dark-mode surfaces */
        night: {
          bg:      '#09100a',
          surface: '#0e1810',
          card:    '#131f14',
          border:  '#1c2e1d',
          hover:   '#1a2b1b',
          text:    '#e0e5e0',
          muted:   '#7a8c7a',
        },
      },

      // ── Typography ────────────────────────────────────────────────────────
      fontFamily: {
        sans:    ['var(--font-sans)',    'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
      },

      // ── Shadows ───────────────────────────────────────────────────────────
      boxShadow: {
        /** Subtle green-tinted card shadow */
        soft:         '0 4px 24px -4px rgba(82,114,82,0.18), 0 8px 32px -8px rgba(0,0,0,0.08)',
        card:         '0 2px 16px rgba(82,114,82,0.10), 0 1px 4px rgba(0,0,0,0.05)',
        'card-hover': '0 8px 32px rgba(82,114,82,0.18), 0 4px 12px rgba(0,0,0,0.08)',
        /** Lifted hero/CTA panels */
        panel:        '0 32px 80px -24px rgba(20,28,23,0.5), 0 8px 24px rgba(0,0,0,0.12)',
        /** Inner shadow for icon containers */
        'inner-forest': 'inset 0 2px 4px rgba(30,60,30,0.12)',
        /** Glowing CTA button */
        glow:         '0 0 20px rgba(82,114,82,0.5), 0 4px 12px rgba(0,0,0,0.15)',
      },

      // ── Animations ────────────────────────────────────────────────────────
      animation: {
        'fade-up':       'fadeUp 0.65s ease-out both',
        'fade-in':       'fadeIn 0.5s ease both',
        float:           'float 7s ease-in-out infinite',
        'pulse-soft':    'pulseSoft 4s ease-in-out infinite',
        'marquee-spots': 'marqueeSpots 55s linear infinite',
        'slide-up':      'slideUp 0.4s cubic-bezier(0.16,1,0.3,1) both',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-10px)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.45' },
          '50%':      { opacity: '0.75' },
        },
        marqueeSpots: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },

      // ── Border radius ─────────────────────────────────────────────────────
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
    },
  },
  plugins: [],
};
