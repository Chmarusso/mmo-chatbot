/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#0b0d16",
        surface: "#13172a",
        accent: {
          cyan: "#16f2d8",
          purple: "#a855f7"
        }
      },
      boxShadow: {
        glow: "0 0 20px rgba(22, 242, 216, 0.4)",
        "glow-purple": "0 0 20px rgba(168, 85, 247, 0.4)"
      }
    }
  },
  plugins: []
};
