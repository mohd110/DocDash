/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1.5rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        /* Brand palette — every shade resolves to a CSS variable, so the
           doctor's chosen colours in Settings re-theme the whole app at
           runtime. Defaults (cream paper + bottle green ink) live in
           index.css; the ramps are generated in src/lib/theme.ts. */
        surface: {
          50: 'hsl(var(--surface-50) / <alpha-value>)',
          100: 'hsl(var(--surface-100) / <alpha-value>)',
          200: 'hsl(var(--surface-200) / <alpha-value>)',
          300: 'hsl(var(--surface-300) / <alpha-value>)',
          400: 'hsl(var(--surface-400) / <alpha-value>)',
          500: 'hsl(var(--surface-500) / <alpha-value>)',
        },
        brand: {
          50: 'hsl(var(--brand-50) / <alpha-value>)',
          100: 'hsl(var(--brand-100) / <alpha-value>)',
          200: 'hsl(var(--brand-200) / <alpha-value>)',
          300: 'hsl(var(--brand-300) / <alpha-value>)',
          400: 'hsl(var(--brand-400) / <alpha-value>)',
          500: 'hsl(var(--brand-500) / <alpha-value>)',
          600: 'hsl(var(--brand-600) / <alpha-value>)',
          700: 'hsl(var(--brand-700) / <alpha-value>)',
          800: 'hsl(var(--brand-800) / <alpha-value>)',
          900: 'hsl(var(--brand-900) / <alpha-value>)',
        },

        /* Semantic tokens (driven by CSS variables in index.css) */
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
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 4px)',
        sm: 'calc(var(--radius) - 8px)',
      },
      fontFamily: {
        /* Montserrat throughout — a geometric sans in the Gotham idiom.
           Gotham itself is a licensed Hoefler face and cannot be webfonted. */
        sans: ['Montserrat', 'Segoe UI', 'system-ui', 'sans-serif'],
        display: ['Montserrat', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        /* Tinted by the brand colour, so a plum dashboard does not cast
           green shadows. */
        card: '0 1px 2px hsl(var(--shadow-color) / 0.05), 0 8px 24px -12px hsl(var(--shadow-color) / 0.18)',
        lift: '0 4px 12px hsl(var(--shadow-color) / 0.08), 0 16px 40px -16px hsl(var(--shadow-color) / 0.28)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'translateY(-6px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'highlight-flash': {
          '0%': { backgroundColor: 'hsl(43 96% 88%)' },
          '100%': { backgroundColor: 'transparent' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'pop-in': 'pop-in 0.25s ease-out',
        'highlight-flash': 'highlight-flash 2.5s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
