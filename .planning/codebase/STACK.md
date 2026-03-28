# Technology Stack

**Analysis Date:** 2025-03-19

## Languages

**Primary:**
- TypeScript 5.8.3 - Full codebase type safety, strict mode with custom overrides in `tsconfig.json`
- React 18.3.1 - UI components and state management

**Secondary:**
- JavaScript (Deno) - Supabase Edge Functions running on Deno runtime
- Kotlin/Java - Android native integration (via Capacitor plugins)
- Swift - iOS native integration (via Capacitor plugins)

## Runtime

**Environment:**
- Node.js (development) - Local development and build process
- Deno - Supabase Edge Functions runtime for serverless compute

**Package Manager:**
- npm (primary)
- bun (fallback/preferred for speed)
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- React 18.3.1 - UI component library and hooks
- React Router 6.30.1 - Client-side routing with protected routes
- Vite 5.4.19 - Build tool and dev server with HMR support

**UI & Styling:**
- Tailwind CSS 3.4.17 - Utility-first CSS framework
- Radix UI (40+ components) - Accessible component primitives
  - `@radix-ui/react-dialog`, `@radix-ui/react-select`, `@radix-ui/react-toast`, etc.
- shadcn/ui - Pre-built components wrapping Radix UI + Tailwind
- Framer Motion 12.23.26 - GPU-accelerated animations
- `@phosphor-icons/react` 2.1.10 - Icon library
- Lucide React 0.462.0 - Additional icons

**State Management:**
- React Context API - Auth, theme, currency, profile state
- React Hook Form 7.61.1 - Form state and validation
- TanStack React Query 5.83.0 - Server state, caching, real-time updates
- Zod 3.25.76 - Schema validation for forms and API responses

**Backend/Data:**
- Supabase (PostgreSQL + Auth + Edge Functions) - Backend-as-a-service
- `@supabase/supabase-js` 2.89.0 - JavaScript client with real-time subscriptions

**Testing:**
- Vitest 4.0.18 - Unit/integration test runner (Vite-native)
- Testing Library (`@testing-library/react` 16.3.2, `@testing-library/dom` 10.4.1) - Component testing
- `@vitest/coverage-v8` 4.0.18 - Code coverage reporting
- Playwright 1.49.0 - E2E testing framework
- jsdom 27.4.0 - DOM simulation for Node.js tests

**Build & Dev:**
- Vite 5.4.19 - Lightning-fast build tool
- `@vitejs/plugin-react-swc` 3.11.0 - React plugin with SWC compiler
- lovable-tagger 1.1.13 - Component identification in development
- Capacitor 8.0+ - Mobile cross-platform bridge

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` 2.89.0 - PostgreSQL access, auth, real-time updates
- `@capacitor/core` 8.0.1 - Native mobile bridge for iOS/Android
- `react-hook-form` 7.61.1 - Efficient form handling with validation
- `@tanstack/react-query` 5.83.0 - Server state synchronization

**Mobile & Native:**
- `@capacitor/android` 8.0.1 - Android platform layer
- `@capacitor/ios` 8.0.1 - iOS platform layer
- `@capacitor/push-notifications` 8.0.2 - Firebase Cloud Messaging (Android)
- `@capacitor/camera` 8.0.2 - Device camera access
- `@capacitor/geolocation` 8.1.0 - GPS and location services
- `@capacitor/local-notifications` 8.0.2 - Local notification scheduling
- `@capacitor/preferences` 8.0.1 - Persistent device storage
- `@capacitor/keyboard` 8.0.0 - Keyboard visibility handling
- `@capacitor-community/speech-recognition` 7.0.1 - Voice-to-text transcription
- `@capacitor-firebase/analytics` 8.1.0 - Firebase Analytics (native Android only)
- `@capacitor-firebase/crashlytics` 8.1.0 - Error tracking (native Android only)
- `@revenuecat/purchases-capacitor` 12.2.4 - In-app subscription management

**UI Components & Effects:**
- `recharts` 2.15.4 - Data visualization (charts, graphs)
- `embla-carousel-react` 8.6.0 - Carousel/swipe navigation
- `vaul` 0.9.9 - Drawer component library
- `react-resizable-panels` 2.1.9 - Resizable panel layouts
- `sonner` 1.7.4 - Toast notifications
- `react-day-picker` 8.10.1 - Date picker calendar
- `input-otp` 1.4.2 - OTP input component
- `cmdk` 1.1.1 - Command/search interface

**Utilities:**
- `tesseract.js` 5.1.0 - Client-side OCR (receipt scanning)
- `jspdf` 4.0.0 + `jspdf-autotable` 5.0.7 - PDF generation for reports
- `papaparse` 5.5.3 - CSV parsing and export
- `date-fns` 3.6.0 - Date manipulation and formatting
- `card-validator` 10.0.3 - Credit card validation
- `class-variance-authority` 0.7.1 - Component variant management
- `clsx` 2.1.1 - Classname utility
- `tailwind-merge` 2.6.0 - Merge Tailwind CSS classes
- `next-themes` 0.3.0 - Dark/light/custom theme management

**Analytics & Monitoring:**
- `@vercel/analytics` 2.0.1 - Vercel web analytics
- Custom Sentry integration (optional via `VITE_SENTRY_DSN`)

**PWA & Offline:**
- `vite-plugin-pwa` 0.21.0 - Progressive Web App support (currently disabled in config)

## Configuration

**Environment:**
- Variables prefixed with `VITE_` are exposed to client code
- Critical vars:
  - `VITE_SUPABASE_URL` - Supabase API endpoint
  - `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key for client auth
  - `VITE_SUPABASE_PROJECT_ID` - Project identifier
  - `VITE_APP_URL` - Production app URL (for OAuth redirects and email links)
  - `VITE_APP_NAME` - Application branding
  - `VITE_SENTRY_DSN` - Error tracking (optional)
  - `VITE_ENABLE_ANALYTICS` - Enable Firebase Analytics on native (default: true)
  - `VITE_REVENUECAT_API_KEY` - In-app purchase configuration (native only)
- Server-side env vars (Supabase Edge Functions):
  - `SUPABASE_URL` - Service role access
  - `SERVICE_ROLE_KEY` - Privileged database operations
  - `OPENEXCHANGE_API_KEY` - Exchange rate API
  - `REVENUECAT_WEBHOOK_AUTH_HEADER` - Webhook signature verification

**Build:**
- `tsconfig.json` - Path alias `@/*` → `./src/*`, lenient compilation settings
- `vite.config.ts` - HMR on all local IPs, ngrok tunnel support, test environment setup
- `.eslintrc` - JavaScript linting
- `postcss.config.js` - Tailwind CSS processing

## Platform Requirements

**Development:**
- Node.js 18+ (for package managers, build tools)
- TypeScript 5.8.3
- Git (for version control)
- Xcode 14+ (for iOS development, macOS only)
- Android Studio 4.2+ (for Android development)

**Production:**
- Vercel deployment (SPA hosting with rewrite rules)
- Supabase PostgreSQL database with Edge Functions
- Google OAuth (authentication)
- Firebase Cloud Messaging (Android push notifications)
- RevenueCat (in-app purchases and subscription management)
- OpenExchange API (currency conversion rates)

**Mobile (Native):**
- iOS 13+ (via Capacitor)
- Android 8+ (API level 26+)
- App ID: `io.synark.hisabify`

---

*Stack analysis: 2025-03-19*
