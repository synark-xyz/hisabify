# UI Code Splitting Plan

## Build Warning
Chunks exceeding 500 kB after minification. Addressed via manual chunk configuration in Vite.

## Vite Config (`vite.config.ts`)

```ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        vendor: ['react', 'react-dom'],
        ui: ['@radix-ui/themes', '@radix-ui/*'],
      },
    },
  },
},
```

## Status
- [x] Configure `manualChunks` in `vite.config.ts`
- [x] Identify other large dependencies to split (charts, pdf, i18n, forms)
- [x] Test lazy loading for heavy components (pages split into separate chunks)
- [x] Measure bundle size after changes

## Results
| Chunk | Size (gzip) | Contents |
|-------|------------|----------|
| index (main) | 396 kB | Core app logic, Supabase, hooks |
| charts | 114 kB | Recharts (loaded with InsightsPage) |
| pdf | 137 kB | jsPDF (lazy loaded) |
| ui | 63 kB | Radix UI, cmdk, embla-carousel |
| i18n | 21 kB | i18next |
| forms | 22 kB | react-hook-form, zod |
| BudgetPage | 27 kB | Lazy loaded |
| InsightsPage | 31 kB | Lazy loaded |
