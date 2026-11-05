import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: { extend: { colors: { brand: { 50: "#fff1ee", 100: "#ffe0d9", 600: "#d83a24", 700: "#b82c1a" } } } },
  plugins: [],
};
export default config;
