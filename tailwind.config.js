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
      },
      animation: {
        'tile-drop': 'tile-drop 0.5s ease-out both',
      },
    },
  },
  plugins: [],
}
