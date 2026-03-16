import { defineConfig } from "vite";
/// <reference types="vitest" />
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: true, // Listen on all local IPs
    // Hostnames only (no protocol). Wildcard patterns allow any ngrok tunnel without code changes.
    allowedHosts: ['.ngrok-free.app', '.ngrok-free.dev', 'localhost', '127.0.0.1'],
    port: Number(process.env.VITE_DEV_PORT || 8080),
    // Keep port stable for tunnels like ngrok instead of auto-switching.
    strictPort: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/lib/**', 'src/hooks/**', 'src/features/**'],
      exclude: [
        'src/integrations/**',
        'src/components/ui/**',
        'src/**/*.test.*',
        'src/**/__tests__/**',
      ],
      thresholds: {
        lines: 7,
        functions: 6,
        branches: 6,
      },
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // VitePWA({
    //   registerType: "autoUpdate",
    //   includeAssets: ["favicon.ico", "pwa-192x192.png", "pwa-512x512.png"],
    //   manifest: false, // We use our own manifest.json
    //   workbox: {
    //     globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
    //     runtimeCaching: [
    //       {
    //         urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
    //         handler: "NetworkFirst",
    //         options: {
    //           cacheName: "supabase-cache",
    //           expiration: {
    //             maxEntries: 50,
    //             maxAgeSeconds: 60 * 60 * 24, // 24 hours
    //           },
    //         },
    //       },
    //       {
    //         urlPattern: /\.(png|jpg|jpeg|svg|gif|webp)$/,
    //         handler: "CacheFirst",
    //         options: {
    //           cacheName: "image-cache",
    //           expiration: {
    //             maxEntries: 100,
    //             maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
    //           },
    //         },
    //       },
    //     ],
    //   },
    // }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
