# Implementation Plan: Payment Reminders P0-P1 Fixes

**Date:** 2026-03-10
**Branch:** `fix/payment-reminders-p0-p1`
**Estimated Time:** 4-6 hours
**Status:** Awaiting Approval

---

## Overview

This plan addresses critical and high-priority issues in the Payment Reminders & Bills feature:

- **P0-1:** Recurring reminder logic (auto-advance due date when marked paid)
- **P0-2:** Database support for recurring reminders
- **P1-1:** Auto-update overdue status for reminders
- **P1-2:** Wire up Edit functionality in ManageRemindersModal

---

## Technical Approach

### P0-1 & P0-2: Recurring Reminder Logic

**Decision Point - Two Approaches:**

#### **Approach A: Update Due Date In-Place (RECOMMENDED)**
- When a recurring reminder is marked as "paid", calculate next due date and update the same row
- Simpler implementation, single source of truth
- Status changes: `paid` → `upcoming` with new due date
- Better for most use cases (utility bills, subscriptions)

**Pros:**
- Simple database queries
- No duplicate reminders
- Clear user intent (one recurring reminder = one row)

**Cons:**
- No history of past payments
- Can't see when reminder was last paid

#### **Approach B: Create New Reminder Instance**
- When marked paid, create new reminder row for next occurrence
- Original reminder stays with status="paid"
- Better audit trail

**Pros:**
- Complete payment history
- Can track payment patterns

**Cons:**
- More complex queries
- Database bloat over time
- Need cleanup strategy for old reminders

**RECOMMENDATION: Approach A** (Update in-place) for MVP, can migrate to Approach B later if audit trail is needed.

---

## Implementation Details

### 1. P0-1: Client-Side Recurring Logic

**File:** `src/lib/recurringReminders.ts` (NEW)

**Function:** `calculateNextDueDate(currentDueDate: string, interval: string): string`

```typescript
/**
 * Calculate next due date for recurring reminder
 * Uses reminderDate utilities to avoid timezone issues
 */
export function calculateNextDueDate(
  currentDueDate: string,
  interval: 'weekly' | 'monthly' | 'yearly'
): string {
  const currentDate = toReminderDisplayDate(currentDueDate);

  let nextDate: Date;
  switch (interval) {
    case 'weekly':
      nextDate = addWeeks(currentDate, 1);
      break;
    case 'monthly':
      nextDate = addMonths(currentDate, 1);
      break;
    case 'yearly':
      nextDate = addYears(currentDate, 1);
      break;
  }

  // Convert back to YYYY-MM-DD format for storage
  const year = nextDate.getFullYear();
  const month = String(nextDate.getMonth() + 1).padStart(2, '0');
  const day = String(nextDate.getDate()).padStart(2, '0');

  return toReminderDueDateIso(`${year}-${month}-${day}`);
}
```

**Dependencies:**
- `date-fns`: `addWeeks`, `addMonths`, `addYears` (already imported in project)
- `src/lib/reminderDate.ts`: `toReminderDisplayDate`, `toReminderDueDateIso`

---

### 2. P0-2: Update Mark-as-Paid Logic

**Files to Modify:**
1. `src/components/ManageRemindersModal.tsx:44-59`
2. `src/pages/NotificationsPage.tsx:62-75`
3. `src/components/Header.tsx` (if mark-paid exists)
4. `src/components/PaymentRemindersManager.tsx:59-66`

**New Unified Function:** `src/hooks/usePaymentReminders.ts`

Add method to hook:

```typescript
const markAsPaid = async (reminder: PaymentReminder) => {
  let updateData: Partial<PaymentReminder>;

  if (reminder.is_recurring && reminder.recurring_interval) {
    // Recurring: Calculate next due date and reset to "upcoming"
    const nextDueDate = calculateNextDueDate(
      reminder.due_date,
      reminder.recurring_interval
    );

    updateData = {
      status: 'upcoming',
      due_date: nextDueDate
    };

    toast({
      title: 'Marked as paid',
      description: `Next due: ${format(toReminderDisplayDate(nextDueDate), 'MMM dd, yyyy')}`
    });
  } else {
    // One-time: Just mark as paid
    updateData = {
      status: 'paid'
    };

    toast({ title: 'Marked as paid' });
  }

  // Optimistic update
  setReminders(current =>
    current.map(r => r.id === reminder.id ? { ...r, ...updateData } : r)
  );

  // Persist to database
  const { error } = await supabase
    .from('payment_reminders')
    .update(updateData)
    .eq('id', reminder.id);

  if (error) {
    toast({ title: 'Error updating reminder', variant: 'destructive' });
    // Revert optimistic update
    await fetchReminders();
    return false;
  }

  return true;
};

return { reminders, loading, error, refetch: fetchReminders, markAsPaid };
```

**Changes in Components:**
- Replace all `handleMarkAsPaid` implementations with `markAsPaid` from hook
- Pass full `reminder` object instead of just `id`
- Remove duplicate logic

---

### 3. P1-1: Auto-Update Overdue Status

**Approach:** Client-side computation + database view (hybrid)

**Why Hybrid?**
- Database trigger on every query = performance overhead
- Scheduled job = requires Edge Function setup + cost
- Client-side = works immediately, no backend changes

**Implementation:**

#### **Step 1: Database View (Read-Only)**

**File:** `supabase/migrations/20260310120000_add_reminder_status_view.sql` (NEW)

```sql
-- Create view that auto-calculates status based on due_date
CREATE OR REPLACE VIEW payment_reminders_with_status AS
SELECT
  pr.*,
  CASE
    WHEN pr.status = 'paid' THEN 'paid'
    WHEN pr.due_date < CURRENT_DATE THEN 'missed'
    ELSE 'upcoming'
  END AS computed_status
FROM payment_reminders pr;

-- Grant access to authenticated users
GRANT SELECT ON payment_reminders_with_status TO authenticated;

-- Add RLS policy (inherits from base table)
ALTER VIEW payment_reminders_with_status SET (security_invoker = true);
```

**Note:** Views in Supabase don't support RLS directly, so we'll stick with client-side calculation for now.

#### **Step 2: Periodic Status Sync (Optional Background Job)**

**File:** `src/hooks/usePaymentReminders.ts`

Add effect to sync overdue reminders:

```typescript
// Run once on mount to sync overdue reminders
useEffect(() => {
  if (!user || reminders.length === 0) return;

  const syncOverdueReminders = async () => {
    const now = new Date();
    const overdueIds = reminders
      .filter(r => {
        const dueDate = toReminderDisplayDate(r.due_date);
        return r.status === 'upcoming' && isPast(dueDate) && !isToday(dueDate);
      })
      .map(r => r.id);

    if (overdueIds.length === 0) return;

    // Batch update to 'missed'
    await supabase
      .from('payment_reminders')
      .update({ status: 'missed' })
      .in('id', overdueIds);

    // Refresh to get updated data
    await fetchReminders();
  };

  void syncOverdueReminders();
}, [user, reminders.length]); // Only on mount or when count changes
```

**Alternatives Considered:**
- Database trigger: `CREATE TRIGGER check_overdue_reminders BEFORE SELECT...` - Not supported in Postgres for SELECT
- Scheduled Edge Function: Would require Supabase Pro plan + cron setup
- Client-side only: Current approach, no persistent state

**Decision:** Keep client-side calculation in UI, add periodic sync on app load to update database status field.

---

### 4. P1-2: Wire Up Edit Functionality

**File:** `src/components/ManageRemindersModal.tsx`

**Change 1: Add Edit Button**

Line 160-169 (inside reminder card):

```tsx
<div className="flex items-center justify-end gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
  {/* NEW: Edit Button */}
  <Button
    size="icon"
    variant="ghost"
    className="h-8 w-8 text-muted-foreground hover:text-blue-500"
    onClick={() => {
      setEditingReminder(reminder);
      setShowAddModal(true);
    }}
  >
    <Edit className="w-4 h-4" />
  </Button>

  {/* EXISTING: Delete Button */}
  <Button
    size="icon"
    variant="ghost"
    className="h-8 w-8 text-muted-foreground hover:text-rose-500"
    onClick={() => handleDelete(reminder.id)}
  >
    <Trash2 className="w-4 h-4" />
  </Button>
</div>
```

**Change 2: Add Import**

Line 3:

```tsx
import { X, Plus, Trash2, Calendar, Bell, CheckCircle2, Clock, AlertCircle, Edit } from 'lucide-react';
```

**Testing:**
- Click Edit → Modal opens with pre-filled data
- Modify fields → Save → Reminder updates
- Cancel → Modal closes without changes

---

## Files to Create

1. **`src/lib/recurringReminders.ts`** - Recurring logic utilities
2. **`supabase/migrations/20260310120000_add_reminder_status_view.sql`** - Optional view (can skip for MVP)

---

## Files to Modify

1. **`src/hooks/usePaymentReminders.ts`**
   - Add `markAsPaid` method with recurring logic
   - Add periodic overdue sync effect
   - Export new method in return statement

2. **`src/components/ManageRemindersModal.tsx`**
   - Import `Edit` icon from lucide-react
   - Add Edit button in reminder card (line ~160)
   - Wire up `setEditingReminder` on click

3. **`src/pages/NotificationsPage.tsx`**
   - Replace `handleMarkAsPaid` with `markAsPaid` from hook
   - Pass full reminder object instead of just ID

4. **`src/components/Header.tsx`**
   - Same as NotificationsPage (if mark-paid exists)

5. **`src/components/PaymentRemindersManager.tsx`**
   - Same as NotificationsPage

---

## Database Schema Changes

**None required for MVP!** Current schema already supports:
- `is_recurring` boolean
- `recurring_interval` enum
- `due_date` timestamp
- `status` enum

Optional migration for status view can be added later.

---

## Testing Strategy

### Unit Tests

**File:** `src/lib/__tests__/recurringReminders.test.ts` (NEW)

```typescript
describe('calculateNextDueDate', () => {
  it('should add 7 days for weekly interval', () => {
    const current = '2026-01-15T12:00:00.000Z';
    const next = calculateNextDueDate(current, 'weekly');
    expect(next).toBe('2026-01-22T12:00:00.000Z');
  });

  it('should add 1 month for monthly interval', () => {
    const current = '2026-01-31T12:00:00.000Z';
    const next = calculateNextDueDate(current, 'monthly');
    // date-fns handles month-end correctly
    expect(next).toBe('2026-02-28T12:00:00.000Z');
  });

  it('should add 1 year for yearly interval', () => {
    const current = '2026-02-29T12:00:00.000Z'; // leap year
    const next = calculateNextDueDate(current, 'yearly');
    expect(next).toBe('2027-02-28T12:00:00.000Z');
  });
});
```

### Manual Testing Checklist

**Recurring Reminders:**
- [ ] Create weekly reminder for "Gym Membership" ($50, due today)
- [ ] Mark as paid → Due date advances to next week
- [ ] Status changes from "paid" → "upcoming"
- [ ] Verify toast shows next due date
- [ ] Create monthly reminder for "Rent" ($1500, due today)
- [ ] Mark as paid → Due date advances to next month
- [ ] Create yearly reminder for "Insurance" ($1200, due today)
- [ ] Mark as paid → Due date advances to next year

**Non-Recurring Reminders:**
- [ ] Create one-time reminder for "Birthday Gift" ($100)
- [ ] Mark as paid → Status stays "paid"
- [ ] Due date does NOT change

**Overdue Status:**
- [ ] Create reminder with due date in the past
- [ ] Wait 5 seconds for sync to run
- [ ] Refresh page → Status should show "missed" in database
- [ ] UI should show "Overdue" label

**Edit Functionality:**
- [ ] Open Manage Reminders modal
- [ ] Hover over reminder card → Edit icon appears
- [ ] Click Edit → Modal opens with pre-filled data
- [ ] Change title, amount, due date
- [ ] Save → Reminder updates in list
- [ ] Cancel → No changes applied

**Edge Cases:**
- [ ] Mark recurring reminder as paid multiple times in a row → Due date keeps advancing
- [ ] Edit recurring reminder → Change interval from weekly to monthly → Works correctly
- [ ] Delete reminder while edit modal is open → Modal closes gracefully
- [ ] Mark reminder as paid with no internet → Optimistic update shows, then reverts with error

---

## Rollback Plan

If issues arise:

1. **Recurring Logic Breaks:**
   - Revert `usePaymentReminders.ts` changes
   - Fall back to old behavior (mark as paid, no date change)

2. **Edit Button Causes Crashes:**
   - Remove Edit button from `ManageRemindersModal.tsx`
   - Keep delete-only functionality

3. **Overdue Sync Causes Performance Issues:**
   - Remove sync effect from `usePaymentReminders.ts`
   - Keep client-side status calculation only

---

## Performance Considerations

- **Batch Updates:** Overdue sync uses `.in()` to update multiple reminders in one query
- **Debouncing:** Sync runs once on mount, not on every reminder change
- **Optimistic Updates:** UI responds immediately, database updates in background

---

## Security Review

- ✅ All updates use `eq('id', id)` or `in('id', ids)` - no mass updates
- ✅ RLS policies already enforce user_id matching
- ✅ No new API endpoints or Edge Functions required
- ✅ No sensitive data exposed in client-side calculations

---

## Accessibility

- Edit button has proper icon and hover state
- Toast notifications announce status changes
- No keyboard navigation changes required

---

## Documentation Updates

**Files to Update:**

1. **`CLAUDE.md`**
   - Add note about recurring reminder behavior
   - Document `markAsPaid` method in hooks section

2. **`PRD.md`** (if needed)
   - Update line 11: "Reminder 'Mark Paid' updates reminder status only" → "Recurring reminders auto-advance due date"

3. **`CHANGELOG.md`**
   - Add entry for recurring reminder logic
   - Add entry for edit functionality

---

## Open Questions

1. **Recurring Behavior:** Should users be able to "skip" a recurring reminder without marking it paid?
   - Current plan: No, must mark as paid to advance
   - Alternative: Add "Skip" button that advances date without changing status

2. **Edit Recurring Reminder:** Should editing a recurring reminder update all future occurrences or just the current one?
   - Current plan: Update current instance (since we're not creating new rows)
   - Alternative: Show dialog asking "Update this occurrence or all future?"

3. **Overdue Sync Frequency:** Should we sync overdue status more frequently?
   - Current plan: Once on app load
   - Alternative: Every 5 minutes using `setInterval`
   - Alternative: On visibility change (when user returns to app)

4. **Status Field Deprecation:** Should we remove the `status` field entirely and compute it on-the-fly?
   - Current plan: Keep status field, sync periodically
   - Alternative: Always compute from due_date (requires view or every query to have CASE statement)

---

## Success Criteria

- ✅ Recurring reminders advance due date when marked paid
- ✅ Non-recurring reminders stay marked as paid
- ✅ Overdue reminders show correct status in UI and database
- ✅ Edit button works for all reminders
- ✅ No regressions in existing functionality
- ✅ All tests pass
- ✅ No console errors or warnings

---

## Estimated Time Breakdown

- **P0-1 & P0-2 (Recurring Logic):** 2-3 hours
  - Create `recurringReminders.ts`: 30 min
  - Update `usePaymentReminders.ts`: 1 hour
  - Update all components: 1 hour
  - Write tests: 30 min

- **P1-1 (Overdue Status):** 1 hour
  - Add sync effect: 30 min
  - Test edge cases: 30 min

- **P1-2 (Edit Button):** 30 min
  - Add button + wire up: 15 min
  - Test: 15 min

- **Testing & QA:** 1 hour
- **Documentation:** 30 min

**Total:** 4.5 - 6 hours

---

## Dependencies

- No new npm packages required
- No backend/Edge Function setup required
- Existing `date-fns` functions used

---

## Approval Required

**Please review and approve one of the following:**

1. **Approve as-is** - Proceed with Approach A (update in-place) for recurring reminders
2. **Request Approach B** - Create new reminder instances instead of updating
3. **Request modifications** - Specify which parts to change

**To proceed, respond with:** "Approved" or "Go" or specific feedback.

---

**End of Implementation Plan**
