import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  base: './',
  build: {
    sourcemap: 'hidden',
  },
  server: {
    port: 1420,
    strictPort: true,
  },
  plugins: [
    react(),
    tsconfigPaths(),
  ],
})
