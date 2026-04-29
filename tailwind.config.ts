import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        launcher: {
          bg: '#09090b',
          surface: '#18181b',
          surfaceElevated: '#27272a',
          border: '#3f3f46',
          muted: '#52525b',
          text: '#fafafa',
          textMuted: '#a1a1aa',
          primary: '#e4e4e7',
          primaryHover: '#ffffff',
          accent: '#3b82f6',
          accentHover: '#2563eb',
          success: '#22c55e',
          warning: '#eab308',
          danger: '#ef4444',
          terminal: '#0ea5e9',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      spacing: {
        shell: '1.5rem',
        sidebar: '18rem',
        topbar: '4rem',
      },
      borderRadius: {
        launcher: '1.25rem',
        panel: '1rem',
        control: '0.75rem',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        launcher: '0 4px 24px -4px rgba(0, 0, 0, 0.5)',
        panel: '0 2px 12px -2px rgba(0, 0, 0, 0.3)',
        glow: '0 0 20px 0px rgba(59, 130, 246, 0.3)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
