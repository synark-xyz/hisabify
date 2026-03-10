# Budget System Enhancement - Happy Path Testing Guide

This guide provides step-by-step instructions to manually test all budget features.

## Prerequisites

1. **Run Database Migration**:
   ```bash
   # Apply the system categories migration
   supabase db push
   # OR run via Supabase Dashboard SQL Editor:
   # Copy contents of: supabase/migrations/20260205000000_add_system_categories.sql
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   # Navigate to http://localhost:8080
   ```

3. **Login/Signup**: Create a test account or login to existing account

---

## Test Suite 1: UI Rebrand Verification

### Test 1.1: Bottom Navigation Label
**Expected**: Bottom navigation shows "Budget" (not "Planner")

**Steps**:
1. Look at bottom navigation bar
2. Find the 4th icon (Target icon)

**✓ Pass Criteria**: Label reads "Budget"

---

### Test 1.2: Page Title
**Expected**: Budget page shows correct title

**Steps**:
1. Click Budget tab in bottom navigation
2. Check page header

**✓ Pass Criteria**: Page title shows "Budget"

---

### Test 1.3: Hero Section
**Expected**: Hero card updated with new branding

**Steps**:
1. On Budget page, look at purple gradient card at top
2. Check subtitle text

**✓ Pass Criteria**: Shows "Budget Manager" (not "Budget Planner")

---

## Test Suite 2: System Categories

### Test 2.1: Credit Card Payment Category
**Expected**: Credit card transactions use system category

**Steps**:
1. Click FAB (+ button) → Manual Entry
2. Select "Expense" type
3. Enter Description: "Credit Card Bill"
4. Enter Amount: $500
5. Select Type → "Credit Card Bill"
6. Click "Save Record"
7. Go to Expenses page
8. Find the transaction and check category

**✓ Pass Criteria**: Transaction shows "Credit Card Payments" category (not null)

---

### Test 2.2: Utility Bill Category
**Expected**: Utility transactions use system category

**Steps**:
1. Create expense transaction
2. Description: "Electricity Bill"
3. Amount: $150
4. Type → "Utility Bill"
5. Save and verify

**✓ Pass Criteria**: Transaction has "Utility Bills" category

---

### Test 2.3: Lend Money Category
**Expected**: Lend transactions use system category

**Steps**:
1. Create expense transaction
2. Description: "Lent to John"
3. Amount: $200
4. Type → "Lend Money"
5. Save and verify

**✓ Pass Criteria**: Transaction has "Lent Money" category

---

## Test Suite 3: Budget Awareness

### Test 3.1: Budget Suggestions
**Expected**: Shows budget quick-picks when no category selected

**Setup**:
- Create 2-3 active budgets (Food, Transport, Entertainment)
- Ensure budgets have remaining capacity

**Steps**:
1. Click FAB → Manual Entry
2. Select "Expense"
3. Enter Description: "Test expense"
4. Enter Amount: $50
5. **Do not select category or type**
6. Look between Amount field and Category selector

**✓ Pass Criteria**:
- See "Quick pick from active budgets:" text
- See 1-3 budget cards showing:
  - Budget name
  - Remaining amount
  - Icon/color
- Cards are clickable

---

### Test 3.2: Budget Status Card - Safe
**Expected**: Green status card for safe spending

**Setup**:
- Create Food budget: $500 for current month
- Current spending: ~$200 (40%)

**Steps**:
1. Create new expense
2. Amount: $50
3. Select Category → Food
4. Watch for status card to appear

**✓ Pass Criteria**:
- Green status card appears
- Shows checkmark icon
- Shows budget name ("Food" or "Food Budget")
- Shows remaining amount: "$250.00 remaining"
- Progress bar is green
- Progress bar shows ~50% filled

---

### Test 3.3: Budget Status Card - Warning
**Expected**: Yellow status card approaching limit

**Setup**:
- Food budget: $500
- Current spending: $350 (70%)

**Steps**:
1. Create new expense
2. Amount: $50
3. Select Category → Food
4. Observe status card

**✓ Pass Criteria**:
- Yellow/amber status card
- Warning triangle icon
- Shows "$100.00 remaining"
- Progress bar is yellow
- Progress bar shows ~80%

---

### Test 3.4: Budget Status Card - Exceeded
**Expected**: Red status card when over budget

**Setup**:
- Food budget: $500
- Current spending: $450 (90%)

**Steps**:
1. Create new expense
2. Amount: $100
3. Select Category → Food
4. Observe status card

**✓ Pass Criteria**:
- Red status card
- Alert circle icon
- Shows "This will exceed your Food budget by $50.00"
- Progress bar is red
- Progress bar shows 100%

---

### Test 3.5: Real-time Updates
**Expected**: Status updates as user types

**Steps**:
1. Create expense with Food category selected
2. Amount: $50 → observe status
3. Change to $100 → observe status change
4. Change to $200 → observe status change

**✓ Pass Criteria**: Status card updates immediately without clicking anything

---

## Test Suite 4: Budget Exceed Dialog

### Test 4.1: Dialog Triggers on Exceed
**Expected**: Confirmation dialog blocks submission

**Setup**:
- Food budget: $500
- Current spending: $450
- Remaining: $50

**Steps**:
1. Create expense: Amount $100, Category Food
2. Click "Save Record"
3. **Do not click anything yet**

**✓ Pass Criteria**:
- Transaction NOT created yet
- Dialog appears with:
  - Title: "Budget Limit Exceeded"
  - Warning icon (red triangle)
  - Expense amount: $100.00
  - Budget remaining: $50.00
  - Over budget by: $50.00
  - Buttons: "Cancel" and "Add Anyway"

---

### Test 4.2: Dialog Cancel
**Expected**: Cancelling prevents transaction

**Steps**:
1. Trigger dialog (Test 4.1)
2. Click "Cancel" button
3. Check Expenses page

**✓ Pass Criteria**:
- Dialog closes
- Transaction **not** created
- Still on transaction form (can edit)

---

### Test 4.3: Dialog Confirm ("Add Anyway")
**Expected**: Confirming creates transaction despite exceeding

**Steps**:
1. Trigger dialog (Test 4.1)
2. Click "Add Anyway" button
3. Check Expenses page
4. Check Budget page

**✓ Pass Criteria**:
- Dialog closes
- Transaction IS created
- Budget shows as exceeded (red)
- Budget shows negative remaining

---

### Test 4.4: No Dialog When Within Budget
**Expected**: No dialog for safe transactions

**Setup**:
- Food budget: $500, spent: $200, remaining: $300

**Steps**:
1. Create expense: Amount $50, Category Food
2. Click "Save Record"

**✓ Pass Criteria**:
- NO dialog appears
- Transaction created immediately
- Success toast shown

---

## Test Suite 5: Budget Calculation with System Categories

### Test 5.1: Utility Transactions Count in Budget
**Expected**: Utility bills count toward expense budgets

**Setup**:
- Create "Bills" budget: $300 for current month

**Steps**:
1. Create expense: Amount $100, Type → "Utility Bill"
2. Go to Budget page
3. Check Bills budget spending

**✓ Pass Criteria**:
- Budget shows $100 spent
- Remaining: $200
- Progress bar shows ~33%

---

### Test 5.2: Lend/Owe Excluded from Budgets
**Expected**: Lend and borrowed money don't count as expenses

**Setup**:
- Create "General" budget: $1000 for all categories

**Steps**:
1. Create transaction: Amount $500, Type → "Lend Money"
2. Create transaction: Amount $300, Type → "Owe / Debt"
3. Go to Budget page
4. Check General budget

**✓ Pass Criteria**:
- Budget shows $0 spent (lend/owe excluded)
- **OR** if other expenses exist, they're counted but lend/owe are not

---

### Test 5.3: Regular Expenses Still Work
**Expected**: Normal categorized expenses work as before

**Setup**:
- Food budget: $500

**Steps**:
1. Create expense: Amount $100, Category → Food (no "Type" selected)
2. Check budget

**✓ Pass Criteria**:
- Budget shows $100 spent
- Works exactly as before enhancement

---

## Test Suite 6: Budget Delete Fix

### Test 6.1: Delete Budget Dialog Appears
**Expected**: Confirmation dialog shows when deleting

**Steps**:
1. Go to Budget page
2. Find any budget card
3. Click ⋮ (three dots menu)
4. Click "Delete"

**✓ Pass Criteria**:
- Confirmation dialog appears
- Shows budget name
- Shows warning message
- Has "Cancel" and "Delete" buttons
- UI is NOT stuck/frozen

---

### Test 6.2: Successful Budget Deletion
**Expected**: Budget deleted after confirmation

**Steps**:
1. Trigger delete dialog (Test 6.1)
2. Click "Delete" button
3. Wait for completion

**✓ Pass Criteria**:
- Dialog closes
- Budget removed from list
- Toast notification: "Budget deleted successfully"
- Page remains responsive

---

## Test Suite 7: Edge Cases

### Test 7.1: Multiple Budgets Same Category
**Expected**: Picks first active budget for status

**Setup**:
- Create 2 Food budgets (different periods)

**Steps**:
1. Create expense with Food category
2. Observe which budget's status is shown

**✓ Pass Criteria**: Shows one budget's status (no crash)

---

### Test 7.2: No Active Budgets
**Expected**: No suggestions or status when no budgets

**Setup**:
- Delete all budgets

**Steps**:
1. Try to create expense
2. Select category
3. Enter amount

**✓ Pass Criteria**:
- No budget suggestions
- No status card
- Transaction creates normally

---

### Test 7.3: Budget Exactly at Limit
**Expected**: Handles exact limit gracefully

**Setup**:
- Food budget: $500, spent: $400

**Steps**:
1. Create expense: $100, Category Food
2. Check status before submission

**✓ Pass Criteria**:
- Status shows $0 remaining
- Shows 100% used
- May show warning or exceeded (not safe)
- Submits successfully

---

## Test Suite 8: Multi-Currency

### Test 8.1: Budget Status with Different Currencies
**Expected**: Currency conversion works in budget calculations

**Setup** (Premium feature):
- User base currency: USD
- Create Food budget: $500 USD

**Steps**:
1. Create expense
2. Amount: 100 EUR
3. Category: Food
4. Check status card

**✓ Pass Criteria**:
- Status shows in USD (e.g., "$110.00 remaining")
- Conversion applied automatically
- Budget calculation correct

---

## Test Suite 9: Real-time Updates

### Test 9.1: Budget Updates on Transaction Change
**Expected**: Budgets update when transactions added

**Setup**:
- Open Budget page in one tab
- Food budget visible

**Steps**:
1. Keep Budget page open
2. Open new tab, go to Expenses
3. Add new Food transaction ($50)
4. Switch back to Budget tab

**✓ Pass Criteria**:
- Budget automatically updates within 1-2 seconds
- Spent increases by $50
- Remaining decreases
- No page refresh needed

---

## Automated Test Execution

Run automated tests with:

```bash
# Run all tests
npm test

# Run specific test files
npm test useBudgetContext
npm test BudgetFlow.integration

# Run in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage
```

**Expected Results**:
- ✓ All tests pass
- ✓ No errors in console
- ✓ Coverage > 80% for budget-related files

---

## Performance Checks

### Check 1: No Duplicate Fetch Calls
**Steps**:
1. Open DevTools → Network tab
2. Go to Budget page
3. Count Supabase requests

**✓ Pass Criteria**: Should see reasonable number of requests (not 10+ identical ones)

---

### Check 2: Debouncing Works
**Steps**:
1. Create expense with budget category
2. Type amount quickly: 1, 10, 100, 1000
3. Watch network requests

**✓ Pass Criteria**: Status updates happen, but API calls are debounced

---

## Regression Tests

Test that existing features still work:

1. ✓ Budget creation still works
2. ✓ Budget editing still works
3. ✓ Budget copying to next period works
4. ✓ Budget templates work
5. ✓ Transaction creation (all types) works
6. ✓ Expense categorization works
7. ✓ Dashboard summaries accurate
8. ✓ Analytics charts work

---

## Known Limitations (Expected Behavior)

1. **Budget suggestions** only show budgets with remaining > 0
2. **Lend/Owe** transactions don't show budget awareness (by design)
3. **Income** transactions don't have budget features
4. **System categories** can't be edited or deleted
5. **Budget exceed dialog** only triggers on initial submission (not on edit)

---

## Troubleshooting

**Issue**: System categories not appearing
**Solution**: Run database migration: `supabase db push`

**Issue**: Budget status not showing
**Solution**: Ensure budget exists for selected category and current period

**Issue**: Delete dialog stuck
**Solution**: Clear browser cache, rebuild app: `npm run build`

**Issue**: Tests failing
**Solution**:
```bash
# Clear node modules and reinstall
rm -rf node_modules
npm install
npm test
```

---

## Success Criteria

✅ All 9 test suites pass
✅ All automated tests pass
✅ No console errors during testing
✅ UI remains responsive
✅ Data persists correctly
✅ Real-time updates work

---

## Reporting Issues

If any test fails:
1. Note the test number and description
2. Screenshot the issue
3. Check browser console for errors
4. Document steps to reproduce
5. Report in GitHub issues with label `bug` and `budget`
