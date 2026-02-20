import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { resolve } from 'path'

// https://vite.dev/config/
// Build mode is determined by VITE_BUILD_MODE env var: 'admin' or 'student'
export default defineConfig(({ mode }) => {
  const buildMode = process.env.VITE_BUILD_MODE || 'admin';
  
  const configs = {
    admin: {
      outDir: 'build',
      emptyOutDir: true,
      manifest: true,
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
        },
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
    },
    student: {
      outDir: 'build-student',
      emptyOutDir: true,
      manifest: true,
      rollupOptions: {
        input: {
          student: resolve(__dirname, 'student.html'),
        },
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
    },
  };
  
  return {
    plugins: [react()],
    build: configs[buildMode],
    base: './',
    server: {
      port: 5173,
      strictPort: true,
      cors: true,
    },
  };
})
