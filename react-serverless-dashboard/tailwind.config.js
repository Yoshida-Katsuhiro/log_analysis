/** @type {import('tailwindcss').Config} */
module.exports = {
  // srcフォルダ内の全てのjs/jsx/ts/tsxファイルを監視対象とします
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}