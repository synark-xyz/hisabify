import { defineConfig } from "vite";
/// <reference types="vitest" />
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import { sentryVitePlugin } from "@sentry/vite-plugin";

// Source-map upload config lives in .env.sentry-build-plugin (gitignored) or in
// real environment variables for CI. We read it up front so builds without
// credentials simply skip the plugin instead of failing.
const readSentryBuildEnv = () => {
  const fromFile: Record<string, string> = {};
  try {
    const raw = fs.readFileSync(
      path.resolve(__dirname, ".env.sentry-build-plugin"),
      "utf8",
    );
    for (const line of raw.split("\n")) {
      const match = line.match(/^\s*(SENTRY_[A-Z_]+)\s*=\s*(.+?)\s*$/);
      if (match) fromFile[match[1]] = match[2];
    }
  } catch {
    // File is optional.
  }
  return {
    authToken: process.env.SENTRY_AUTH_TOKEN || fromFile.SENTRY_AUTH_TOKEN,
    org: process.env.SENTRY_ORG || fromFile.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT || fromFile.SENTRY_PROJECT,
  };
};

const sentryBuild = readSentryBuildEnv();
const sentryUploadEnabled = Boolean(
  sentryBuild.authToken && sentryBuild.org && sentryBuild.project,
);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  build: {
    // Source maps are only generated when Sentry can actually consume them.
    // "hidden" omits the //# sourceMappingURL comment so the maps aren't
    // discoverable by users; the plugin deletes them from dist after upload.
    sourcemap: mode === "production" && sentryUploadEnabled ? "hidden" : mode !== "production",
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['vaul', 'cmdk', 'input-otp', 'embla-carousel-react', 'react-resizable-panels'],
          charts: ['recharts'],
          pdf: ['jspdf', 'jspdf-autotable'],
          i18n: ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
          forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
        },
      },
    },
  },
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
    // ponytail: unit tests never talk to Supabase, so they get dummy credentials
    // instead of CI secrets — src/lib/env.ts throws on import without them.
    env: {
      VITE_SUPABASE_URL: 'https://test.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'test-publishable-key',
    },
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
    // Must come last: uploads source maps for production builds only, and is
    // skipped unless the auth token, org and project are all configured.
    mode === "production" &&
      sentryUploadEnabled &&
      sentryVitePlugin({
        authToken: sentryBuild.authToken,
        org: sentryBuild.org,
        project: sentryBuild.project,
        telemetry: false,
        // A failed upload should not break a release build; errors still get
        // reported to Sentry, just with minified stack traces.
        errorHandler: (err) => {
          console.warn("[sentry] source map upload skipped:", err.message);
        },
        sourcemaps: {
          // Don't ship source maps to end users.
          filesToDeleteAfterUpload: ["./dist/**/*.map"],
        },
      }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Stub Firebase web SDK — only native Android SDK is used via Capacitor plugins.
      // The @capacitor-firebase/* web fallback modules import these but they're never
      // called at runtime (analytics.ts guards with Capacitor.isNativePlatform()).
      "firebase/analytics": path.resolve(__dirname, "./src/lib/firebase-stub.ts"),
      "firebase/app": path.resolve(__dirname, "./src/lib/firebase-stub.ts"),
      "firebase/crashlytics": path.resolve(__dirname, "./src/lib/firebase-stub.ts"),
    },
  },
}));
