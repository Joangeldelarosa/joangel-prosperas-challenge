import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#f7f9fb',
        primary: '#000000',
        'primary-container': '#00174b',
        'surface-tint': '#0053db',
        'on-surface': '#191c1e',
        'on-surface-variant': '#45464d',
        'outline-variant': '#c6c6cd',
        'surface-container-low': '#f2f4f6',
        'surface-container': '#eceef0',
        'surface-container-lowest': '#ffffff',
        'surface-container-high': '#e6e8ea',
        'secondary-container': '#d0e1fb',
        error: '#ba1a1a',
        'error-container': '#ffdad6',
        'on-tertiary-container': '#009668',
      },
      fontFamily: {
        headline: ['Inter', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        label: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
