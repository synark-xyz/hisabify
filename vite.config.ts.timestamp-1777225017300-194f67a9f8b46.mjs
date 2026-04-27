// vite.config.ts
import { defineConfig } from "file:///sessions/modest-busy-pasteur/mnt/hisabify/node_modules/vite/dist/node/index.js";
import react from "file:///sessions/modest-busy-pasteur/mnt/hisabify/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { componentTagger } from "file:///sessions/modest-busy-pasteur/mnt/hisabify/node_modules/lovable-tagger/dist/index.js";
var __vite_injected_original_dirname = "/sessions/modest-busy-pasteur/mnt/hisabify";
var vite_config_default = defineConfig(({ mode }) => ({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          ui: ["vaul", "cmdk", "input-otp", "embla-carousel-react", "react-resizable-panels"],
          charts: ["recharts"],
          pdf: ["jspdf", "jspdf-autotable"],
          i18n: ["i18next", "react-i18next", "i18next-browser-languagedetector"],
          forms: ["react-hook-form", "@hookform/resolvers", "zod"]
        }
      }
    }
  },
  server: {
    host: true,
    // Listen on all local IPs
    // Hostnames only (no protocol). Wildcard patterns allow any ngrok tunnel without code changes.
    allowedHosts: [".ngrok-free.app", ".ngrok-free.dev", "localhost", "127.0.0.1"],
    port: Number(process.env.VITE_DEV_PORT || 8080),
    // Keep port stable for tunnels like ngrok instead of auto-switching.
    strictPort: true
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/lib/**", "src/hooks/**", "src/features/**"],
      exclude: [
        "src/integrations/**",
        "src/components/ui/**",
        "src/**/*.test.*",
        "src/**/__tests__/**"
      ],
      thresholds: {
        lines: 7,
        functions: 6,
        branches: 6
      }
    }
  },
  plugins: [
    react(),
    mode === "development" && componentTagger()
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
      "@": path.resolve(__vite_injected_original_dirname, "./src"),
      // Stub Firebase web SDK — only native Android SDK is used via Capacitor plugins.
      // The @capacitor-firebase/* web fallback modules import these but they're never
      // called at runtime (analytics.ts guards with Capacitor.isNativePlatform()).
      "firebase/analytics": path.resolve(__vite_injected_original_dirname, "./src/lib/firebase-stub.ts"),
      "firebase/app": path.resolve(__vite_injected_original_dirname, "./src/lib/firebase-stub.ts"),
      "firebase/crashlytics": path.resolve(__vite_injected_original_dirname, "./src/lib/firebase-stub.ts")
    }
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvc2Vzc2lvbnMvbW9kZXN0LWJ1c3ktcGFzdGV1ci9tbnQvaGlzYWJpZnlcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9zZXNzaW9ucy9tb2Rlc3QtYnVzeS1wYXN0ZXVyL21udC9oaXNhYmlmeS92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vc2Vzc2lvbnMvbW9kZXN0LWJ1c3ktcGFzdGV1ci9tbnQvaGlzYWJpZnkvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuLy8vIDxyZWZlcmVuY2UgdHlwZXM9XCJ2aXRlc3RcIiAvPlxuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgeyBjb21wb25lbnRUYWdnZXIgfSBmcm9tIFwibG92YWJsZS10YWdnZXJcIjtcbmltcG9ydCB7IFZpdGVQV0EgfSBmcm9tIFwidml0ZS1wbHVnaW4tcHdhXCI7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiAoe1xuICBidWlsZDoge1xuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBtYW51YWxDaHVua3M6IHtcbiAgICAgICAgICB2ZW5kb3I6IFsncmVhY3QnLCAncmVhY3QtZG9tJ10sXG4gICAgICAgICAgdWk6IFsndmF1bCcsICdjbWRrJywgJ2lucHV0LW90cCcsICdlbWJsYS1jYXJvdXNlbC1yZWFjdCcsICdyZWFjdC1yZXNpemFibGUtcGFuZWxzJ10sXG4gICAgICAgICAgY2hhcnRzOiBbJ3JlY2hhcnRzJ10sXG4gICAgICAgICAgcGRmOiBbJ2pzcGRmJywgJ2pzcGRmLWF1dG90YWJsZSddLFxuICAgICAgICAgIGkxOG46IFsnaTE4bmV4dCcsICdyZWFjdC1pMThuZXh0JywgJ2kxOG5leHQtYnJvd3Nlci1sYW5ndWFnZWRldGVjdG9yJ10sXG4gICAgICAgICAgZm9ybXM6IFsncmVhY3QtaG9vay1mb3JtJywgJ0Bob29rZm9ybS9yZXNvbHZlcnMnLCAnem9kJ10sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG4gIHNlcnZlcjoge1xuICAgIGhvc3Q6IHRydWUsIC8vIExpc3RlbiBvbiBhbGwgbG9jYWwgSVBzXG4gICAgLy8gSG9zdG5hbWVzIG9ubHkgKG5vIHByb3RvY29sKS4gV2lsZGNhcmQgcGF0dGVybnMgYWxsb3cgYW55IG5ncm9rIHR1bm5lbCB3aXRob3V0IGNvZGUgY2hhbmdlcy5cbiAgICBhbGxvd2VkSG9zdHM6IFsnLm5ncm9rLWZyZWUuYXBwJywgJy5uZ3Jvay1mcmVlLmRldicsICdsb2NhbGhvc3QnLCAnMTI3LjAuMC4xJ10sXG4gICAgcG9ydDogTnVtYmVyKHByb2Nlc3MuZW52LlZJVEVfREVWX1BPUlQgfHwgODA4MCksXG4gICAgLy8gS2VlcCBwb3J0IHN0YWJsZSBmb3IgdHVubmVscyBsaWtlIG5ncm9rIGluc3RlYWQgb2YgYXV0by1zd2l0Y2hpbmcuXG4gICAgc3RyaWN0UG9ydDogdHJ1ZSxcbiAgfSxcbiAgdGVzdDoge1xuICAgIGdsb2JhbHM6IHRydWUsXG4gICAgZW52aXJvbm1lbnQ6ICdqc2RvbScsXG4gICAgc2V0dXBGaWxlczogJy4vc3JjL3Rlc3Qvc2V0dXAudHMnLFxuICAgIGluY2x1ZGU6IFsnc3JjLyoqLyoue3Rlc3Qsc3BlY30ue3RzLHRzeH0nXSxcbiAgICBjb3ZlcmFnZToge1xuICAgICAgcHJvdmlkZXI6ICd2OCcsXG4gICAgICByZXBvcnRlcjogWyd0ZXh0JywgJ2h0bWwnLCAnbGNvdiddLFxuICAgICAgaW5jbHVkZTogWydzcmMvbGliLyoqJywgJ3NyYy9ob29rcy8qKicsICdzcmMvZmVhdHVyZXMvKionXSxcbiAgICAgIGV4Y2x1ZGU6IFtcbiAgICAgICAgJ3NyYy9pbnRlZ3JhdGlvbnMvKionLFxuICAgICAgICAnc3JjL2NvbXBvbmVudHMvdWkvKionLFxuICAgICAgICAnc3JjLyoqLyoudGVzdC4qJyxcbiAgICAgICAgJ3NyYy8qKi9fX3Rlc3RzX18vKionLFxuICAgICAgXSxcbiAgICAgIHRocmVzaG9sZHM6IHtcbiAgICAgICAgbGluZXM6IDcsXG4gICAgICAgIGZ1bmN0aW9uczogNixcbiAgICAgICAgYnJhbmNoZXM6IDYsXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCgpLFxuICAgIG1vZGUgPT09IFwiZGV2ZWxvcG1lbnRcIiAmJiBjb21wb25lbnRUYWdnZXIoKSxcbiAgICAvLyBWaXRlUFdBKHtcbiAgICAvLyAgIHJlZ2lzdGVyVHlwZTogXCJhdXRvVXBkYXRlXCIsXG4gICAgLy8gICBpbmNsdWRlQXNzZXRzOiBbXCJmYXZpY29uLmljb1wiLCBcInB3YS0xOTJ4MTkyLnBuZ1wiLCBcInB3YS01MTJ4NTEyLnBuZ1wiXSxcbiAgICAvLyAgIG1hbmlmZXN0OiBmYWxzZSwgLy8gV2UgdXNlIG91ciBvd24gbWFuaWZlc3QuanNvblxuICAgIC8vICAgd29ya2JveDoge1xuICAgIC8vICAgICBnbG9iUGF0dGVybnM6IFtcIioqLyoue2pzLGNzcyxodG1sLGljbyxwbmcsc3ZnLHdvZmYsd29mZjJ9XCJdLFxuICAgIC8vICAgICBydW50aW1lQ2FjaGluZzogW1xuICAgIC8vICAgICAgIHtcbiAgICAvLyAgICAgICAgIHVybFBhdHRlcm46IC9eaHR0cHM6XFwvXFwvLipcXC5zdXBhYmFzZVxcLmNvXFwvLiovaSxcbiAgICAvLyAgICAgICAgIGhhbmRsZXI6IFwiTmV0d29ya0ZpcnN0XCIsXG4gICAgLy8gICAgICAgICBvcHRpb25zOiB7XG4gICAgLy8gICAgICAgICAgIGNhY2hlTmFtZTogXCJzdXBhYmFzZS1jYWNoZVwiLFxuICAgIC8vICAgICAgICAgICBleHBpcmF0aW9uOiB7XG4gICAgLy8gICAgICAgICAgICAgbWF4RW50cmllczogNTAsXG4gICAgLy8gICAgICAgICAgICAgbWF4QWdlU2Vjb25kczogNjAgKiA2MCAqIDI0LCAvLyAyNCBob3Vyc1xuICAgIC8vICAgICAgICAgICB9LFxuICAgIC8vICAgICAgICAgfSxcbiAgICAvLyAgICAgICB9LFxuICAgIC8vICAgICAgIHtcbiAgICAvLyAgICAgICAgIHVybFBhdHRlcm46IC9cXC4ocG5nfGpwZ3xqcGVnfHN2Z3xnaWZ8d2VicCkkLyxcbiAgICAvLyAgICAgICAgIGhhbmRsZXI6IFwiQ2FjaGVGaXJzdFwiLFxuICAgIC8vICAgICAgICAgb3B0aW9uczoge1xuICAgIC8vICAgICAgICAgICBjYWNoZU5hbWU6IFwiaW1hZ2UtY2FjaGVcIixcbiAgICAvLyAgICAgICAgICAgZXhwaXJhdGlvbjoge1xuICAgIC8vICAgICAgICAgICAgIG1heEVudHJpZXM6IDEwMCxcbiAgICAvLyAgICAgICAgICAgICBtYXhBZ2VTZWNvbmRzOiA2MCAqIDYwICogMjQgKiAzMCwgLy8gMzAgZGF5c1xuICAgIC8vICAgICAgICAgICB9LFxuICAgIC8vICAgICAgICAgfSxcbiAgICAvLyAgICAgICB9LFxuICAgIC8vICAgICBdLFxuICAgIC8vICAgfSxcbiAgICAvLyB9KSxcbiAgXS5maWx0ZXIoQm9vbGVhbiksXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXG4gICAgICAvLyBTdHViIEZpcmViYXNlIHdlYiBTREsgXHUyMDE0IG9ubHkgbmF0aXZlIEFuZHJvaWQgU0RLIGlzIHVzZWQgdmlhIENhcGFjaXRvciBwbHVnaW5zLlxuICAgICAgLy8gVGhlIEBjYXBhY2l0b3ItZmlyZWJhc2UvKiB3ZWIgZmFsbGJhY2sgbW9kdWxlcyBpbXBvcnQgdGhlc2UgYnV0IHRoZXkncmUgbmV2ZXJcbiAgICAgIC8vIGNhbGxlZCBhdCBydW50aW1lIChhbmFseXRpY3MudHMgZ3VhcmRzIHdpdGggQ2FwYWNpdG9yLmlzTmF0aXZlUGxhdGZvcm0oKSkuXG4gICAgICBcImZpcmViYXNlL2FuYWx5dGljc1wiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjL2xpYi9maXJlYmFzZS1zdHViLnRzXCIpLFxuICAgICAgXCJmaXJlYmFzZS9hcHBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyYy9saWIvZmlyZWJhc2Utc3R1Yi50c1wiKSxcbiAgICAgIFwiZmlyZWJhc2UvY3Jhc2hseXRpY3NcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyYy9saWIvZmlyZWJhc2Utc3R1Yi50c1wiKSxcbiAgICB9LFxuICB9LFxufSkpO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFnVCxTQUFTLG9CQUFvQjtBQUU3VSxPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBQ2pCLFNBQVMsdUJBQXVCO0FBSmhDLElBQU0sbUNBQW1DO0FBUXpDLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxPQUFPO0FBQUEsRUFDekMsT0FBTztBQUFBLElBQ0wsZUFBZTtBQUFBLE1BQ2IsUUFBUTtBQUFBLFFBQ04sY0FBYztBQUFBLFVBQ1osUUFBUSxDQUFDLFNBQVMsV0FBVztBQUFBLFVBQzdCLElBQUksQ0FBQyxRQUFRLFFBQVEsYUFBYSx3QkFBd0Isd0JBQXdCO0FBQUEsVUFDbEYsUUFBUSxDQUFDLFVBQVU7QUFBQSxVQUNuQixLQUFLLENBQUMsU0FBUyxpQkFBaUI7QUFBQSxVQUNoQyxNQUFNLENBQUMsV0FBVyxpQkFBaUIsa0NBQWtDO0FBQUEsVUFDckUsT0FBTyxDQUFDLG1CQUFtQix1QkFBdUIsS0FBSztBQUFBLFFBQ3pEO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUE7QUFBQTtBQUFBLElBRU4sY0FBYyxDQUFDLG1CQUFtQixtQkFBbUIsYUFBYSxXQUFXO0FBQUEsSUFDN0UsTUFBTSxPQUFPLFFBQVEsSUFBSSxpQkFBaUIsSUFBSTtBQUFBO0FBQUEsSUFFOUMsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBLE1BQU07QUFBQSxJQUNKLFNBQVM7QUFBQSxJQUNULGFBQWE7QUFBQSxJQUNiLFlBQVk7QUFBQSxJQUNaLFNBQVMsQ0FBQywrQkFBK0I7QUFBQSxJQUN6QyxVQUFVO0FBQUEsTUFDUixVQUFVO0FBQUEsTUFDVixVQUFVLENBQUMsUUFBUSxRQUFRLE1BQU07QUFBQSxNQUNqQyxTQUFTLENBQUMsY0FBYyxnQkFBZ0IsaUJBQWlCO0FBQUEsTUFDekQsU0FBUztBQUFBLFFBQ1A7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxNQUNGO0FBQUEsTUFDQSxZQUFZO0FBQUEsUUFDVixPQUFPO0FBQUEsUUFDUCxXQUFXO0FBQUEsUUFDWCxVQUFVO0FBQUEsTUFDWjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixTQUFTLGlCQUFpQixnQkFBZ0I7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFpQzVDLEVBQUUsT0FBTyxPQUFPO0FBQUEsRUFDaEIsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBO0FBQUE7QUFBQTtBQUFBLE1BSXBDLHNCQUFzQixLQUFLLFFBQVEsa0NBQVcsNEJBQTRCO0FBQUEsTUFDMUUsZ0JBQWdCLEtBQUssUUFBUSxrQ0FBVyw0QkFBNEI7QUFBQSxNQUNwRSx3QkFBd0IsS0FBSyxRQUFRLGtDQUFXLDRCQUE0QjtBQUFBLElBQzlFO0FBQUEsRUFDRjtBQUNGLEVBQUU7IiwKICAibmFtZXMiOiBbXQp9Cg==
