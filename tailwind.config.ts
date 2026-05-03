import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#F69F9A",
          hover: "#E08880",
          active: "#D07870",
        },
        canvas: "#F7F5F2",
        ink: "#1C1917",
      },
    },
  },
  plugins: [],
};
export default config;
