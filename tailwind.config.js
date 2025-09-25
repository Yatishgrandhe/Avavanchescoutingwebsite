/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        'sans': ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        'heading': ['Poppins', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        'primary': ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Fira Code', 'Monaco', 'Cascadia Code', 'monospace'],
      },
      colors: {
        // Avalanche Professional Theme Colors
        'avalanche': {
          'primary': {
            'main': '#1B365D',
            'light': '#2B4B7C',
            'dark': '#0F2340',
          },
          'secondary': {
            'main': '#E94B3C',
            'light': '#FF6B5B',
            'dark': '#C73E30',
          },
          'accent': {
            'main': '#F5A623',
            'light': '#FFB84A',
            'dark': '#E8940F',
          },
          'neutral': {
            'background': '#FAFBFC',
            'surface': '#FFFFFF',
            'text-primary': '#1A1A1A',
            'text-secondary': '#6B7280',
            'text-muted': '#9CA3AF',
            'border': '#E5E7EB',
            'divider': '#F3F4F6',
          }
        },
        // Shadcn/ui compatibility
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontSize: {
        'h1': ['2.5rem', { lineHeight: '1.2', fontWeight: '700' }],
        'h2': ['2rem', { lineHeight: '1.2', fontWeight: '600' }],
        'h3': ['1.5rem', { lineHeight: '1.2', fontWeight: '600' }],
        'h4': ['1.25rem', { lineHeight: '1.2', fontWeight: '500' }],
        'h5': ['1.125rem', { lineHeight: '1.2', fontWeight: '500' }],
        'body': ['1rem', { lineHeight: '1.5' }],
        'small': ['0.875rem', { lineHeight: '1.5' }],
        'xs': ['0.75rem', { lineHeight: '1.5' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        'small': '4px',
        'medium': '8px',
        'large': '12px',
        'xl': '16px',
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        'avalanche': '0 2px 20px rgba(0, 0, 0, 0.1)',
        'avalanche-lg': '0 8px 25px rgba(0, 0, 0, 0.1)',
        'avalanche-primary': '0 4px 12px rgba(27, 54, 93, 0.3)',
        'avalanche-secondary': '0 4px 12px rgba(233, 75, 60, 0.3)',
        'avalanche-accent': '0 4px 12px rgba(245, 166, 35, 0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-up': 'slideUp 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        'scale-hover': 'scaleHover 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        'button-press': 'buttonPress 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleHover: {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(1.05)' },
        },
        buttonPress: {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(0.98)' },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}