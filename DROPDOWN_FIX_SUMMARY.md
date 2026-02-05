# Dropdown Visibility Fix — Bottomsheet + Dropdowns

## Problem Diagnosis
The visibility issue came from a combination of **stacking context conflicts** and **overflow clipping** after bringing the bottomsheet to the front for better UX.

### Root Causes Identified
- **Bottomsheet brought forward**: `DrawerOverlay` at `z-40` and `DrawerContent` at `z-[60]` ensured the sheet sits above most content.
- **Stacking contexts from transforms**: Vaul and global rules like `.fixed { transform: translateZ(0) }` create new stacking contexts, trapping child layers (dropdowns/popovers) beneath the sheet.
- **CSS containment**: Broad `[class*="rounded-"] { contain: layout style paint }` introduced containment that prevented overlays from escaping.
- **Overflow clipping**: The scroll area used `overflow-x: hidden`, clipping dropdowns that extend horizontally.
- **Z-index mismatch**: Dropdowns at `z-50`/`z-[100]` couldn’t surpass the bottomsheet layers, and z-index alone cannot break stacking contexts.

## Fixes Applied

### 1. Shared Overlay Portal (All Overlay Components)
**Files Modified:**
- `src/components/ui/select.tsx`
- `src/components/ui/popover.tsx`
- `src/components/ui/context-menu.tsx`
- `src/components/ui/tooltip.tsx`
- `src/components/ui/hover-card.tsx`

**Changes:**
- Route all Radix `Portal` components to a shared overlay root: `container={getOverlayRoot() ?? document.body}`
- Use the global overlay container `[index.html → #overlay-root]` to consistently escape drawer/dialog stacking contexts
- Raise overlay content z-index to `z-[99999]` for reliable top-layer rendering

### 2. Overflow Fix (MobileDialog)
**File:** `src/components/ui/mobile-dialog.tsx`

**Changes:**
```jsx
// Before: overflow-y-auto overflow-x-hidden
// After: Explicit inline styles allowing horizontal overflow
style={{
  overflowY: 'auto',
  overflowX: 'visible',  // Allow dropdowns to overflow horizontally
  overscrollBehavior: 'contain',
  WebkitOverflowScrolling: 'touch',
  touchAction: 'pan-y'
}}
```

### 3. CSS Stacking Context Prevention
**File:** `src/index.css`

**Rules (exceptions):
```css
/* Prevent transform from creating stacking contexts on dialogs */
[data-vaul-drawer-wrapper],
[data-radix-dialog-content],
[role="dialog"] {
  isolation: auto !important;
}

/* Prevent CSS containment on drawer/dialog containers */
[data-vaul-drawer] [class*="rounded-"],
[data-radix-dialog-content] [class*="rounded-"],
[role="dialog"] [class*="rounded-"],
[data-vaul-drawer-content],
[data-radix-dialog-content] {
  contain: none !important;
}
```

Additionally, the global Radix portal wrapper is positioned at the very top layer:
```css
[data-radix-portal] { position: fixed; inset: 0; z-index: 99999; }
```

## How It Works Now

### Portal Rendering Flow
```
Document Body
├─ App Content (#root)
├─ Bottomsheet Portal
│  ├─ DrawerOverlay (z-40)
│  └─ DrawerContent (z-[60], transforms isolated)
│      └─ MobileDialog (overflowX: visible)
└─ Overlay Root (#overlay-root, z-99999)
  └─ Radix Portal Content (Select/Popover/etc.)
    └─ Dropdown items
```

### Key Points
1. **Portal escape**: Overlays render in `#overlay-root`, outside of drawer/dialog stacking contexts.
2. **No clipping**: `overflowX: visible` prevents horizontal cutoffs in the scroll area.
3. **Context isolation**: `isolation: auto` + `contain: none` ensure transforms don’t trap overlays.
4. **Top-most layer**: Portal wrapper and overlay content at `z-[99999]` ensure consistent visibility above the bottomsheet.

## Testing Instructions

### 1. Rebuild Application
```bash
# Clear old build
rm -rf dist

# Rebuild for development
npm run build:dev

# Or for production
npm run build

# Sync with Capacitor
npx cap sync
```

### 2. Test on Web
```bash
npm run dev
```
- Open "Create Budget" bottomsheet
- Test Category / Period / Currency popover / Date selectors — all overlays should render above the sheet
- Scroll the bottomsheet with a dropdown open — overlay stays positioned and visible

### 3. Test on Mobile (Android/iOS)
```bash
# Android
npx cap open android

# iOS
npx cap open ios
```
- Repeat web scenarios on multiple screen sizes
- Verify with keyboard open and while scrolling

## Affected Components

All modals using `MobileDialog` wrapper:
- ✅ Create Budget Modal (AddBudgetModal.tsx)
  - Category dropdown
  - Period dropdown
  - Currency popover
  - Date selects
- ✅ Add Transaction Modal (AddTransactionModal.tsx)
- ✅ Edit Transaction Modal (EditTransactionModal.tsx)
- ✅ Add Payment Reminder Modal (AddPaymentReminderModal.tsx)
- ✅ Add Savings Goal Modal (AddSavingsGoalModal.tsx)

## Verification Checklist

- [ ] Dropdowns render above bottomsheet overlay/content
- [ ] Dropdowns not clipped by modal edges
- [ ] Scrolling modal doesn't break dropdown positioning
- [ ] Multiple nested modals work correctly
- [ ] Touch interaction works on mobile
- [ ] No visual glitches or flickering
- [ ] Performance is acceptable

## Rollback Instructions

If issues occur, revert these files:
```bash
git checkout src/components/ui/select.tsx
git checkout src/components/ui/popover.tsx
git checkout src/components/ui/context-menu.tsx
git checkout src/components/ui/tooltip.tsx
git checkout src/components/ui/hover-card.tsx
git checkout src/components/ui/mobile-dialog.tsx
git checkout src/index.css
```

## Additional Notes

- The `!important` flags in CSS are necessary to override broad performance optimizations that can create stacking contexts/containment.
- For any new overlay components, ensure they:
  1. Use a Portal with `container={getOverlayRoot() ?? document.body}`
  2. Use `z-[99999]` (or the overlay token) for content
  3. Use `position="popper"` for Radix components
- Monitor performance on older Android devices; some containment optimizations are disabled for correctness.

---
**Date:** 2026-02-05
**Fixed By:** GPT 5 : Copilot
