import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      ringWidth: {
        'focus': '3px',
      },
      ringColor: {
        'focus-light': 'rgba(59, 130, 246, 0.5)',
      },
      ringOffsetWidth: {
        'focus': '2px',
      },
      transitionProperty: {
        'focus': 'outline, outline-offset, ring, ring-offset',
      },
    },
  },
  plugins: [],
}
export default config
