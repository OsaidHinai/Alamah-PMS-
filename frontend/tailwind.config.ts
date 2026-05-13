import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#E8630A',
          50: '#FEF0E7',
          100: '#FDE1CF',
          200: '#FAC39E',
          300: '#F8A56E',
          400: '#F5873D',
          500: '#E8630A',
          600: '#C05208',
          700: '#974006',
          800: '#6E2E04',
          900: '#451D03',
        },
      },
    },
  },
  plugins: [],
};

export default config;
