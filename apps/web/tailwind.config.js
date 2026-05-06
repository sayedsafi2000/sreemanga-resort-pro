/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      /** Muted tea-leaf greens — use for header, footer, CTAs, and primary buttons site-wide. */
      colors: {
        forest: {
          50: '#f1f5f1',
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
        cream: '#faf9f7',
        stone: {
          warm: '#f5f2eb',
        },
        // Clean unified dark palette
        dark: {
          bg: '#0a0c0a',
          surface: '#121512',
          card: '#181c18',
          border: '#1f251f',
          hover: '#1c201c',
          text: '#e3e5e3',
          muted: '#8c938c',
        }
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
      },
      boxShadow: {
        soft: '0 4px 24px -4px rgba(82, 114, 82, 0.18), 0 8px 32px -8px rgba(0, 0, 0, 0.08)',
        card: '0 2px 16px rgba(82, 114, 82, 0.12), 0 4px 32px rgba(0, 0, 0, 0.06)',
      },
      animation: {
        'fade-up': 'fadeUp 0.6s ease-out forwards',
        float: 'float 7s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 4s ease-in-out infinite',
        /** Seamless horizontal loop — duplicated content, translate -50% (no pause). */
        'marquee-spots': 'marqueeSpots 55s linear infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.45' },
          '50%': { opacity: '0.75' },
        },
        marqueeSpots: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
};
