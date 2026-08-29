# Hisabify — Personal finance made simple

Hisabify helps individuals track cards, expenses, budgets, and recurring payments with an easy, mobile-first web interface. This repository contains the frontend SPA and integration points for the backend.

Key user-facing functionality
- Add and manage cards
- Add, edit, and categorize transactions
- Create budgets and savings goals
- Set recurring payment reminders
- View simple analytics and monthly overviews
- Upgrade to Hisabify Pro (in-app subscription); the free tier on Android shows a single anchored ad banner

For non-technical information about features, roadmap, and priorities see `PRD.md`.

If you want to contribute code or run the project locally, see the Quick local setup section below and `CLAUDE.md` for architecture and conventions.

For Supabase local, staging, and production migration workflows, see `SUPABASE_SETUP.md`.

This README intentionally focuses on product description rather than technical setup.
 
About the project
-----------------
Hisabify is a privacy-minded, mobile-first personal finance web app. We help solve these common user problems:

- Fragmented spending across multiple cards and accounts — bring card-level visibility into one view.
- Missed recurring bills — surface upcoming payments and reminders.
- Lack of simple, actionable insights — provide clear monthly overviews and category breakdowns.

Most attractive features
------------------------
- Clean mobile-first UI with a bottom navigation and quick-add modals.
- Card-centric transactions and per-card spending summaries.
- Planner & savings goals to help users set and track short-term financial targets.
- Lightweight analytics (monthly trends + category donut) to spot overspend quickly.

For contributors
----------------
We welcome contributors. This repo is private — please open issues or send PRs to the `develop` branch and follow this flow:

- Create a short issue describing the change or enhancement.
- Branch from `develop` using `feat/`, `fix/`, or `chore/` prefixes (e.g. `feat/payment-reminders`).
- Open a pull request describing the user problem and solution; link the related issue.

Tech snapshot (quick)
---------------------
- Frontend: React + TypeScript, built with Vite.
- Styling: Tailwind CSS and shadcn UI primitives under `src/components/ui/`.
- Backend: Supabase for Auth, Postgres, and Edge Functions (see `integrations/supabase`).
- Mobile: Capacitor 8 for iOS and Android native apps.

Quick local setup (developer)
-----------------------------
Use `bun` if available (preferred for fast installs), or `npm` as fallback.

```bash
# with bun
bun install
bun dev

# or with npm
npm install
npm run dev
```

The dev server will start on `http://localhost:8080` (or next available port).

## Mobile App Development (iOS/Android)

Hisabify is built as a cross-platform mobile app using Capacitor 8. You can develop and test on both iOS and Android devices.

### Quick Mobile Setup

**Option 1: Localhost Development (Fastest) ⚡**

Perfect for rapid development with instant hot reload:

```bash
# 1. Find your local IP address
npm run local-ip

# 2. Point capacitor.config.ts's local URL at the right host
#    (Android emulator 10.0.2.2, physical device your LAN IP, iOS simulator localhost)

# 3. Start dev server
npm run dev

# 4. Sync in local mode, then run on device
APP_ENV=local npx cap sync
npm run dev:android  # for Android
npm run dev:ios      # for iOS
```

> Where the native app loads the web app from is the `APP_ENV` environment variable read by
> `capacitor.config.ts` at sync time — `production` (default, bundled `dist/`), `staging`
> (`STAGING_URL`), or `local`. Never commit a change to that file to point at your machine.

**Option 2: Build & Deploy**

For testing production builds:

```bash
# Build the app
npm run build

# Sync with Capacitor
npm run cap:sync

# Open in IDE
npm run cap:android  # Opens Android Studio
npm run cap:ios      # Opens Xcode
```

### Localhost Configuration

We've optimized the development workflow with localhost support:

- **Android Emulator**: Uses `http://10.0.2.2:8080` (pre-configured)
- **Android Physical Device**: Use your computer's IP (find with `npm run local-ip`)
- **iOS Simulator**: Uses `http://localhost:8080`

For complete setup instructions, troubleshooting, and network configuration, see the
**Capacitor Mobile** section of [CLAUDE.md](./CLAUDE.md).

### Available NPM Scripts

```bash
# Mobile Development
npm run local-ip        # Find your local IP for device testing
npm run cap:sync        # Sync web app with native projects
npm run cap:android     # Build and open Android Studio
npm run cap:ios         # Build and open Xcode
npm run dev:android     # Quick run on Android (no rebuild)
npm run dev:ios         # Quick run on iOS (no rebuild)
npm run cap:android:staging  # Build + sync with APP_ENV=staging, open Android Studio
npm run cap:android:release  # Build + sync with APP_ENV=production, open Android Studio

# Web Development
npm run dev             # Start Vite dev server
npm run build           # Production build
npm run build:dev       # Development build
npm run preview         # Preview production build
npm run lint            # Run ESLint
npm run test            # Run Vitest tests (watch)
npm run test:unit       # Single-run unit tests
npm run test:coverage   # Single-run unit tests with coverage (what CI runs)
npm run test:e2e        # Playwright E2E (needs .env.test + a dev server)

# Automated test runners (timestamped reports under /test-report)
npm run test:automated       # Unit coverage + E2E (all)
npm run test:automated:unit  # Unit tests with coverage only
npm run test:automated:e2e   # E2E only
```

### Automated Test Reports

Each automated test run creates a timestamped directory:

`test-report/YYYYMMDD-HHMMSS/`

Generated artifacts include:
- Unit test logs and coverage report (`unit/coverage/index.html`)
- E2E logs, Playwright HTML report (`e2e/html-report/index.html`), and Playwright artifacts (`e2e/test-results/`)
- Run summary (`summary.txt`)

You can also run the script directly:

```bash
bash scripts/run-automated-tests.sh all
bash scripts/run-automated-tests.sh unit
bash scripts/run-automated-tests.sh e2e
```

## Performance Optimizations

Hisabify is optimized for smooth 60fps animations on both iOS and Android:

- **GPU Acceleration**: All animations use hardware acceleration
- **CSS Containment**: Optimized rendering with layout/paint containment
- **Backdrop Blur**: Efficient backdrop-filter implementation for Android
- **Particle Effects**: Optimized 20-particle background animations
- **Touch Optimizations**: Platform-specific optimizations for mobile gestures
- **Zero Layout Shifts**: Prevented reflow during typewriter and dynamic content

See `src/index.css` for mobile-specific performance optimizations.

Where to look next
------------------
- Product & requirements: `PRD.md`
- Supabase local/staging/prod setup: `SUPABASE_SETUP.md`
- Architecture & tech guidance: `TRD.md`
- AI development guidance: `CLAUDE.md`
- Mobile app setup: the **Capacitor Mobile** section of `CLAUDE.md`, and `docs/ANDROID_ENVIRONMENTS.md` for build environments
- Changes & updates: `CHANGELOG.md`
- UI components: `src/components/` and `src/components/ui/`
- Hooks and domain logic: `src/hooks/`
- Performance optimizations: `src/index.css` (see mobile optimization comments)

Contact
-------
If you need access, onboarding, or project-specific environment variables, open an issue or contact the repo owner.
Contributing guidelines and local scripts can be added to `CONTRIBUTING.md` on request.
