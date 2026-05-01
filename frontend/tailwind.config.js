/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        admin: {
          bg: "#f8fafc",
          card: "#ffffff",
          sidebar: "#0f172a",
          text: "#1e293b",
          "text-muted": "#64748b",
          border: "#e2e8f0",
        }
      }
    },
  },
  plugins: [],
}
