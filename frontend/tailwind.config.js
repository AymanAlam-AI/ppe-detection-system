/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#080C10",
        surface: "#0D1117",
        "surface-2": "#161B22",
        border: "#21262D",
        "border-2": "#30363D",
        text: "#E6EDF3",
        muted: "#7D8590",
        accent: "#F0A500",
        "accent-dim": "#7A5300",
        danger: "#DA3633",
        "danger-dim": "#6E1C1A",
        safe: "#3FB950",
        "safe-dim": "#1A4D24",
        data: "#388BFD",
        "data-dim": "#1A3A6E",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};