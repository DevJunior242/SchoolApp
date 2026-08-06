import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // On ne précache que l'essentiel (app shell). Pas de cache générique
      // de toutes les routes /api/* : trop risqué de servir des données
      // sensibles (paiements, notes) périmées sans que l'utilisateur le
      // sache. Seule la liste des élèves d'une classe est mise en cache,
      // pour que la prise de présence reste possible hors-ligne.
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /\/api\/assignments\/[^/]+\/students$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'attendance-roster',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
      manifest: {
        name: 'Intellino',
        short_name: 'Intellino',
        description: 'Gestion scolaire pensée pour le terrain africain.',
        theme_color: '#0F0D0C',
        background_color: '#0F0D0C',
        display: 'standalone',
        start_url: '/dashboard',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
