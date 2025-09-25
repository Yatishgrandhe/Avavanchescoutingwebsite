/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // enables dark mode via adding 'class="dark"' to <html> or <body>
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
      // Typography: using a clean modern font stack
      fontFamily: {
        sans: ['Inter', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        heading: ['Poppins', 'Inter', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },

      // Color palette: balanced for light/dark mode with good contrast
      colors: {
        primary: {
          light: '#3B82F6', // vibrant blue for buttons/links
          DEFAULT: '#2563EB',
          dark: '#1E40AF',
        },
        secondary: {
          light: '#F97316', // orange accent
          DEFAULT: '#EA580C',
          dark: '#C2410C',
        },
        neutral: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        },
        success: '#22C55E',
        warning: '#EAB308',
        danger: '#EF4444',
        // Shadcn/ui compatibility
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        // Primary colors for shadcn
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        // Secondary colors for shadcn
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

      // Spacing and sizing for cleaner layout
      spacing: {
        18: '4.5rem',
        22: '5.5rem',
        26: '6.5rem',
      },

      // Rounded corners for stylish cards & buttons
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.75rem',
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },

      // Box shadows for depth in dashboard UI
      boxShadow: {
        card: '0 4px 14px rgba(0, 0, 0, 0.08)',
        'card-dark': '0 4px 14px rgba(0, 0, 0, 0.35)',
        'card-hover': '0 8px 25px rgba(0, 0, 0, 0.15)',
        'card-hover-dark': '0 8px 25px rgba(0, 0, 0, 0.5)',
      },

      // Smooth transitions
      transitionDuration: {
        400: '400ms',
      },

      // Animation keyframes
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        fadeIn: "fadeIn 0.3s ease-out",
        slideUp: "slideUp 0.3s ease-out",
        slideIn: "slideIn 0.3s ease-out",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require('@tailwindcss/forms'), // better styled inputs
    require('@tailwindcss/typography'), // for content readability
  ],
}