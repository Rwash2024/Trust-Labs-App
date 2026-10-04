import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // One codebase, many labs: VITE_CLIENT picks clients/<name>/ (brand.json + logos + splash).
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const client = process.env.VITE_CLIENT || env.VITE_CLIENT || 'trustlabs'
  const clientDir = resolve(process.cwd(), 'clients', client)
  const gaId = process.env.VITE_GA_ID || loadEnv(mode, clientDir, 'VITE_').VITE_GA_ID
  const brand = JSON.parse(readFileSync(resolve(clientDir, 'brand.json'), 'utf8'))

  return {
  // Each client reads its own .env* (Supabase, GA, Formspree) — never another client's backend.
  envDir: clientDir,
  publicDir: resolve(clientDir, 'public'),
  resolve: { alias: { '@client': clientDir } },
  plugins: [
    react(),
    {
      name: 'brand-html',
      transformIndexHtml: (html) =>
        html
          .replaceAll('%BRAND_NAME%', brand.name)
          .replaceAll('%BRAND_SEO_DESC%', brand.seoDescription)
          .replaceAll('%BRAND_THEME_COLOR%', brand.colors.themeColor)
          // No GA ID (e.g. demo clients): drop the tag instead of loading gtag.js?id=%VITE_GA_ID%.
          .replace(/<script async src="[^"]*%VITE_GA_ID%"><\/script>/, (tag) => (gaId ? tag : ''))
          // Demo builds must not be indexed by search engines.
          .replace('</head>', brand.noindex ? '<meta name="robots" content="noindex,nofollow" /></head>' : '</head>'),
    },
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/favicon-32.png', 'icons/apple-touch-icon.png'],
      manifest: {
        name: brand.name,
        short_name: brand.name,
        description: brand.appDescription,
        lang: 'ar',
        dir: 'rtl',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#FFFFFF',
        theme_color: brand.colors.themeColor,
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
  }
})
