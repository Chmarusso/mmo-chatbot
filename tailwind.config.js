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
        background: {
          DEFAULT: "#181120",
          light: "#f8f9fa"
        },
        surface: {
          DEFAULT: "#231C2E",
          light: "#ffffff"
        },
        accent: {
          cyan: "#16f2d8",
          purple: "#8A4DFF",
          pink: "#ec4899"
        },
        text: {
          primary: "#FFFFFF",
          secondary: "#AFAFAF"
        }
      },
      boxShadow: {
        glow: "0 0 20px rgba(138, 77, 255, 0.3)",
        "glow-purple": "0 0 20px rgba(138, 77, 255, 0.4)"
      },
      fontFamily: {
        sans: ['Inter', 'Urbanist', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};
