import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/zkproof': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/zkproof', '/zkproof'),
      },
      '/api/gas': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/gas', '/gas'),
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
