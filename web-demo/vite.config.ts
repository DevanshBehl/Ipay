import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative base so built asset URLs resolve under chrome-extension://<id>/
  base: './',
  plugins: [react(), tailwindcss()],
})
