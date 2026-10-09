/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        civic: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bbdffc',
          300: '#7ec4fa',
          400: '#38a4f6',
          500: '#0d89e7',
          600: '#026bc2',
          700: '#03559d',
          800: '#074982',
          900: '#0c3e6c',
          950: '#082747',
        },
      },
    },
  },
  plugins: [],
}
