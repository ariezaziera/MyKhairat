import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#007BFF",
          green: "#28A745",
          ink: "#1A2332",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
      },
      boxShadow: {
        card: "0 10px 30px -18px rgba(26, 35, 50, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
