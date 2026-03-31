# Transaction Form Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the transaction form to use Expense/Income tabs with contextual PAYER/PAYEE fields, a prominent Voice/Scan row, a "Split with" field, a tap-to-view expense details dialog, and a shared ResponsiveDrawer shell for both Voice and Receipt modals — removing unused components in the process.

**Architecture:** TransactionForm gains tab-based type selection (Expense/Income only), encodes PAYER/PAYEE/SPLIT_WITH in the note field using `[payer:X]`/`[payee:X]`/`[split_with:X]` prefixes. VoiceInputFlow and ReceiptScannerModal are refactored to use ResponsiveDrawer instead of custom bottom-sheet markup. A new TransactionDetailsDialog opens on transaction tap for a read/edit/delete view. Layout.tsx is simplified: FAB goes directly to AddTransactionModal; InputMethodSheet is deleted.

**Tech Stack:** React 18, TypeScript, shadcn `Tabs` + `Dialog` + `ResponsiveDrawer`, Framer Motion, react-hook-form, Supabase

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| **Modify** | `src/components/VoiceInputFlow.tsx` | Replace custom backdrop+sheet with `ResponsiveDrawer` |
| **Modify** | `src/components/ReceiptScannerModal.tsx` | Replace custom backdrop+panel with `ResponsiveDrawer` |
| **Modify** | `src/components/Layout.tsx` | Remove InputMethodSheet; FAB → direct AddTransactionModal |
| **Modify** | `src/components/AddTransactionModal.tsx` | Remove header icon buttons; pass voice/scan callbacks to TransactionForm |
| **Modify** | `src/components/TransactionForm.tsx` | Tabs, PAYER/PAYEE field, Voice/Scan row, Split With field, note encoding/decoding |
| **Modify** | `src/components/TransactionItem.tsx` | Parse note meta tags for display; add `onViewDetails` prop; tap → view details |
| **Modify** | `src/pages/ExpensesPage.tsx` | Wire `onViewDetails` + mount TransactionDetailsDialog |
| **Create** | `src/components/TransactionDetailsDialog.tsx` | Tap-to-view details dialog with Edit/Delete actions |
| **Delete** | `src/components/InputMethodSheet.tsx` | Unused after Layout.tsx refactor |

---

## Task 1: Refactor VoiceInputFlow to use ResponsiveDrawer

**Files:**
- Modify: `src/components/VoiceInputFlow.tsx`

- [ ] **Step 1: Read the file and understand current structure**

The file uses two `{open && (...)}` blocks: a `motion.div` backdrop and a `motion.div` bottom sheet. The inner content starts at `<div className="p-6">`.

- [ ] **Step 2: Replace custom sheet with ResponsiveDrawer**

Replace the entire component's return with:

```tsx
import { ResponsiveDrawer } from '@/components/ui/responsive-drawer';

// In return statement — replace everything:
return (
  <ResponsiveDrawer
    open={open}
    onOpenChange={(isOpen) => {
      if (!isOpen) handleClose();
    }}
    title="Voice Input"
    className="max-h-[85vh]"
  >
    <div className="flex flex-col items-center gap-5">

      {/* Type selector — always visible; read-only while recording */}
      <div className="w-full flex rounded-xl border border-border overflow-hidden">
        {(['expense', 'income'] as const).map(t => (
          <button
            key={t}
            onClick={() => phase !== 'recording' && setTransactionType(t)}
            className={cn(
              "flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors",
              phase === 'recording' && "opacity-50 cursor-not-allowed",
              t === 'expense' && transactionType === 'expense' && "bg-red-500/15 text-red-500",
              t === 'income'  && transactionType === 'income'  && "bg-green-500/15 text-green-500",
              transactionType !== t && "text-muted-foreground",
            )}
          >
            {t === 'expense'
              ? <TrendingDown className="w-4 h-4" />
              : <TrendingUp   className="w-4 h-4" />
            }
            {t === 'expense' ? 'Expense' : 'Income'}
          </button>
        ))}
      </div>

      {/* Mic button */}
      <div className="relative flex items-center justify-center">
        {phase === 'recording' && (
          <>
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
              className="absolute w-36 h-36 rounded-full bg-red-500/30 pointer-events-none"
            />
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ repeat: Infinity, duration: 1.5, delay: 0.3, ease: 'easeInOut' }}
              className="absolute w-36 h-36 rounded-full bg-red-500/20 pointer-events-none"
            />
          </>
        )}
        <button
          onClick={handleMicTap}
          disabled={phase === 'result'}
          className={cn(
            "relative z-10 w-36 h-36 rounded-full flex flex-col items-center justify-center gap-2",
            "transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed",
            phase === 'recording' ? "bg-red-500/15" : "bg-accent/10",
          )}
        >
          {phase === 'recording'
            ? <Square className="w-12 h-12 text-red-500" />
            : <Mic    className="w-12 h-12 text-accent" />
          }
          <span className="text-xs font-medium text-muted-foreground">
            {micLabel}
          </span>
        </button>
      </div>

      {/* Status */}
      <div className="w-full text-center min-h-[2rem]">
        {phase === 'idle' && !error && (
          <p className="text-sm text-muted-foreground">
            Select a type, then tap the mic to start
          </p>
        )}
        {phase === 'recording' && (
          <p className="text-sm text-muted-foreground animate-pulse">Listening…</p>
        )}
      </div>

      {/* Error */}
      {error && phase !== 'recording' && (
        <Card className="w-full bg-destructive/5 border-destructive/20 p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-xs text-destructive flex-1">{error}</p>
          </div>
        </Card>
      )}

      {/* Result card */}
      {phase === 'result' && (
        <div className="w-full space-y-3">
          {transcript ? (
            <Card className="bg-muted/50 p-4 border-border/50">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Recognized:</p>
                  <p className="text-sm font-mono text-foreground/80">"{transcript}"</p>
                </div>
                <div className="flex items-start gap-2 pt-2 border-t border-border/50">
                  {aiLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 text-accent animate-spin mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-muted-foreground">Analyzing with AI…</p>
                    </>
                  ) : hasParsedData ? (
                    <>
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-xs text-muted-foreground">Extracted:</p>
                          {parsed.confidence && parsed.confidence !== 'high' && (
                            <span className={cn(
                              "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                              parsed.confidence === 'medium'
                                ? "bg-yellow-500/15 text-yellow-600"
                                : "bg-orange-500/15 text-orange-600",
                            )}>
                              {parsed.confidence} confidence
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          {parsed.merchant && (
                            <span className="text-sm font-medium capitalize">
                              {parsed.merchant}
                            </span>
                          )}
                          {parsed.amount && (
                            <span className={cn(
                              "text-sm font-bold",
                              transactionType === 'income' ? "text-green-600" : "text-red-600",
                            )}>
                              {transactionType === 'income' ? '+' : '-'}
                              {parsed.amount.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-orange-600 flex-1">
                        Could not extract merchant or amount — try again or add manually
                      </p>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ) : (
            <p className="text-sm text-center text-muted-foreground">
              No speech detected. Try again.
            </p>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRetry} className="flex-1" disabled={aiLoading}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            {hasParsedData && !aiLoading ? (
              <Button
                onClick={handleUseTranscript}
                className={cn(
                  "flex-1",
                  transactionType === 'income'
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-accent hover:bg-accent/90",
                )}
              >
                <Check className="w-4 h-4 mr-2" />
                Use This
              </Button>
            ) : !aiLoading ? (
              <Button variant="outline" onClick={handleAddManually} className="flex-1">
                <Plus className="w-4 h-4 mr-2" />
                Add Manually
              </Button>
            ) : null}
          </div>
        </div>
      )}

      {/* Tips — idle only */}
      {phase === 'idle' && (
        <div className="w-full p-3 bg-muted/30 rounded-lg border border-border/30">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">
                {transactionType === 'income' ? 'Income examples:' : 'Expense examples:'}
              </p>
              <ul className="list-disc list-inside space-y-0.5 ml-1">
                {tips.map(tip => <li key={tip}>{tip}</li>)}
                <li>Speak clearly and include an amount</li>
              </ul>
            </div>
          </div>
        </div>
      )}

    </div>
  </ResponsiveDrawer>
);
```

- [ ] **Step 3: Remove unused imports**

Remove from imports: `motion` (from framer-motion) — only needed if you kept animations inside. Keep `motion` for pulse rings on mic button.

Update imports at top of file:
```tsx
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Mic, Square, Check, X, AlertCircle, Sparkles, Plus,
  TrendingUp, TrendingDown, RefreshCw, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ResponsiveDrawer } from '@/components/ui/responsive-drawer';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useCurrency } from '@/hooks/useCurrency';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
```

Remove `X` from lucide imports (X button is now provided by ResponsiveDrawer).

- [ ] **Step 4: Remove `handleClose` reference from `X` button (it no longer exists)**

The `handleClose` function is still needed for `handleAddManually`, `handleUseTranscript`, and the `useEffect` cleanup. Keep it. The ResponsiveDrawer's X button calls `onOpenChange(false)`, which triggers `useEffect` cleanup via the `open` prop. This is fine.

- [ ] **Step 5: Build and verify no TypeScript errors**

```bash
cd "/Users/sayem/Business MVPs/hisabify" && npm run build 2>&1 | head -50
```

Expected: No errors related to VoiceInputFlow.

- [ ] **Step 6: Commit**

```bash
cd "/Users/sayem/Business MVPs/hisabify" && git add src/components/VoiceInputFlow.tsx && git commit -m "refactor: migrate VoiceInputFlow to ResponsiveDrawer shell"
```

---

## Task 2: Refactor ReceiptScannerModal to use ResponsiveDrawer

**Files:**
- Modify: `src/components/ReceiptScannerModal.tsx`

- [ ] **Step 1: Replace the AnimatePresence + backdrop + panel wrapper**

The current structure is:
```
AnimatePresence
  {open && <>
    <motion.div backdrop />
    <input ref={fileInputRef} ... />   ← keep this
    <motion.div Scanner Panel>
      <div bg-card/90 rounded-3xl>
        <div header>   ← remove (title + X button)
        <div content>  ← keep
      </div>
    </motion.div>
  </>}
```

Replace with `ResponsiveDrawer`. The file input needs to exist regardless of modal open state, so place it outside the drawer:

```tsx
import { ResponsiveDrawer } from '@/components/ui/responsive-drawer';

export function ReceiptScannerModal({ open, onOpenChange, onScanComplete }: ReceiptScannerModalProps) {
    // ... all existing state and handlers unchanged ...

    return (
        <>
            {/* Hidden file input — must exist in DOM always for .click() to work */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) await processImage(file);
                    e.target.value = '';
                }}
            />

            <ResponsiveDrawer
                open={open}
                onOpenChange={onOpenChange}
                title="Scan Receipt"
                className="max-h-[80vh]"
            >
                {/* Privacy Indicator */}
                {privacyMode && (
                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-500 font-bold uppercase tracking-wider bg-emerald-500/10 px-2 py-1 rounded-full w-fit mb-3">
                        <Sparkles className="w-3 h-3" /> Stealth Mode Active
                    </div>
                )}

                <div className="min-h-[300px] flex flex-col">
                    <AnimatePresence mode="wait">
                        {!previewImage && !scanning && (
                            <motion.div
                                key="options"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex-1 flex flex-col items-center justify-center gap-4"
                            >
                                <div className="text-center space-y-2 mb-4">
                                    <h4 className="text-lg font-bold">Capture Receipt</h4>
                                    <p className="text-muted-foreground text-sm">Auto-extract details from your receipt</p>
                                </div>
                                <div className="w-full space-y-3">
                                    <Button
                                        onClick={handleTakePhoto}
                                        className="w-full h-14 rounded-2xl text-base font-bold gap-3"
                                    >
                                        <Camera className="w-5 h-5" />
                                        Take Photo
                                    </Button>
                                    <Button
                                        onClick={handleChooseFromGallery}
                                        variant="outline"
                                        className="w-full h-14 rounded-2xl text-base font-bold gap-3"
                                    >
                                        <Image className="w-5 h-5" />
                                        Choose from Gallery
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground text-center mt-4">
                                    We'll automatically extract merchant, amount, and date
                                </p>
                            </motion.div>
                        )}

                        {scanning && (
                            <motion.div
                                key="scanning"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex-1 flex flex-col items-center justify-center gap-4"
                            >
                                <Loader2 className="w-12 h-12 animate-spin text-accent" />
                                <div className="text-center space-y-2">
                                    <h4 className="text-lg font-bold">Analyzing Receipt...</h4>
                                    <p className="text-muted-foreground text-sm">{scanLabel}</p>
                                </div>
                            </motion.div>
                        )}

                        {previewImage && !scanning && (
                            <motion.div
                                key="preview"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex-1 flex flex-col gap-4"
                            >
                                {/* Image Preview */}
                                <div className="relative rounded-2xl overflow-hidden border border-border bg-muted/50">
                                    <img
                                        src={previewImage}
                                        alt="Receipt preview"
                                        className="w-full h-48 object-cover"
                                    />
                                    {extractedData && (
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur-sm p-3">
                                            <div className="flex items-center gap-2 text-white text-xs">
                                                <Check className="w-4 h-4 text-emerald-400" />
                                                <span className="font-bold">
                                                    {extractedData.merchant || 'Merchant not detected'}
                                                </span>
                                                {extractedData.amount && (
                                                    <span className="text-emerald-400 ml-auto font-mono">
                                                        {extractedData.currency || '$'}{extractedData.amount.toFixed(2)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Extracted Data Summary */}
                                {extractedData && (
                                    <div className="bg-muted/50 rounded-2xl p-4 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Extracted Details</h5>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                                AI Vision
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <p className="text-[10px] text-muted-foreground">Merchant</p>
                                                <p className="text-sm font-bold">{extractedData.merchant || '—'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-muted-foreground">Amount</p>
                                                <p className="text-sm font-bold text-emerald-500">
                                                    {extractedData.amount
                                                        ? `${extractedData.currency || '$'}${extractedData.amount.toFixed(2)}`
                                                        : '—'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-muted-foreground">Date</p>
                                                <p className="text-sm font-bold">
                                                    {extractedData.date ? extractedData.date.toLocaleDateString() : '—'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Old receipt warning */}
                                {extractedData?.date && (new Date().getTime() - extractedData.date.getTime()) > 365 * 24 * 60 * 60 * 1000 && (
                                    <div className="flex items-start gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3">
                                        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                                        <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
                                            <span className="font-bold">Old receipt detected.</span> The date on this bill is over a year ago. If you're adding it now, edit the date to today in the next step.
                                        </p>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex gap-3 pt-2">
                                    <Button
                                        variant="outline"
                                        onClick={handleRetake}
                                        className="flex-1 rounded-xl"
                                    >
                                        Retake
                                    </Button>
                                    <Button
                                        onClick={handleConfirm}
                                        disabled={!extractedData}
                                        className="flex-1 rounded-xl"
                                    >
                                        Continue
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </ResponsiveDrawer>
        </>
    );
}
```

- [ ] **Step 2: Update imports — remove unused, add ResponsiveDrawer**

```tsx
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Sparkles, Image, Check, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResponsiveDrawer } from '@/components/ui/responsive-drawer';
import { useProfile } from '@/hooks/useProfile';
import { usePermissions } from '@/hooks/usePermissions';
import { useCurrency } from '@/hooks/useCurrency';
import { useUserBehavior } from '@/hooks/useUserBehavior';
import { Capacitor } from '@capacitor/core';
import { useToast } from '@/hooks/use-toast';
import { compressForGemini } from '@/lib/imageProcessor';
import { callGeminiVision } from '@/lib/geminiVision';
```

Remove: `X` (no longer needed).

- [ ] **Step 3: Build and verify no TypeScript errors**

```bash
cd "/Users/sayem/Business MVPs/hisabify" && npm run build 2>&1 | head -50
```

- [ ] **Step 4: Commit**

```bash
cd "/Users/sayem/Business MVPs/hisabify" && git add src/components/ReceiptScannerModal.tsx && git commit -m "refactor: migrate ReceiptScannerModal to ResponsiveDrawer shell"
```

---

## Task 3: Simplify Layout.tsx — remove InputMethodSheet, streamline FAB flow

**Files:**
- Modify: `src/components/Layout.tsx`

The goal: FAB and `open-input-sheet` event both open `AddTransactionModal` directly. Remove `InputMethodSheet`, standalone `VoiceInputFlow`, and standalone `ReceiptScannerModal` from Layout (they are now embedded inside `AddTransactionModal`).

- [ ] **Step 1: Rewrite Layout.tsx**

```tsx
import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { BottomNavigation } from '@/components/BottomNavigation';
import { useVisualViewport } from '@/hooks/useVisualViewport';
import { AddTransactionModal } from '@/components/AddTransactionModal';
import { Header } from '@/components/Header';
import { useTheme } from '@/hooks/useTheme';
import { CyberpunkBackground } from '@/components/CyberpunkBackground';
import { cn } from '@/lib/utils';

export function Layout() {
    const [showManual, setShowManual] = useState(false);

    const location = useLocation();
    const { variant } = useTheme();
    const { isKeyboardOpen } = useVisualViewport();

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, [location.pathname]);

    useEffect(() => {
        const handleOpenModal = () => setShowManual(true);
        window.addEventListener('open-input-sheet', handleOpenModal);
        return () => window.removeEventListener('open-input-sheet', handleOpenModal);
    }, []);

    const getPageTitle = (pathname: string) => {
        switch (pathname) {
            case '/': return 'Dashboard';
            case '/budget': return 'Budget';
            case '/savings': return 'Savings';
            case '/expenses': return 'Expenses';
            case '/reports': return 'Reports';
            case '/profile': return 'Profile';
            case '/profile/personal': return 'Personal Info';
            case '/profile/data': return 'Data Management';
            case '/profile/invite': return 'Invite Friends';
            case '/analytics': return 'Analytics';
            default: return 'Hisabify';
        }
    };

    const isProfileSubPage = location.pathname.startsWith('/profile/');
    const isProfileRootPage = location.pathname === '/profile';
    const shouldShowBack = isProfileSubPage || isProfileRootPage;

    return (
        <div className="min-h-screen relative">
            {variant === 'cyberpunk' && <CyberpunkBackground />}

            <Header
                title={getPageTitle(location.pathname)}
                variant={location.pathname === '/profile' ? 'profile' : 'default'}
                showBack={shouldShowBack}
            />

            <main className="relative z-10 pb-page-content">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                        <Outlet />
                    </motion.div>
                </AnimatePresence>
            </main>

            <BottomNavigation />

            {/* Floating Action Button */}
            <AnimatePresence>
                {!isKeyboardOpen && (
                    <motion.button
                        onClick={() => setShowManual(true)}
                        aria-label="Add transaction"
                        data-testid="fab-button"
                        className="fixed right-4 z-50 w-14 h-14 rounded-full bg-accent text-white shadow-fab flex items-center justify-center"
                        style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.9 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    >
                        <Plus className="w-6 h-6" strokeWidth={2.5} />
                    </motion.button>
                )}
            </AnimatePresence>

            <AddTransactionModal
                open={showManual}
                onOpenChange={setShowManual}
                onSuccess={() => {
                    window.dispatchEvent(new Event('transaction-updated'));
                }}
            />
        </div>
    );
}
```

- [ ] **Step 2: Build and verify**

```bash
cd "/Users/sayem/Business MVPs/hisabify" && npm run build 2>&1 | head -50
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/sayem/Business MVPs/hisabify" && git add src/components/Layout.tsx && git commit -m "refactor: simplify Layout — FAB opens AddTransactionModal directly, remove InputMethodSheet"
```

---

## Task 4: Delete InputMethodSheet.tsx

**Files:**
- Delete: `src/components/InputMethodSheet.tsx`

- [ ] **Step 1: Delete the file**

```bash
rm "/Users/sayem/Business MVPs/hisabify/src/components/InputMethodSheet.tsx"
```

- [ ] **Step 2: Build to confirm nothing references it**

```bash
cd "/Users/sayem/Business MVPs/hisabify" && npm run build 2>&1 | head -50
```

Expected: No errors. If any error references `InputMethodSheet`, fix the import in that file.

- [ ] **Step 3: Commit**

```bash
cd "/Users/sayem/Business MVPs/hisabify" && git add -A && git commit -m "chore: delete unused InputMethodSheet component"
```

---

## Task 5: Update AddTransactionModal — remove header icons, add voice/scan callbacks to form

**Files:**
- Modify: `src/components/AddTransactionModal.tsx`

Currently the modal renders tiny mic/camera icon buttons above the form. These move into `TransactionForm` as a prominent row (Task 6). The modal continues to own the state for `showVoice` and `showReceipt`.

- [ ] **Step 1: Rewrite AddTransactionModal.tsx**

```tsx
import { useState } from 'react';
import { ResponsiveDrawer } from '@/components/ui/responsive-drawer';
import { TransactionForm } from '@/components/TransactionForm';
import { VoiceInputFlow } from '@/components/VoiceInputFlow';
import { ReceiptScannerModal, ScannedReceiptData } from '@/components/ReceiptScannerModal';

interface AddTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialType?: 'expense' | 'income' | 'lend' | 'owe';
  initialData?: {
    merchant?: string;
    amount?: number;
    category?: string;
    receiptUrl?: string | null;
    date?: Date;
    currency?: string;
  };
  initialBudgetId?: string | null;
}

export function AddTransactionModal({
  open,
  onOpenChange,
  onSuccess,
  initialType,
  initialData,
  initialBudgetId,
}: AddTransactionModalProps) {
  const [showVoice, setShowVoice] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [prefillData, setPrefillData] = useState<Record<string, unknown>>(initialData ?? {});
  const [prefillKey, setPrefillKey] = useState(0);

  const handleVoiceComplete = (data: { merchant?: string; amount?: number; currency?: string; type?: string }) => {
    setPrefillData({ merchant: data.merchant, amount: data.amount, currency: data.currency });
    setPrefillKey((k) => k + 1);
    setShowVoice(false);
  };

  const handleReceiptComplete = (data: ScannedReceiptData) => {
    setPrefillData({
      merchant: data.merchant,
      amount: data.amount,
      date: data.date,
      receiptUrl: data.receiptUrl ?? null,
      currency: data.currency,
    });
    setPrefillKey((k) => k + 1);
    setShowReceipt(false);
  };

  return (
    <>
      <ResponsiveDrawer
        open={open}
        onOpenChange={onOpenChange}
        title="New Transaction"
        className="max-h-[90vh]"
      >
        <TransactionForm
          key={prefillKey}
          mode="create"
          onSuccess={() => {
            onSuccess();
            onOpenChange(false);
          }}
          onSuccessKeepOpen={() => onSuccess()}
          onCancel={() => onOpenChange(false)}
          initialType={initialType}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          initialData={prefillData as any}
          initialBudgetId={initialBudgetId}
          onVoiceRequest={() => setShowVoice(true)}
          onScanRequest={() => setShowReceipt(true)}
        />
      </ResponsiveDrawer>

      <VoiceInputFlow
        open={showVoice}
        onOpenChange={setShowVoice}
        onComplete={handleVoiceComplete}
      />
      <ReceiptScannerModal
        open={showReceipt}
        onOpenChange={setShowReceipt}
        onScanComplete={handleReceiptComplete}
      />
    </>
  );
}
```

- [ ] **Step 2: Build — expect TS error on `onVoiceRequest`/`onScanRequest` props (TransactionForm doesn't have them yet)**

```bash
cd "/Users/sayem/Business MVPs/hisabify" && npm run build 2>&1 | head -30
```

Expected: Error like `Property 'onVoiceRequest' does not exist on type 'TransactionFormProps'`. This is expected — Task 6 adds those props.

- [ ] **Step 3: Commit as work-in-progress (skip build check)**

```bash
cd "/Users/sayem/Business MVPs/hisabify" && git add src/components/AddTransactionModal.tsx && git commit -m "refactor: AddTransactionModal passes voice/scan callbacks to TransactionForm"
```

---

## Task 6: Refactor TransactionForm — tabs, PAYER/PAYEE, Voice/Scan row, Split With, note encoding

**Files:**
- Modify: `src/components/TransactionForm.tsx`

This is the largest task. Apply changes in the order listed to avoid breaking intermediate states.

### 6a — Add new props and state

- [ ] **Step 1: Add `onVoiceRequest` and `onScanRequest` to the props interface**

Find:
```tsx
interface TransactionFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  onSuccessKeepOpen?: () => void;
  mode?: 'create' | 'edit';
  initialTransaction?: Transaction | null;
  initialType?: 'expense' | 'income' | 'lend' | 'owe';
  initialData?: {
```

Replace with:
```tsx
interface TransactionFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  onSuccessKeepOpen?: () => void;
  mode?: 'create' | 'edit';
  initialTransaction?: Transaction | null;
  initialType?: 'expense' | 'income' | 'lend' | 'owe';
  onVoiceRequest?: () => void;
  onScanRequest?: () => void;
  initialData?: {
```

- [ ] **Step 2: Destructure the new props in the function signature**

Find:
```tsx
  initialBudgetId,
}: TransactionFormProps) {
```

Replace with:
```tsx
  initialBudgetId,
  onVoiceRequest,
  onScanRequest,
}: TransactionFormProps) {
```

- [ ] **Step 3: Add `payer`, `payee`, `splitWith` state after the existing `reminderEnabled` state block**

Find:
```tsx
  /* ─── Reminder toggle state ─── */
  const [reminderEnabled, setReminderEnabled] = useState(false);
```

Replace with:
```tsx
  /* ─── Payer / Payee / Split With ─── */
  const [payer, setPayer] = useState('');
  const [payee, setPayee] = useState('');
  const [splitWith, setSplitWith] = useState('');

  /* ─── Reminder toggle state ─── */
  const [reminderEnabled, setReminderEnabled] = useState(false);
```

- [ ] **Step 4: Add `parseNoteMeta` utility function above the component (after `stripLegacyNoteTag`)**

Find:
```tsx
export function TransactionForm({
```

Insert before it:
```tsx
function parseNoteMeta(note: string | null): {
  payer: string; payee: string; splitWith: string; cleanNote: string;
} {
  let remaining = stripLegacyNoteTag(note);
  let payer = '';
  let payee = '';
  let splitWith = '';

  const payerMatch = remaining.match(/^\[payer:([^\]]*)\]\s*/);
  if (payerMatch) { payer = payerMatch[1]; remaining = remaining.slice(payerMatch[0].length); }

  const payeeMatch = remaining.match(/^\[payee:([^\]]*)\]\s*/);
  if (payeeMatch) { payee = payeeMatch[1]; remaining = remaining.slice(payeeMatch[0].length); }

  const splitMatch = remaining.match(/^\[split_with:([^\]]*)\]\s*/);
  if (splitMatch) { splitWith = splitMatch[1]; remaining = remaining.slice(splitMatch[0].length); }

  return { payer, payee, splitWith, cleanNote: remaining };
}
```

### 6b — Update resetFormState and initializeEditState

- [ ] **Step 5: Reset payer/payee/splitWith in `resetFormState`**

Find:
```tsx
  const resetFormState = useCallback(() => {
    setSelectedTags([]);
    setTransactionStatus('cleared');
    setIsSplit(false);
    setSplitRows([]);
    setSelectedParentCategoryId('');
    setCustomCategoryLabel('');
    setCustomCategoryError('');
    setMerchantSuggestions([]);
    setShowSuggestions(false);
    setReminderEnabled(false);
    setReminderDate(undefined);
    setReminderDateOpen(false);
  }, []);
```

Replace with:
```tsx
  const resetFormState = useCallback(() => {
    setSelectedTags([]);
    setTransactionStatus('cleared');
    setIsSplit(false);
    setSplitRows([]);
    setSelectedParentCategoryId('');
    setCustomCategoryLabel('');
    setCustomCategoryError('');
    setMerchantSuggestions([]);
    setShowSuggestions(false);
    setReminderEnabled(false);
    setReminderDate(undefined);
    setReminderDateOpen(false);
    setPayer('');
    setPayee('');
    setSplitWith('');
  }, []);
```

- [ ] **Step 6: Update `initializeEditState` to parse note meta**

Find inside `initializeEditState`:
```tsx
    form.reset({
      merchant: initialTransaction.merchant,
      amount: String(initialTransaction.amount_original || initialTransaction.amount),
      categoryId: initialTransaction.category_id || '',
      date: new Date(initialTransaction.date),
      note: stripLegacyNoteTag(initialTransaction.note),
      currency: initialTransaction.currency_original || currency,
    });
```

Replace with:
```tsx
    const { payer: initPayer, payee: initPayee, splitWith: initSplitWith, cleanNote } = parseNoteMeta(initialTransaction.note);
    form.reset({
      merchant: initialTransaction.merchant,
      amount: String(initialTransaction.amount_original || initialTransaction.amount),
      categoryId: initialTransaction.category_id || '',
      date: new Date(initialTransaction.date),
      note: cleanNote,
      currency: initialTransaction.currency_original || currency,
    });
    setPayer(initPayer);
    setPayee(initPayee);
    setSplitWith(initSplitWith);
```

### 6c — Update submit to encode note meta

- [ ] **Step 7: Replace `note: data.note.trim() || null` in the payload with note meta encoding**

Find in `handleSubmit`:
```tsx
      note: data.note.trim() || null,
```

Replace with:
```tsx
      note: (() => {
        const metaParts: string[] = [];
        if (type === 'expense' && payer.trim()) metaParts.push(`[payer:${payer.trim()}]`);
        if (type === 'income' && payee.trim()) metaParts.push(`[payee:${payee.trim()}]`);
        if (isSplit && splitWith.trim()) metaParts.push(`[split_with:${splitWith.trim()}]`);
        const metaStr = metaParts.join(' ');
        return [metaStr, data.note.trim()].filter(Boolean).join(' ') || null;
      })(),
```

### 6d — Update JSX: replace 4-button grid with tabs

- [ ] **Step 8: Add `Tabs` import**

Find:
```tsx
import { Loader2, ChevronDown, Calendar, ArrowUpRight, ArrowDownLeft, Handshake, Landmark, Plus, X, Split, Bell, CalendarIcon } from 'lucide-react';
```

Replace with:
```tsx
import { Loader2, ChevronDown, Calendar, ArrowUpRight, ArrowDownLeft, Handshake, Landmark, Plus, X, Split, Bell, CalendarIcon, Mic, Camera } from 'lucide-react';
```

Add `Tabs` import after the other component imports:
```tsx
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
```

- [ ] **Step 9: Replace the 4-button grid in the JSX with tabs**

Find (in the return/JSX section):
```tsx
      <div className="grid grid-cols-4 gap-2 mb-6">
        {[
          { id: 'expense', name: 'Expense', icon: ArrowUpRight, color: 'text-rose-500', bg: 'bg-rose-500/10' },
          { id: 'income', name: 'Income', icon: ArrowDownLeft, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { id: 'lend', name: 'Lend', icon: Handshake, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
          { id: 'owe', name: 'Borrow', icon: Landmark, color: 'text-amber-500', bg: 'bg-amber-500/10' },
        ].map((opt: { id: 'expense' | 'income' | 'lend' | 'owe'; name: string; icon: typeof ArrowUpRight; color: string; bg: string }) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => {
              setType(opt.id);
              // Reset split when switching away from expense
              if (opt.id !== 'expense' && isSplit) {
                setIsSplit(false);
                setSplitRows([]);
              }
            }}
            className={cn(
              'flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all card-3d',
              type === opt.id ? 'border-accent bg-accent/5 ring-1 ring-accent/20 border-glow' : 'border-border bg-card hover:bg-muted'
            )}
          >
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', opt.bg)}>
              <opt.icon className={cn('w-5 h-5', opt.color, 'icon-glow')} />
            </div>
            <span className={cn('text-[10px] font-bold uppercase tracking-wider', type === opt.id && 'text-glow')}>
              {opt.name}
            </span>
          </button>
        ))}
      </div>
```

Replace with:
```tsx
      {/* ─── Type selector: Tabs in create mode; legacy 4-button grid for lend/owe edit ─── */}
      {isEditMode && (type === 'lend' || type === 'owe') ? (
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { id: 'expense', name: 'Expense', icon: ArrowUpRight, color: 'text-rose-500', bg: 'bg-rose-500/10' },
            { id: 'income', name: 'Income', icon: ArrowDownLeft, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
            { id: 'lend', name: 'Lend', icon: Handshake, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
            { id: 'owe', name: 'Borrow', icon: Landmark, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setType(opt.id as typeof type)}
              className={cn(
                'flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all card-3d',
                type === opt.id ? 'border-accent bg-accent/5 ring-1 ring-accent/20 border-glow' : 'border-border bg-card hover:bg-muted'
              )}
            >
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', opt.bg)}>
                <opt.icon className={cn('w-5 h-5', opt.color, 'icon-glow')} />
              </div>
              <span className={cn('text-[10px] font-bold uppercase tracking-wider', type === opt.id && 'text-glow')}>
                {opt.name}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <Tabs
          value={type === 'income' ? 'income' : 'expense'}
          onValueChange={(v) => {
            const newType = v as 'expense' | 'income';
            setType(newType);
            if (isSplit && newType !== 'expense') {
              setIsSplit(false);
              setSplitRows([]);
            }
            setPayer('');
            setPayee('');
          }}
          className="mb-4"
        >
          <TabsList className="w-full h-12 rounded-2xl p-1">
            <TabsTrigger
              value="expense"
              className="flex-1 rounded-xl font-bold gap-2 data-[state=active]:text-rose-500"
            >
              <ArrowUpRight className="w-4 h-4" />
              Expense
            </TabsTrigger>
            <TabsTrigger
              value="income"
              className="flex-1 rounded-xl font-bold gap-2 data-[state=active]:text-emerald-500"
            >
              <ArrowDownLeft className="w-4 h-4" />
              Income
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* ─── PAYER / PAYEE contextual field ─── */}
      {type === 'expense' && (
        <div className="space-y-1.5 mb-2">
          <label className="text-xs font-bold uppercase tracking-wider opacity-70">Payer (Optional)</label>
          <input
            type="text"
            placeholder="Who paid? e.g. John"
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={payer}
            onChange={(e) => setPayer(e.target.value)}
          />
        </div>
      )}
      {type === 'income' && (
        <div className="space-y-1.5 mb-2">
          <label className="text-xs font-bold uppercase tracking-wider opacity-70">Payee (Optional)</label>
          <input
            type="text"
            placeholder="Paid by whom? e.g. Client"
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={payee}
            onChange={(e) => setPayee(e.target.value)}
          />
        </div>
      )}

      {/* ─── Voice / Scan quick-fill row ─── */}
      {(onVoiceRequest || onScanRequest) && (
        <div className="flex gap-2 mb-2">
          {onVoiceRequest && (
            <button
              type="button"
              onClick={onVoiceRequest}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-border bg-muted/50 hover:bg-muted transition-colors"
            >
              <Mic className="w-4 h-4 text-accent" />
              <span className="text-sm font-semibold">Voice Fill</span>
            </button>
          )}
          {onScanRequest && (
            <button
              type="button"
              onClick={onScanRequest}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-border bg-muted/50 hover:bg-muted transition-colors"
            >
              <Camera className="w-4 h-4 text-accent" />
              <span className="text-sm font-semibold">Scan Receipt</span>
            </button>
          )}
        </div>
      )}
```

### 6e — Add Split With field

- [ ] **Step 10: Add Split With input after the isSplit toggle**

Find:
```tsx
          {/* ─── Feature 1.1: Two-level category picker (hidden when split) ─── */}
```

Insert before it:
```tsx
          {/* ─── Split With field ─── */}
          {isSplit && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider opacity-70">Split With (Optional)</label>
              <input
                type="text"
                placeholder="Who are you splitting with? e.g. Alice"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={splitWith}
                onChange={(e) => setSplitWith(e.target.value)}
              />
            </div>
          )}
```

- [ ] **Step 11: Build and verify no TypeScript errors**

```bash
cd "/Users/sayem/Business MVPs/hisabify" && npm run build 2>&1 | head -50
```

Expected: Clean build.

- [ ] **Step 12: Commit**

```bash
cd "/Users/sayem/Business MVPs/hisabify" && git add src/components/TransactionForm.tsx src/components/AddTransactionModal.tsx && git commit -m "feat: tabs type selector, PAYER/PAYEE fields, Voice/Scan row, Split With field"
```

---

## Task 7: Update TransactionItem — parse note meta, tap to open details

**Files:**
- Modify: `src/components/TransactionItem.tsx`

- [ ] **Step 1: Add `onViewDetails` to props interface**

Find:
```tsx
interface TransactionItemProps {
  transaction: Transaction & { convertedAmount?: number };
  index?: number;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
  onAddReminder?: (transaction: Transaction) => void;
  revealedId?: string | null;
  onReveal?: (id: string | null) => void;
  categoriesMap?: Map<string, Category>;
}
```

Replace with:
```tsx
interface TransactionItemProps {
  transaction: Transaction & { convertedAmount?: number };
  index?: number;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
  onAddReminder?: (transaction: Transaction) => void;
  onViewDetails?: (transaction: Transaction) => void;
  revealedId?: string | null;
  onReveal?: (id: string | null) => void;
  categoriesMap?: Map<string, Category>;
}
```

- [ ] **Step 2: Destructure `onViewDetails` in the function signature**

Find:
```tsx
export function TransactionItem({ transaction, index = 0, onEdit, onDelete, onAddReminder, revealedId, onReveal, categoriesMap }: TransactionItemProps) {
```

Replace with:
```tsx
export function TransactionItem({ transaction, index = 0, onEdit, onDelete, onAddReminder, onViewDetails, revealedId, onReveal, categoriesMap }: TransactionItemProps) {
```

- [ ] **Step 3: Add note meta parsing after the existing variable declarations**

Find:
```tsx
  const tags = transaction.tags ?? [];
```

Insert before it:
```tsx
  // Parse payer/payee/splitWith from note
  const noteMeta = (() => {
    const n = transaction.note || '';
    const payerMatch = n.match(/\[payer:([^\]]+)\]/);
    const payeeMatch = n.match(/\[payee:([^\]]+)\]/);
    const splitMatch = n.match(/\[split_with:([^\]]+)\]/);
    return {
      payer: payerMatch?.[1] ?? null,
      payee: payeeMatch?.[1] ?? null,
      splitWith: splitMatch?.[1] ?? null,
    };
  })();

```

- [ ] **Step 4: Display payer/payee/splitWith chips in the card body**

Find the tags display block:
```tsx
          {visibleTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {visibleTags.map((tag) => (
```

Replace with:
```tsx
          {(visibleTags.length > 0 || noteMeta.payer || noteMeta.payee || noteMeta.splitWith) && (
            <div className="flex flex-wrap gap-1 mt-1">
              {noteMeta.payer && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-medium">
                  Payer: {noteMeta.payer}
                </span>
              )}
              {noteMeta.payee && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-medium">
                  Payee: {noteMeta.payee}
                </span>
              )}
              {noteMeta.splitWith && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-500 font-medium">
                  Split: {noteMeta.splitWith}
                </span>
              )}
              {visibleTags.map((tag) => (
```

Close the replaced block by ensuring the existing closing tags remain (`</div>` after the overflow count chip and `)}` after it).

- [ ] **Step 5: Update the main card's onClick to open details on tap**

Find:
```tsx
        onClick={() => actualRevealed && (onReveal ? onReveal(null) : setInternalRevealed(false))}
```

Replace with:
```tsx
        onClick={() => {
          if (actualRevealed) {
            if (onReveal) onReveal(null);
            else setInternalRevealed(false);
          } else {
            onViewDetails?.(transaction);
          }
        }}
```

- [ ] **Step 6: Build and verify**

```bash
cd "/Users/sayem/Business MVPs/hisabify" && npm run build 2>&1 | head -50
```

- [ ] **Step 7: Commit**

```bash
cd "/Users/sayem/Business MVPs/hisabify" && git add src/components/TransactionItem.tsx && git commit -m "feat: TransactionItem parses note meta chips and supports onViewDetails tap"
```

---

## Task 8: Create TransactionDetailsDialog

**Files:**
- Create: `src/components/TransactionDetailsDialog.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { format } from 'date-fns';
import { X, PencilSimple, Trash, Receipt } from '@phosphor-icons/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Transaction } from '@/types';
import { useCurrency, currencyData } from '@/hooks/useCurrency';
import { getTransactionCategoryName } from '@/lib/transactionUtils';
import { cn } from '@/lib/utils';

interface TransactionDetailsDialogProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}

/** Strip all [meta:X] prefixes from a note string for clean display */
function getCleanNote(note: string | null): string {
  return (note || '')
    .replace(/\[payer:[^\]]*\]\s*/g, '')
    .replace(/\[payee:[^\]]*\]\s*/g, '')
    .replace(/\[split_with:[^\]]*\]\s*/g, '')
    .replace(/^\[(credit_card|utility|lend|owe|custom)\]\s*/i, '')
    .trim();
}

function parseNoteMetaForDisplay(note: string | null) {
  const n = note || '';
  return {
    payer: n.match(/\[payer:([^\]]+)\]/)?.[1] ?? null,
    payee: n.match(/\[payee:([^\]]+)\]/)?.[1] ?? null,
    splitWith: n.match(/\[split_with:([^\]]+)\]/)?.[1] ?? null,
  };
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  expense: { label: 'Expense', color: 'bg-rose-500/10 text-rose-500' },
  income:  { label: 'Income',  color: 'bg-emerald-500/10 text-emerald-500' },
  lend:    { label: 'Lend',    color: 'bg-indigo-500/10 text-indigo-500' },
  owe:     { label: 'Borrow',  color: 'bg-amber-500/10 text-amber-500' },
};

export function TransactionDetailsDialog({
  transaction,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: TransactionDetailsDialogProps) {
  const { formatAmount, currency } = useCurrency();

  if (!transaction) return null;

  const isIncome = transaction.type === 'income';
  const typeInfo = TYPE_LABELS[transaction.type] ?? TYPE_LABELS.expense;
  const dateObj = new Date(transaction.date);
  const formattedDate = !isNaN(dateObj.getTime()) ? format(dateObj, 'MMMM d, yyyy') : '—';

  const originalCurrency = transaction.currency_original || transaction.currency_base || 'USD';
  const originalAmount = transaction.amount_original || transaction.amount;
  const originalSymbol = currencyData[originalCurrency]?.symbol || originalCurrency;
  const showOriginal = originalCurrency !== currency;

  const displayAmount = typeof transaction.convertedAmount === 'number'
    ? transaction.convertedAmount
    : transaction.amount;

  const categoryName = getTransactionCategoryName(transaction);
  const noteMeta = parseNoteMetaForDisplay(transaction.note);
  const cleanNote = getCleanNote(transaction.note);
  const tags = transaction.tags ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl p-0 gap-0 overflow-hidden">
        {/* Colored header band */}
        <div className={cn('px-6 pt-6 pb-4', isIncome ? 'bg-emerald-500/5' : 'bg-rose-500/5')}>
          <DialogHeader className="space-y-0">
            <div className="flex items-start justify-between">
              <div>
                <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full', typeInfo.color)}>
                  {typeInfo.label}
                </span>
                <DialogTitle className="mt-2 text-2xl font-black tracking-tight">
                  {transaction.merchant}
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">{formattedDate}</p>
              </div>
              <div className="text-right">
                <p className={cn('text-2xl font-black tracking-tighter', isIncome ? 'text-emerald-500' : 'text-rose-500')}>
                  {isIncome ? '+' : '-'}{formatAmount(Math.abs(displayAmount))}
                </p>
                {showOriginal && (
                  <p className="text-xs text-muted-foreground">
                    ≈ {originalSymbol}{Math.abs(originalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                )}
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Details body */}
        <div className="px-6 py-4 space-y-3">

          {/* Category */}
          {categoryName && (
            <Row label="Category" value={categoryName} />
          )}

          {/* Payer / Payee */}
          {noteMeta.payer && <Row label="Payer" value={noteMeta.payer} />}
          {noteMeta.payee && <Row label="Payee" value={noteMeta.payee} />}

          {/* Split With */}
          {noteMeta.splitWith && <Row label="Split with" value={noteMeta.splitWith} />}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-24 shrink-0">Tags</span>
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Status */}
          {transaction.status === 'uncleared' && (
            <Row label="Status" value="Uncleared" valueClassName="text-amber-500 font-bold" />
          )}

          {/* Note */}
          {cleanNote && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Note</p>
              <p className="text-sm bg-muted/50 rounded-xl px-3 py-2">{cleanNote}</p>
            </div>
          )}

          {/* Receipt image */}
          {transaction.receipt_url && (
            <div>
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Receipt className="w-3 h-3" /> Receipt
              </p>
              <img
                src={transaction.receipt_url}
                alt="Receipt"
                className="w-full rounded-xl object-cover max-h-40 border border-border"
              />
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="px-6 pb-6 flex gap-3">
          <Button
            variant="outline"
            className="flex-1 rounded-xl gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={() => {
              onOpenChange(false);
              onDelete(transaction);
            }}
          >
            <Trash className="w-4 h-4" weight="bold" />
            Delete
          </Button>
          <Button
            className="flex-1 rounded-xl gap-2"
            onClick={() => {
              onOpenChange(false);
              onEdit(transaction);
            }}
          >
            <PencilSimple className="w-4 h-4" weight="bold" />
            Edit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
      <span className={cn('text-sm font-medium', valueClassName)}>{value}</span>
    </div>
  );
}
```

- [ ] **Step 2: Build and verify**

```bash
cd "/Users/sayem/Business MVPs/hisabify" && npm run build 2>&1 | head -50
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/sayem/Business MVPs/hisabify" && git add src/components/TransactionDetailsDialog.tsx && git commit -m "feat: add TransactionDetailsDialog with edit/delete actions"
```

---

## Task 9: Wire TransactionDetailsDialog in ExpensesPage

**Files:**
- Modify: `src/pages/ExpensesPage.tsx`

- [ ] **Step 1: Add `viewingTransaction` state**

Find:
```tsx
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
```

Replace with:
```tsx
  const [viewingTransaction, setViewingTransaction] = useState<Transaction | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
```

- [ ] **Step 2: Add the import for TransactionDetailsDialog**

Find:
```tsx
import { EditTransactionModal } from '@/components/EditTransactionModal';
```

Replace with:
```tsx
import { EditTransactionModal } from '@/components/EditTransactionModal';
import { TransactionDetailsDialog } from '@/components/TransactionDetailsDialog';
```

- [ ] **Step 3: Pass `onViewDetails` to every `TransactionItem`**

Find:
```tsx
                      <TransactionItem
                        key={tx.id}
                        transaction={tx}
                        onEdit={setEditingTransaction}
                        onDelete={setDeletingTransaction}
```

Replace with:
```tsx
                      <TransactionItem
                        key={tx.id}
                        transaction={tx}
                        onViewDetails={setViewingTransaction}
                        onEdit={setEditingTransaction}
                        onDelete={setDeletingTransaction}
```

- [ ] **Step 4: Mount `TransactionDetailsDialog` near the other modals**

Find:
```tsx
      <EditTransactionModal
        open={!!editingTransaction}
        onOpenChange={(open) => !open && setEditingTransaction(null)}
        transaction={editingTransaction}
        onSuccess={handleTransactionMutationSuccess}
      />
```

Insert before it:
```tsx
      <TransactionDetailsDialog
        open={!!viewingTransaction}
        onOpenChange={(open) => !open && setViewingTransaction(null)}
        transaction={viewingTransaction}
        onEdit={(tx) => { setViewingTransaction(null); setEditingTransaction(tx); }}
        onDelete={(tx) => { setViewingTransaction(null); setDeletingTransaction(tx); }}
      />
```

- [ ] **Step 5: Build and verify clean**

```bash
cd "/Users/sayem/Business MVPs/hisabify" && npm run build 2>&1 | head -50
```

- [ ] **Step 6: Run lint**

```bash
cd "/Users/sayem/Business MVPs/hisabify" && npm run lint 2>&1 | head -50
```

- [ ] **Step 7: Commit**

```bash
cd "/Users/sayem/Business MVPs/hisabify" && git add src/pages/ExpensesPage.tsx && git commit -m "feat: wire TransactionDetailsDialog into ExpensesPage on tap"
```

---

## Final Verification Checklist

- [ ] `npm run build` passes with zero errors
- [ ] `npm run lint` passes with zero errors
- [ ] `npm test` passes (or no regressions vs baseline)
- [ ] FAB opens AddTransactionModal directly (no intermediate sheet)
- [ ] Expense tab shows PAYER field; Income tab shows PAYEE field
- [ ] Voice Fill and Scan Receipt buttons visible in the form
- [ ] Voice dialog opens as ResponsiveDrawer; close X works; autofill works
- [ ] Scan Receipt dialog opens as ResponsiveDrawer; close X works; autofill works
- [ ] Split toggle shows "Split with" input when on
- [ ] `[payer:X]` / `[payee:X]` / `[split_with:X]` encode into note on save
- [ ] Edit mode parses those prefixes back into the PAYER/PAYEE/Split With fields
- [ ] Tapping a transaction in ExpensesPage opens TransactionDetailsDialog
- [ ] Details dialog Edit → opens EditTransactionModal with correct transaction
- [ ] Details dialog Delete → opens DeleteTransactionDialog with correct transaction
- [ ] Existing lend/owe transactions edit without regression (4-button grid shown in edit mode)
- [ ] `InputMethodSheet.tsx` deleted; no remaining import references
