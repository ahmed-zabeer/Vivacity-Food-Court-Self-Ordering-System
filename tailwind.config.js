/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#e06d24',
          600: '#c25514',
          700: '#994200',
          800: '#7c3300',
          900: '#632900',
        },
        surface: {
          DEFAULT: '#faf9f7',
          dim: '#dadad8',
          bright: '#faf9f7',
          low: '#f4f3f1',
          container: '#efeeec',
          high: '#e9e8e6',
          highest: '#e3e2e0',
        },
        charcoal: {
          DEFAULT: '#141518',
          light: '#1f2228',
          muted: '#2f3130',
        },
      },
      fontFamily: {
        sans: ['"Manrope"', 'system-ui', 'sans-serif'],
        kiwee: ['"Darker Grotesque"', '"Manrope"', 'sans-serif'],
        body: ['"Hanken Grotesk"', '"Manrope"', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
    },
  },
  plugins: [],
}
