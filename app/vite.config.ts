import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'TouchSight',
        short_name: 'TouchSight',
        description: 'See the diagram with your hands.',
        start_url: '/student',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0c2b2d',
        theme_color: '#0e7c7b',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2,wasm,onnx,json,utb,ctb,cti,uti,dis}'],
        maximumFileSizeToCacheInBytes: 60 * 1024 * 1024,
        navigateFallback: '/index.html',
      },
    }),
  ],
  server: { host: true, port: 5173, proxy: { '/relay': { target: 'ws://localhost:4173', ws: true } } },
  build: { target: 'es2022' },
})
