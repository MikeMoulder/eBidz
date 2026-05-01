import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Arcium-faithful palette (per arcium.com/brand)
        bg: {
          base: '#000000',
          surface: '#080808',
          elevated: '#111111',
          overlay: '#1A1A1A',
        },
        border: {
          subtle: '#1C1C1C',
          strong: '#2A2A2A',
          bright: '#3D3D3D',
        },
        accent: {
          // Arcium primary highlight: Purple #6D45FF
          primary: '#6D45FF',
          bright: '#8A6BFF',
          deep: '#5333D6',
          dark: '#3D24A3',
          // Arcium secondary: Pink #F1A1FF
          pink: '#F1A1FF',
          pinkDeep: '#D77BE8',
          glow: 'rgba(109, 69, 255, 0.32)',
          pinkGlow: 'rgba(241, 161, 255, 0.25)',
        },
        state: {
          success: '#5DE89A',
          warning: '#FFB547',
          danger: '#FF5C7A',
        },
        text: {
          // Mist Grey #F1F1F1 → primary text on dark
          primary: '#F1F1F1',
          secondary: '#D4D4D4',
          // Medium Grey #B7B7B7 → muted
          muted: '#B7B7B7',
          faint: '#7A7A7A',
          dim: '#525252',
        },
      },
      borderRadius: {
        none: '0',
        sm: '2px',
        DEFAULT: '0',
        md: '0',
        lg: '0',
        xl: '0',
        '2xl': '0',
        '3xl': '0',
        full: '9999px',
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.04em',
        tighter: '-0.025em',
        widest: '0.18em',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-pulse': 'glowPulse 2.4s ease-in-out infinite',
        'cluster-spin': 'clusterSpin 8s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'ticker': 'ticker 35s linear infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
        'gradient-shift': 'gradientShift 8s ease infinite',
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'fade-up': 'fadeUp 0.7s cubic-bezier(0.21, 0.47, 0.32, 0.98) forwards',
        'scan': 'scan 4s linear infinite',
      },
      keyframes: {
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(109, 69, 255, 0.4)' },
          '50%': { boxShadow: '0 0 32px 6px rgba(109, 69, 255, 0.32)' },
        },
        clusterSpin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        ticker: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
