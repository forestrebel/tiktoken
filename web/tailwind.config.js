/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      aspectRatio: {
        portrait: '9/16',
      },
      screens: {
        xs: '375px',
      },
      maxWidth: {
        mobile: '600px',
      },
    },
  },
  plugins: [],
} 