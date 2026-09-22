/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta "papel y tinta": fondo crema, texto marrón, acentos cálidos.
        ink: {
          DEFAULT: '#2D241E',
          soft: '#6B5D52',
        },
        tile: {
          DEFAULT: '#FFFFFF',
          light: '#FBF7EC',
        },
        fondo: '#F4F4F6',
        line: '#E3DACB',
        amber: '#C8AD7F',
        coral: '#E4572E',
      },
      fontFamily: {
        display: ['Georgia', 'ui-serif', 'serif'],
      },
      keyframes: {
        'tile-drop': {
          '0%': { transform: 'translateY(-40px) rotate(-8deg)', opacity: '0' },
          '60%': { transform: 'translateY(8px) rotate(2deg)', opacity: '1' },
          '100%': { transform: 'translateY(0) rotate(0deg)', opacity: '1' },
        },
        'found-flash': {
          '0%': { transform: 'scale(1)', backgroundColor: 'rgba(200, 173, 127, 0)' },
          '40%': { transform: 'scale(1.12)', backgroundColor: 'rgba(200, 173, 127, 0.45)' },
          '100%': { transform: 'scale(1)', backgroundColor: 'rgba(200, 173, 127, 0)' },
        },
        'win-pop': {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'dorado-hover': {
          '0%': { backgroundColor: '#EBD9B4' },
          '100%': { backgroundColor: '#B1883F' },
        },
      },
      animation: {
        'tile-drop': 'tile-drop 0.5s ease-out both',
        'found-flash': 'found-flash 0.6s ease-out both',
        'win-pop': 'win-pop 0.5s ease-out both',
        'dorado-hover': 'dorado-hover 0.5s ease-in-out forwards',
      },
    },
  },
  plugins: [],
}
