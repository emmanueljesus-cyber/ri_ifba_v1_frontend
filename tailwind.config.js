/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'ifba-verde': '#248c35',
        'ifba-vermelho': '#E30613',
      }
    },
  },
  plugins: [require('tailwindcss-primeui')],
}

