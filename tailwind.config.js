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
        /* Brand palette — cream paper + bottle green ink */
        cream: {
          50: '#FFFDF7',
          100: '#FDF8EC',
          200: '#F7EFDA',
          300: '#EFE3C2',
          400: '#E4D3A6',
          500: '#D6BE83',
        },
        bottle: {
          50: '#EFF6F2',
          100: '#D8E9E0',
          200: '#AFD3C1',
          300: '#7DB79C',
          400: '#4A9377',
          500: '#166F52',
          600: '#0B5540',
          700: '#093F30',
          800: '#073023',
          900: '#052319',
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
        card: '0 1px 2px rgba(9, 63, 48, 0.05), 0 8px 24px -12px rgba(9, 63, 48, 0.18)',
        lift: '0 4px 12px rgba(9, 63, 48, 0.08), 0 16px 40px -16px rgba(9, 63, 48, 0.28)',
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
