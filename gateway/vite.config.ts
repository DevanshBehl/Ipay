import { defineConfig } from 'vite';

// Relative base so the built store can be served from any path.
export default defineConfig({
  base: './',
  server: { port: 5173 },
});
