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
        "sans": ['"Geist Variable"', '"Public Sans"', "sans-serif"],
        serif: ['"Cormorant Garamond"', 'serif'],
        bodoni: ['"Bodoni Moda"', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        header: ['"Cormorant Garamond"', 'serif'],
        hand: ['"La Belle Aurore"', 'cursive'],
      },
      colors: {
        "primary": "#1a1a1a",
        "background-light": "#FAFAFA",
        "background-dark": "#191919",
        "canvas-border": "#000000",
        archival: {
          beige: '#FAFAFA',
          border: '#D4D4D4',
          text: '#0A0A0A',
          accent: '#78716C'
        },
        mimi: {
          field: 'var(--mimi-field)',
          worktable: 'var(--mimi-worktable)',
          ink: 'var(--mimi-ink)',
          olive: 'var(--mimi-olive)',
          stone: 'var(--mimi-stone)',
          hairline: 'var(--mimi-hairline)',
          cobalt: 'var(--mimi-cobalt)',
          gilt: 'var(--mimi-gilt)',
        },
        nous: {
          base: 'var(--nous-base)',
          base0: 'var(--nous-base)',
          text: 'var(--nous-text)',
          text0: 'var(--nous-text)',
          subtle: 'var(--nous-subtle)',
          accent: 'var(--nous-accent)',
          border: 'var(--nous-border)',
          paper: 'var(--nous-paper)',
          olive: 'var(--nous-olive)',
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
