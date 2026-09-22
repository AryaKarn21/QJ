import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // toggled by AdminUIContext; safe — no existing `dark:` usage in the app
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Official QuickJobs Brand Colors — Unified Orange Palette
        primary: {
          DEFAULT: '#F97316',
          hover: '#EA580C',
          light: '#FFF7ED',
          border: '#FED7AA',
          dark: '#C2410C',
        },
        secondary: '#F8FAFC',
        dark: '#0F172A',
        light: '#FFFFFF',
        success: '#16A34A',
        warning: '#F59E0B',
        error: '#DC2626',
        gray: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },

        // Semantic tokens
        danger: '#DC2626',
        info: '#2563EB',
        accent: {
          DEFAULT: '#F97316',
          light: '#FED7AA',
          dark: '#C2410C',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 6px rgba(0, 0, 0, 0.05)',
        'card-hover': '0 10px 15px rgba(0, 0, 0, 0.1)',
      },
      transitionProperty: {
        height: 'height',
        spacing: 'margin, padding',
      },
    },
  },
  plugins: [typography],
};