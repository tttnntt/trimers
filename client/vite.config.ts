import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'logo.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Trimers',
        short_name: 'Trimers',
        description: 'Photo album sharing for group chats',
        theme_color: '#0a1612',
        background_color: '#0a1612',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ],
        categories: ['social', 'photos'],
        shortcuts: [
          { name: 'Create Group', short_name: 'Create Group', url: '/groups/new', icons: [] },
          { name: 'Groups', short_name: 'Groups', url: '/groups', icons: [] }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
              cacheableResponse: { statuses: [0, 200] },
              networkTimeoutSeconds: 10
            }
          }
        ]
      },
      devOptions: { enabled: true }
    })
  ],
  server: {
    port: 5173,
    proxy: { '/api': { target: 'https://trimers-dot-com.onrender.com', changeOrigin: true } }
  }
});
