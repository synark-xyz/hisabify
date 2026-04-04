# UI Review — Reports Page & Navigation

**Audited:** 2026-03-20
**Baseline:** Abstract 6-pillar standards (no UI-SPEC.md found)
**Design system:** Tailwind CSS + shadcn/ui, Exo 2 typeface, three themes (default light/dark, cyberpunk)
**Screenshots:** Not captured — Playwright browsers not installed; localhost:8080 is running but `npx playwright install` is required for screenshot capture. Audit is code-only.

**Files in scope (modified/new):**
- `src/pages/ReportsPage.tsx`
- `src/components/reports/ReportSavingsSection.tsx` (new)
- `src/hooks/useReportData.tsx`
- `src/components/reports/index.ts`
- `src/components/BottomNavigation.tsx`
- `src/components/Layout.tsx`

**Supporting files reviewed:**
- `src/components/reports/ReportCharts.tsx`
- `src/components/reports/ReportSummary.tsx`
- `src/components/reports/ReportFiltersPanel.tsx`
- `src/components/reports/ReportTemplatesPanel.tsx`
- `src/components/reports/ReportExportActions.tsx`
- `src/index.css`
- `tailwind.config.ts`
- `src/pages/Dashboard.tsx` (baseline reference)

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | Copy is specific and contextual; one internal note leaks to UI |
| 2. Visuals | 3/4 | Clear hierarchy with sensible skeleton states; pie-chart labels may clip at narrow widths |
| 3. Color | 2/4 | Hardcoded color values in ReportSummary and ReportCharts bypass the theme token system |
| 4. Typography | 4/4 | Controlled scale (xs, sm, base, lg, 2xl) with two weights; consistent with app patterns |
| 5. Spacing | 3/4 | Standard scale used throughout; one arbitrary fixed-height value warrants review |
| 6. Experience Design | 2/4 | No error state surfaced to the UI; query errors are thrown but never shown to the user |

**Overall: 17/24**

---

## Top 3 Priority Fixes

1. **No error state in ReportsPage** — Users who lose connectivity or hit a Supabase error see an empty/zeroed report with no feedback. Add `isError` destructuring from `useQuery` in `useReportData`, return it alongside `isLoading`, and render an inline error banner or retry button in `ReportsPage.tsx` when `isError === true`.

2. **Hardcoded colors break dark and cyberpunk themes** — `ReportSummary.tsx` uses `text-red-500`, `text-green-500`, `text-blue-500`, `text-orange-500`, `text-emerald-500` as inline static strings. `ReportCharts.tsx` line 160 hard-codes `hsl(142 76% 36%)` as the income area fill. None of these respect the active theme's token palette. Replace semantic status colors with `text-destructive` / `text-chart-4` (green) / theme-aware equivalents, and change the hard-coded HSL string to `hsl(var(--chart-4))`.

3. **Delete template has no confirmation dialog** — `ReportTemplatesPanel.tsx` line 84 fires `onDeleteTemplate(template.id)` immediately on the trash button click with no confirmation step. A mis-tap destroys a saved filter set permanently. Wrap the delete in an `AlertDialog` (shadcn) with a "Delete template?" confirmation, consistent with the destructive-action pattern used elsewhere in the app.

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

Copy throughout the reports module is purposeful and specific:

- Page heading "Reports" is clear.
- Section labels "Expense Analysis" and "Budget Performance" (`ReportsPage.tsx` lines 128, 133) are descriptive and use uppercase tracking to read as section headings.
- Empty states are specific: "No expense data for selected period" (`ReportCharts.tsx` line 79), "No budget data for selected period" (line 116), "No savings goals yet." with a CTA link (`ReportSavingsSection.tsx` lines 38–39).
- Export buttons correctly differentiate free vs. premium: "Export as CSV (Pro)" (`ReportExportActions.tsx` line 71).
- Toast messages on export are clear: "CSV report downloaded!", "Failed to export CSV".
- History-limit toast ("Free plan supports the last 30 days. Upgrade for full history.") is informative and action-oriented (`ReportsPage.tsx` lines 47–48).

One minor issue: The filter helper text "No categories selected = all categories included" (`ReportFiltersPanel.tsx` line 264) reads as internal developer shorthand. Prefer prose: "Showing all categories. Select specific ones to narrow results."

**Score rationale:** Specific, contextual copy everywhere except one developer-style helper string. No generic "Submit", "OK", "Cancel" (except the template dialog Cancel button, which is appropriate there), or "Something went wrong" in the reports flow itself.

---

### Pillar 2: Visuals (3/4)

**Positive signals:**
- Skeleton loading state (`ReportsPage.tsx` lines 117–122) covers the main content area with three stacked skeletons that approximate the actual content height. This prevents layout shift.
- Two-column sidebar+main layout (`lg:grid-cols-[300px_1fr]`) gives clear visual priority to the report content on large screens.
- Section dividers using uppercase tracking (`text-sm font-semibold text-muted-foreground uppercase tracking-wide`) create visual rhythm without heavy borders.
- `ReportSavingsSection.tsx` empty state has a 40px dimmed HandCoins icon with a CTA link — a clear focal hierarchy.
- `BottomNavigation.tsx` uses a sliding `layoutId="nav-indicator"` spring animation on the active tab indicator — polished microinteraction.

**Issues:**
- Pie chart in `ReportCharts.tsx` uses `label` prop rendering `category (percentage%)` directly on the donut slice with `labelLine={false}`. For users with 4+ categories, labels will overlap or clip inside a 250px height container. Consider replacing inline labels with a separate `<Legend>` or a custom tooltip-only approach.
- Skeleton loading does not replicate the sidebar (filters/templates/export panels remain interactive while content loads). The sidebar stays fully rendered with interactive controls while the main area shows skeletons — this asymmetry may confuse users into thinking something failed. Consider disabling the export button during load (it already receives `isLoading` but only disables it; the filters panel does not show any loading feedback).
- The FAB in `Layout.tsx` is positioned `right-4` with a fixed `calc(5.5rem + ...)` bottom offset. On the Reports page this FAB adds a transaction — contextually useful but potentially confusing given the page is purely analytical. No visual differentiation from other pages.

---

### Pillar 3: Color (2/4)

**Hardcoded color values found:**

`ReportSummary.tsx` — six hardcoded Tailwind palette literals (not token-based):
- Line 19: `"text-red-500"` and `"bg-red-500/10"` (Total Expenses)
- Line 24: `"text-green-500"` and `"bg-green-500/10"` (Total Income)
- Line 32: `"text-green-500"` / `"text-red-500"` (Net Balance — conditional)
- Line 39: `"text-blue-500"` and `"bg-blue-500/10"` (Transaction count)
- Line 46: `"text-orange-500"` and `"bg-orange-500/10"` (Avg. Expense)
- Line 53: `"text-emerald-500"` and `"bg-emerald-500/10"` (Avg. Income)

`ReportCharts.tsx` — one hardcoded HSL string not using a CSS variable:
- Line 160: `stroke="hsl(142 76% 36%)"` and `fill="hsl(142 76% 36%)"` for the Income area in the area chart. This is a raw hex-equivalent value that does not respond to dark/cyberpunk theme switching.

`ReportFiltersPanel.tsx`:
- Line 250: `style={{ backgroundColor: category.color }}` — this is user-defined category color data, not a design-system concern; acceptable.

**Theme-aware color usage (positive):**
- Chart tooltip `contentStyle` uses `hsl(var(--card))` and `hsl(var(--border))` correctly in `ReportCharts.tsx` lines 70–73, 104–107, 141–144.
- Bar chart bars use `hsl(var(--primary))` and `hsl(var(--destructive))` correctly (lines 110–111).
- `BottomNavigation.tsx` uses `text-accent` / `text-muted-foreground` and `bg-accent` via CSS variable tokens correctly.

**Score rationale:** The charts partially honor the token system but the summary stats widget completely bypasses it with raw Tailwind palette classes. In cyberpunk theme, `text-blue-500` does not remap to neon teal, `text-green-500` does not remap to gold — the Summary Statistics card will appear visually inconsistent with the rest of the page in non-default themes.

---

### Pillar 4: Typography (4/4)

**Font sizes in use across audited files:**
- `text-xs` (12px) — percentage labels, metadata, helper text
- `text-sm` (14px) — body copy, links, filter labels
- `text-base` (16px) — card titles
- `text-lg` (18px) — stat values in ReportSummary
- `text-2xl` (24px) — page heading "Reports"

Five sizes total; this is within the acceptable 4–5 range for a data-dense page. The Dashboard uses a similar scale with `text-3xl`/`text-4xl` for the balance card, but the reports context is analytical rather than celebratory, so the flatter scale is appropriate.

**Font weights in use:**
- `font-normal` (400) — date picker placeholder labels
- `font-medium` (500) — links, goal names, template names
- `font-semibold` (600) — section labels, card titles, stat values
- `font-bold` (700) — page heading only

Four weights, but `font-normal` is only used in a single date-picker placeholder state. Functionally this is a three-weight system (medium / semibold / bold), which is clean.

**No arbitrary font sizes found.** The `text-[11px]` class used in `BottomNavigation.tsx` line 49 is the only custom size, and it is used for the navigation label under the active icon — a standard mobile nav pattern where 11px is the accepted minimum for bottom bar labels.

---

### Pillar 5: Spacing (3/4)

**Standard spacing usage:**
- Page wrapper: `p-4 pb-24 space-y-6` (`ReportsPage.tsx` line 82) — standard 4-unit base with 24-unit bottom safe area.
- Grid gaps: `gap-6` (main layout), `gap-4` (chart grid), `gap-2` (header row).
- Card internals use `space-y-4`, `space-y-5`, `space-y-1.5` — the `space-y-5` in `ReportSavingsSection.tsx` line 44 is slightly non-standard (most app components use `space-y-4` or `space-y-6`) but not incorrect.

**Arbitrary values found in reports components:**
- `ReportCharts.tsx` line 78: `h-[250px]`, line 115: `h-[250px]`, line 167: `h-[300px]` — fixed pixel heights on chart containers. These are appropriate for chart containers where Recharts requires explicit dimensions, but they are not part of the spacing scale.
- `ReportTemplatesPanel.tsx` line 101: `max-w-[400px]` — standard dialog width constraint, common in the codebase.
- `ReportSavingsSection.tsx` line 48: `max-w-[60%]` — truncation clamp, acceptable.

**`pb-24` concern:** `ReportsPage.tsx` line 82 applies `pb-24` (96px) as a bottom padding on the page container. This is in addition to the `pb-page-content` utility on the `<main>` tag in `Layout.tsx` line 84 which already calculates `140px + safe-area-inset-bottom`. The double bottom padding could produce excessive whitespace at the bottom of the Reports page compared to other pages. Other page routes do not add a second `pb-24` — this appears to be a carryover from a standalone layout. The safe clearance from `Layout.tsx` alone is sufficient.

---

### Pillar 6: Experience Design (2/4)

**Loading states: present and correct**
- `ReportsPage.tsx` renders three `Skeleton` blocks during load (lines 117–122).
- `ReportExportActions.tsx` disables export buttons while `isLoading` is true (lines 68, 77).
- `isLoading` is derived from three parallel queries in `useReportData.tsx` (OR of `transactionsLoading || budgetsLoading || savingsLoading`).

**Empty states: present and specific**
- "No expense data for selected period" (ReportCharts, pie chart)
- "No budget data for selected period" (ReportCharts, bar chart)
- "No data for selected period" (ReportCharts, area chart — slightly generic compared to the others)
- "No savings goals yet." with a creation CTA (ReportSavingsSection)
- "No saved templates" with descriptive sub-text (ReportTemplatesPanel)

**Error states: missing**
- `useReportData.tsx` queries use `if (error) throw error` inside each `queryFn`, meaning TanStack Query will set `isError: true` on query failure.
- `useReportData.tsx` does not return `isError` or any error value to its callers.
- `ReportsPage.tsx` does not destructure or display any error state. If all three queries fail (e.g., network drop), the user sees a zeroed "Summary Statistics" card (all zeros) and empty charts with no indication that something went wrong or how to recover.
- The `ErrorBoundary` wrapping the app (`src/components/ErrorBoundary.tsx`) would only catch render-time exceptions, not async query failures that resolve to an error state.

**Destructive action confirmation: missing**
- `ReportTemplatesPanel.tsx` line 84: deleting a saved template fires `onDeleteTemplate(template.id)` directly with no confirmation. This is a data-destructive action with no undo.

**Disabled states: correct**
- Export buttons are disabled while loading and when no transactions exist.
- "Save Template" button is disabled when the name input is empty.

**Subscription gating: implemented**
- Export actions show "(Pro)" suffix for free users and trigger the UpgradeModal rather than a hard error.
- Free user history is clamped with a toast notification and UpgradeModal trigger.

**Score rationale:** The app handles loading and empty states well, but the complete absence of any error surface for the three data queries is a significant gap for a finance app where data accuracy is critical. Users cannot distinguish "no data" from "failed to load data."

---

## Registry Safety

shadcn is initialized. `components.json` references only the official `https://ui.shadcn.com/schema.json` schema. No third-party registry entries found. Registry audit: 0 third-party blocks to check.

---

## Files Audited

| File | Purpose |
|------|---------|
| `src/pages/ReportsPage.tsx` | Reports page orchestration, filters state, loading/upgrade logic |
| `src/components/reports/ReportSavingsSection.tsx` | New savings goals section with progress bars |
| `src/components/reports/ReportSummary.tsx` | 6-stat summary card grid |
| `src/components/reports/ReportCharts.tsx` | Pie, bar, and area charts via Recharts |
| `src/components/reports/ReportFiltersPanel.tsx` | Date range, type, category filters |
| `src/components/reports/ReportTemplatesPanel.tsx` | Save/load/delete filter templates |
| `src/components/reports/ReportExportActions.tsx` | CSV and PDF export buttons |
| `src/components/reports/index.ts` | Barrel export |
| `src/hooks/useReportData.tsx` | TanStack Query data layer for reports |
| `src/components/BottomNavigation.tsx` | 5-item bottom nav with spring animations |
| `src/components/Layout.tsx` | Layout wrapper, FAB, page transitions |
| `src/index.css` | Design tokens, theme variables, mobile optimizations |
| `tailwind.config.ts` | Tailwind theme extensions |
| `src/pages/Dashboard.tsx` | Baseline UI patterns reference |
