# Repository Guidelines

## Project Structure & Module Organization
Hisabify is a React + TypeScript SPA with Capacitor mobile wrappers.

- `src/pages/`: route-level screens (`Dashboard`, `BudgetPage`, `profile/*`, `settings/*`).
- `src/components/`: reusable UI and feature components; `src/components/ui/` contains shadcn/Radix primitives.
- `src/hooks/`: domain/data hooks (`useTransactions`, `useBudgets`, `useAuth`, etc.).
- `src/lib/`: shared utilities (security, logging, export/report helpers).
- `src/features/`: scoped feature modules (for example `gamification/`, `referrals/`).
- `src/integrations/supabase/`: Supabase client and generated types.
- `supabase/migrations/`: database schema changes.
- `src/**/__tests__/` and `src/test/setup.ts`: test files and test setup.
- `public/`, `assets/`: static assets; `android/`, `ios/`: native projects.

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run dev`: start Vite dev server (default `:8080`).
- `npm run dev:managed`: start managed mobile-friendly dev server.
- `npm run build`: production build to `dist/`.
- `npm run preview`: preview production build locally.
- `npm run lint`: run ESLint for TypeScript/React rules.
- `npm run test`: run Vitest test suite.
- `npm run cap:sync`: sync web build with Capacitor projects.
- `npm run cap:android` / `npm run cap:ios`: build, sync, and open native IDE project.

## Coding Style & Naming Conventions
- Use TypeScript and functional React components.
- Follow existing formatting: 2-space indentation, semicolons, and consistent import ordering.
- Prefer `@/` alias imports (configured in `tsconfig.json`) over deep relative paths.
- Naming: `PascalCase` for components/pages, `camelCase` for variables/functions, hooks prefixed with `use`.
- Treat `src/components/ui/` as shared primitives; wrap/extending is preferred over direct edits.

## Testing Guidelines
- Framework: Vitest with Testing Library (`jsdom`, `src/test/setup.ts`).
- Test names: `*.test.ts` / `*.test.tsx`; use `*.integration.test.tsx` for flow-level tests.
- Add/update tests for new hooks, utilities, and behavior changes.
- Before opening a PR, run `npm run lint` and `npm run test`.
- No enforced coverage gate is configured; keep new code paths tested.

## Commit & Pull Request Guidelines
- Commit style in this repo is short, imperative summaries (for example: `Add ...`, `Fix ...`, `Refactor ...`).
- Branch naming convention: `feat/...`, `fix/...`, or `chore/...`.
- PRs should include:
  - clear problem and solution summary,
  - linked issue/ticket,
  - screenshots or recordings for UI changes,
  - notes on testing performed (commands + key results).

## Security & Configuration Tips
- Never commit `.env`; use `.env.example` as the template.
- Keep client-exposed env vars prefixed with `VITE_`.
- For schema changes, add a migration in `supabase/migrations/` and update generated Supabase types.
