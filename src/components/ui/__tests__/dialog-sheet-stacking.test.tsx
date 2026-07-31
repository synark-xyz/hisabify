import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';

// Regression test for the bug where a Sheet opened from inside a Dialog
// (e.g. AssignmentSheet inside TransactionDetailsDialog) rendered behind the
// still-undimmed Dialog, because Sheet's z-index (50) was lower than
// DialogContent's (55). Sheet must render above any Dialog it can be nested in.

function extractZIndex(className: string): number {
  const match = className.match(/z-\[(\d+)\]|z-(\d+)/);
  if (!match) throw new Error(`no z-index utility class found in "${className}"`);
  return Number(match[1] ?? match[2]);
}

describe('Dialog + nested Sheet stacking', () => {
  it('Sheet renders above a Dialog it is nested inside', () => {
    render(
      <Dialog open>
        <DialogContent aria-describedby={undefined}>
          <p>Transaction details</p>
          <Sheet open>
            <SheetContent aria-describedby={undefined}>
              <p>Assignment sheet</p>
            </SheetContent>
          </Sheet>
        </DialogContent>
      </Dialog>,
    );

    // Both Dialog and Sheet content portal to document.body, not the RTL container.
    const allDialogs = document.body.querySelectorAll('[role="dialog"][data-state="open"]');

    expect(allDialogs.length).toBe(2);

    const [dialog, sheet] = Array.from(allDialogs);
    const dialogZ = extractZIndex(dialog.className);
    const sheetZ = extractZIndex(sheet.className);

    expect(sheetZ).toBeGreaterThan(dialogZ);
  });
});
