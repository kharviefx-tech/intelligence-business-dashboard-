import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./utils/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["DM Sans", "Arial", "sans-serif"],
        display: ["Manrope", "DM Sans", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
