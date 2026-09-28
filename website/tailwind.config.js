/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: { brand: { 600: '#4f46e5', 700: '#4338ca' } },
    },
  },
  plugins: [],
};
