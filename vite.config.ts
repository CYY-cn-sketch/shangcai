import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const backendTarget = env.VITE_BACKEND_PROXY_TARGET || 'http://127.0.0.1:8080'

  return {
    base: './',
    envPrefix: 'VITE_',
    plugins: [react()],
    optimizeDeps: {
      // pptxgenjs declares an empty `https` compatibility package. It is
      // disabled by pptxgenjs in browsers and must not be pre-bundled by Vite.
      exclude: ['https'],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            const moduleId = id.replace(/\\/g, '/')
            if (
              moduleId.includes('/node_modules/react/') ||
              moduleId.includes('/node_modules/react-dom/') ||
              moduleId.includes('/node_modules/scheduler/')
            ) {
              return 'react-vendor'
            }
            if (moduleId.endsWith('/node_modules/three/build/three.core.js')) {
              return 'three-core'
            }
            if (moduleId.endsWith('/node_modules/three/build/three.module.js')) {
              return 'three-renderer'
            }
            if (moduleId.includes('/node_modules/lucide-react/')) {
              return 'icon-vendor'
            }
            return undefined
          },
        },
      },
    },
    server: {
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
