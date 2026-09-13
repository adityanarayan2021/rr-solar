import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0E2A5C',
          50: '#EAF0F9',
          700: '#0B2249',
          900: '#071634',
        },
        solar: {
          DEFAULT: '#F5911E',
          600: '#DD7C0C',
        },
        leaf: '#2E9E4F',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: { 'fade-up': 'fade-up .6s ease-out both' },
    },
  },
  plugins: [],
};
export default config;
