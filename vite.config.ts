import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Makes the site installable ("Add to Home Screen") and lets it open with no signal.
    VitePWA({
      // Ask before switching to a new version, so a deploy never reloads the page mid-capture.
      registerType: "prompt",
      includeAssets: ["favicon.ico", "apple-touch-icon-180x180.png", "icon.svg"],
      manifest: {
        name: "Pinweb · Pinball strategy",
        short_name: "Pinweb",
        description: "Pinball strategies, tips, and wizard-mode guides.",
        theme_color: "#050806",
        background_color: "#050806",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        shortcuts: [{ name: "Quick Capture", url: "/admin/capture", icons: [{ src: "pwa-192x192.png", sizes: "192x192" }] }],
      },
      workbox: {
        // The app shell (HTML, JS, CSS, fonts, icons) is cached so the app opens offline.
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        navigateFallback: "/index.html",
        // Firebase's own auth pages must always come from the network.
        navigateFallbackDenylist: [/^\/__\//],
        runtimeCaching: [
          {
            // Strategy photos and game covers: keep viewed ones for offline use.
            urlPattern: ({ url }) =>
              url.hostname === "firebasestorage.googleapis.com" || url.hostname.endsWith(".firebasestorage.app"),
            handler: "CacheFirst",
            options: {
              cacheName: "photos",
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
