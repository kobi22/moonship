// tailwind.config.js
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        heading: ["Orbitron", "sans-serif"], // Futuristic headline font
      },
      colors: {
        primary: {
          light: "#7dd3fc", // sky-300
          DEFAULT: "#3b82f6", // blue-500
          dark: "#1e3a8a", // blue-900
        },
        accent: {
          purple: "#a855f7",
          teal: "#14b8a6",
        },
        dark: "#030014", // space-like background
      },
      backgroundImage: {
        "gradient-moonship":
          "linear-gradient(to right, #a855f7, #3b82f6, #14b8a6)",
      },
    },
  },
  plugins: [],
};
