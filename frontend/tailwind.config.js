/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
        extend: {
                fontFamily: {
                        sans: ['Inter', 'system-ui', 'sans-serif'],
                        display: ['Outfit', 'system-ui', 'sans-serif'],
                        mono: ['JetBrains Mono', 'monospace']
                },
                borderRadius: {
                        lg: 'var(--radius)',
                        md: 'calc(var(--radius) - 2px)',
                        sm: 'calc(var(--radius) - 4px)'
                },
                colors: {
                        background: 'hsl(var(--background))',
                        foreground: 'hsl(var(--foreground))',
                        card: {
                                DEFAULT: 'hsl(var(--card))',
                                foreground: 'hsl(var(--card-foreground))'
                        },
                        popover: {
                                DEFAULT: 'hsl(var(--popover))',
                                foreground: 'hsl(var(--popover-foreground))'
                        },
                        primary: {
                                DEFAULT: 'hsl(var(--primary))',
                                foreground: 'hsl(var(--primary-foreground))'
                        },
                        secondary: {
                                DEFAULT: 'hsl(var(--secondary))',
                                foreground: 'hsl(var(--secondary-foreground))'
                        },
                        muted: {
                                DEFAULT: 'hsl(var(--muted))',
                                foreground: 'hsl(var(--muted-foreground))'
                        },
                        accent: {
                                DEFAULT: 'hsl(var(--accent))',
                                foreground: 'hsl(var(--accent-foreground))'
                        },
                        destructive: {
                                DEFAULT: 'hsl(var(--destructive))',
                                foreground: 'hsl(var(--destructive-foreground))'
                        },
                        border: 'hsl(var(--border))',
                        input: 'hsl(var(--input))',
                        ring: 'hsl(var(--ring))',
                        chart: {
                                '1': 'hsl(var(--chart-1))',
                                '2': 'hsl(var(--chart-2))',
                                '3': 'hsl(var(--chart-3))',
                                '4': 'hsl(var(--chart-4))',
                                '5': 'hsl(var(--chart-5))'
                        },
                        // Neon palette for glassmorphic dashboard
                        neon: {
                                cyan: '#06b6d4',
                                purple: '#d946ef',
                                indigo: '#6366f1',
                                green: '#10b981',
                                orange: '#f97316'
                        }
                },
                backdropBlur: {
                        xs: '2px',
                        '2xl': '40px',
                        '3xl': '64px'
                },
                boxShadow: {
                        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.36)',
                        'neon': '0 0 10px rgba(99, 102, 241, 0.5), 0 0 20px rgba(99, 102, 241, 0.3)',
                        'neon-cyan': '0 0 10px rgba(6, 182, 212, 0.5), 0 0 20px rgba(6, 182, 212, 0.3)',
                        'neon-purple': '0 0 10px rgba(217, 70, 239, 0.5), 0 0 20px rgba(217, 70, 239, 0.3)'
                },
                keyframes: {
                        'accordion-down': {
                                from: { height: '0' },
                                to: { height: 'var(--radix-accordion-content-height)' }
                        },
                        'accordion-up': {
                                from: { height: 'var(--radix-accordion-content-height)' },
                                to: { height: '0' }
                        },
                        'fade-in': {
                                from: { opacity: '0', transform: 'translateY(10px)' },
                                to: { opacity: '1', transform: 'translateY(0)' }
                        },
                        'slide-in-right': {
                                from: { opacity: '0', transform: 'translateX(20px)' },
                                to: { opacity: '1', transform: 'translateX(0)' }
                        },
                        'pulse-neon': {
                                '0%, 100%': { boxShadow: '0 0 5px rgba(99, 102, 241, 0.4)' },
                                '50%': { boxShadow: '0 0 20px rgba(99, 102, 241, 0.6)' }
                        },
                        'glow': {
                                '0%, 100%': { opacity: '1' },
                                '50%': { opacity: '0.5' }
                        }
                },
                animation: {
                        'accordion-down': 'accordion-down 0.2s ease-out',
                        'accordion-up': 'accordion-up 0.2s ease-out',
                        'fade-in': 'fade-in 0.3s ease-out',
                        'slide-in': 'slide-in-right 0.3s ease-out',
                        'pulse-neon': 'pulse-neon 2s ease-in-out infinite',
                        'glow': 'glow 2s ease-in-out infinite'
                }
        }
  },
  plugins: [require("tailwindcss-animate")],
};
