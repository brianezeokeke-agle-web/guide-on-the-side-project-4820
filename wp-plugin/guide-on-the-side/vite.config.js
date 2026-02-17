import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Build configuration for WordPress plugin
  build: {
    outDir: 'build',
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        // Ensure consistent naming for WordPress enqueue
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  
  // Base path - empty for WordPress plugin since we handle paths in PHP
  base: './',
  
  // Development server configuration (optional, for local dev)
  server: {
    port: 5173,
    strictPort: true,
    cors: true,
  },
})
