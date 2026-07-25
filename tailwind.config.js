/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./contexts/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./App.tsx",
    "./index.tsx"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        "display": ['"Cormorant Garamond"', "serif"],
        "sans": ['"Inter"', '"Public Sans"', "sans-serif"],
        serif: ['"Cormorant Garamond"', 'serif'],
        bodoni: ['"Bodoni Moda"', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        header: ['"Cormorant Garamond"', 'serif'],
        hand: ['"La Belle Aurore"', 'cursive'],
      },
      colors: {
        "primary": "#1a1a1a",
        "background-light": "#EAE8E3",
        "background-dark": "#191919",
        "canvas-border": "#000000",
        archival: {
          beige: '#F2F0E9',
          border: '#D1CFCA',
          text: '#2A2A2A',
          accent: '#8E8C84'
        },
        nous: {
          base: 'var(--nous-base)',
          base0: 'var(--nous-base)',
          text: 'var(--nous-text)',
          text0: 'var(--nous-text)',
          subtle: 'var(--nous-subtle)',
          accent: 'var(--nous-accent)',
          border: 'var(--nous-border)',
        }
      },
      backgroundImage: {
         'tape-strip': 'linear-gradient(-45deg, rgba(255,255,255,0.3) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0.3) 75%, transparent 75%, transparent)',
      },
      boxShadow: {
         'paper-float': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 2px 2px 0px rgba(0,0,0,0.05)',
      }
    },
  },
  plugins: [],
}
