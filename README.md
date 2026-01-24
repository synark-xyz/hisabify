# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

# Hisabify — Personal finance made simple

Hisabify helps individuals track cards, expenses, budgets, and recurring payments with an easy, mobile-first web interface. This repository contains the frontend SPA and integration points for the backend.

Key user-facing functionality
- Add and manage cards
- Add, edit, and categorize transactions
- Create budgets and savings goals
- Set recurring payment reminders
- View simple analytics and monthly overviews

For non-technical information about features, roadmap, and priorities see `PRD.md`.

If you want to contribute code or run the project locally, see `CONTRIBUTING.md` (or open an issue requesting setup guidance).

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
We welcome contributors. This repo is private — please open issues or send PRs to the `main` branch and follow this flow:

- Create a short issue describing the change or enhancement.
- Branch from `main` using `feat/`, `fix/`, or `chore/` prefixes (e.g. `feat/payment-reminders`).
- Open a pull request describing the user problem and solution; link the related issue.

Tech snapshot (quick)
---------------------
- Frontend: React + TypeScript, built with Vite.
- Styling: Tailwind CSS and shadcn UI primitives under `src/components/ui/`.
- Backend: Supabase for Auth, Postgres, and Edge Functions (see `integrations/supabase`).

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

Where to look next
------------------
- Product & requirements: `PRD.md`
- Architecture & tech guidance: `TRD.md`
- UI components: `src/components/` and `src/components/ui/`
- Hooks and domain logic: `src/hooks/`

Contact
-------
If you need access, onboarding, or project-specific environment variables, open an issue or contact the repo owner.

Contributing guidelines and local scripts can be added to `CONTRIBUTING.md` on request.
Follow these steps:
