# Module Features & Test Scenarios

**Document Purpose**: High-level view of Hisabify product features organized by modules/pages with happy paths and edge cases for testing.

**Last Updated**: 2026-03-10

---

## 1. Authentication Module (`/auth`)

### Functional Features
- User registration with email + password
- User login with email + password
- Magic link authentication (email-based)
- Password reset flow
- Session management and persistence
- Automatic redirect based on authentication state
- Onboarding flow for new users

### Non-Functional Features
- Session timeout after inactivity
- Secure password storage (Supabase Auth)
- HTTPS-only authentication
- Email verification
- Rate limiting on login attempts

### Happy Paths
1. **Sign Up Flow**
   - User navigates to `/auth`
   - Enters valid email and password (min 8 chars)
   - Submits form successfully
   - Receives welcome email
   - Redirects to `/onboarding`

2. **Sign In Flow**
   - User enters valid credentials
   - System validates and creates session
   - Redirects to `/` (Dashboard)

3. **Password Reset Flow**
   - User clicks "Forgot Password"
   - Enters registered email
   - Receives reset link via email
   - Clicks link and sets new password
   - Redirects to login with success message

### Edge Cases & Error Scenarios
- Email already registered (show error)
- Invalid email format (client-side validation)
- Password too short (<8 chars)
- Incorrect credentials on login (show generic error)
- Reset link expired (>24 hours)
- Network failure during authentication
- User refreshes during onboarding
- User manually navigates to `/auth` while logged in (redirect to dashboard)
- Multiple tabs open with different auth states
- Session expiry while user is active
- Magic link used multiple times
- Magic link expired

---

## 2. Onboarding Module (`/onboarding`)

### Functional Features
- Welcome screen with app introduction
- Currency selection with geolocation detection
- Timezone preference setup
- First card/account setup prompt
- Skip option for optional steps

### Non-Functional Features
- Mobile-responsive layout
- Progress indicator
- Smooth transitions between steps

### Happy Paths
1. **Complete Onboarding**
   - New user lands on onboarding
   - Selects currency (auto-detected or manual)
   - Sets display name
   - (Optional) Adds first card
   - Completes and redirects to Dashboard

### Edge Cases
- Geolocation permission denied (fallback to manual selection)
- User closes browser mid-onboarding (resume on return)
- User skips all optional steps
- Invalid currency code entered
- Network failure during setup
- User navigates back button during flow

---

## 3. Dashboard Module (`/`)

### Functional Features
- Current month expense overview
- Total balance across all cards
- Recent transactions list (last 10)
- Budget progress indicators
- Upcoming payment reminders carousel
- Quick action buttons (Add Transaction, Add Card)
- Health score display (gamification)
- Monthly spending trend chart
- Category breakdown donut chart
- Pull-to-refresh on mobile
- Daily quote widget intentionally excluded from production dashboard

### Non-Functional Features
- Load dashboard data within 300ms
- Real-time updates on data changes
- Skeleton loaders during fetch
- Optimistic UI updates
- Responsive grid layout
- Dark mode support

### Happy Paths
1. **View Dashboard**
   - User logs in
   - Dashboard loads with current data
   - Charts render successfully
   - Recent transactions displayed

2. **Quick Add Transaction**
   - User clicks "Add Transaction" FAB
   - Modal opens
   - User fills form and submits
   - Dashboard updates immediately (optimistic)
   - Transaction appears in recent list

### Edge Cases
- No transactions yet (show empty state)
- No cards added (show prompt to add card)
- No budgets set (show prompt)
- Chart rendering with 0 data points
- Very long transaction descriptions (truncate)
- Currency conversion failure (show original amount)
- Real-time update received during user interaction
- Multiple rapid transactions added
- Dashboard refresh during data mutation
- Very large transaction amounts (number formatting)
- Negative balance (styling/warning)
- Budget exceeded (red indicators)
- Pull-to-refresh while data is loading

---

## 4. Cards & Accounts Module (`/cards` or embedded)

### Functional Features
- Add new card/account with metadata
  - Card nickname
  - Card type (Credit/Debit/Cash)
  - Last 4 digits (optional)
  - Initial balance
  - Color/icon selection
- Edit existing card details
- Delete card (with confirmation)
- View card transaction history
- Card grouping/tagging
- **[PREMIUM]** Add unlimited cards (free: limit to 3-5)
- **[PREMIUM]** Import cards via CSV

### Non-Functional Features
- Inline validation for card details
- Color-coded card display
- Card icons for visual distinction
- Confirmation dialog on delete (prevent accidental deletion)

### Happy Paths
1. **Add Card**
   - User clicks "Add Card"
   - Fills in nickname, type, balance
   - Selects color/icon
   - Submits successfully
   - Card appears in list immediately

2. **Edit Card**
   - User clicks edit icon on card
   - Modal opens with pre-filled data
   - User updates nickname
   - Saves successfully
   - UI updates immediately

3. **Delete Card**
   - User clicks delete icon
   - Confirmation modal appears
   - User confirms deletion
   - Card removed from list
   - Success toast shown

### Edge Cases
- Duplicate card nicknames (allow but warn)
- Delete card with existing transactions (cascade or prevent?)
- Edit card while transaction form is open using that card
- Very long card nickname (truncate display)
- Invalid last 4 digits (non-numeric)
- Negative initial balance (allow for credit cards)
- Add card when at free tier limit (show premium prompt)
- **[PREMIUM]** CSV import with malformed data
- **[PREMIUM]** CSV import with duplicate entries
- Card color/icon selection with accessibility issues
- Network failure during save
- Delete multiple cards rapidly
- Card associated with active budget

---

## 5. Transactions/Expenses Module (`/expenses`)

### Functional Features
- Create transaction (income/expense)
  - Amount (required)
  - Category selection (required)
  - Card/account assignment (required)
  - Date picker (default: today)
  - Description/notes (optional)
  - Currency (with conversion)
  - **[PREMIUM]** Receipt upload with OCR
- Edit existing transactions
- Delete transactions (with confirmation)
- Filter transactions
  - By date range
  - By category
  - By card
  - By type (income/expense)
- Sort transactions (date, amount, category)
- Search transactions by description
- **[PREMIUM]** Bulk CSV import
- **[PREMIUM]** Attach multiple receipts

### Non-Functional Features
- Optimistic UI updates
- Real-time sync across devices
- Client-side validation
- Currency conversion at display time
- Receipt image compression before upload
- Transaction list virtualization for performance

### Happy Paths
1. **Add Transaction**
   - User opens "Add Transaction" modal
   - Selects card
   - Enters amount (e.g., 25.50)
   - Selects category (e.g., "Food & Dining")
   - Enters description (e.g., "Lunch at Cafe")
   - Selects date (default today)
   - Submits
   - Transaction appears in list immediately
   - Budget progress updates

2. **Edit Transaction**
   - User clicks edit on transaction
   - Modal opens with pre-filled data
   - User changes amount
   - Saves successfully
   - List updates immediately
   - Budget recalculated

3. **Filter & Search**
   - User selects date range
   - User selects category filter
   - List updates to show matching transactions
   - User types search term
   - List filters in real-time

4. **[PREMIUM] Upload Receipt**
   - User clicks receipt icon
   - Selects image from device
   - OCR extracts merchant, amount, date
   - Transaction form pre-fills
   - User confirms and submits

### Edge Cases
- Amount field empty (show validation)
- Amount with more than 2 decimal places (round)
- Very large amounts (billions) - handle display
- Zero or negative amount for expense (warn)
- Past date vs future date handling
- Transaction date before card creation date
- Category not selected (require selection)
- Card not selected (require selection)
- Delete transaction that affects completed budget
- Edit transaction date to different month (affects multiple budgets)
- Currency conversion API failure (store original, disable conversion)
- Receipt upload fails (allow retry or proceed without)
- Receipt OCR extracts invalid data (allow manual correction)
- Bulk CSV import with >1000 rows (show progress)
- Duplicate transaction detection
- Filter with no matching results (show empty state)
- Search with special characters
- Rapid creation of multiple transactions
- Edit transaction while another user edits (multi-device conflict)
- Network failure during save (queue for retry)
- Transaction description with emojis or special chars
- Receipt image > 10MB (reject with message)
- Unsupported receipt format (PDF, etc.)

---

## 6. Budget Module (`/budget`)

### Functional Features
- Create budget
  - Category selection (or "Total" for all categories)
  - Budget amount
  - Period (weekly/monthly/yearly)
  - Currency
  - Start date
- Edit budget
- Delete budget (with confirmation)
- View budget progress
  - Current spending vs budget
  - Percentage used
  - Status indicator (safe <80%, warning 80-99%, exceeded ≥100%)
  - Daily average spending
- **[FREE]** Limit: 1 active budget
- **[PREMIUM]** Unlimited budgets
- **[PREMIUM]** Copy budget to next period
- **[PREMIUM]** Budget history chart (spending trends over time)
- **[PREMIUM]** Budget vs Spending comparison chart
- **[PREMIUM]** Budget alerts (email/push notifications)

### Non-Functional Features
- Real-time budget updates on transaction changes
- Currency conversion for multi-currency transactions
- Automatic period rollover (start new period)
- Optimistic UI updates

### Happy Paths
1. **Create Monthly Budget**
   - User clicks "Add Budget"
   - Selects category (e.g., "Food")
   - Enters amount (e.g., $500)
   - Selects period "Monthly"
   - Submits
   - Budget card appears with 0% used

2. **Track Budget Progress**
   - User adds transaction in budgeted category
   - Budget progress updates immediately
   - Percentage and amount spent update
   - Status remains "safe" (<80%)

3. **Budget Exceeded**
   - User adds transaction that pushes spending over budget
   - Status changes to "exceeded"
   - Card shows red indicator
   - **[PREMIUM]** Email alert sent

4. **[PREMIUM] Copy Budget to Next Month**
   - User clicks "Copy to Next Period" button
   - Modal confirms action
   - New budget created for next month
   - Success message shown

### Edge Cases
- Create budget with amount 0 (validate minimum)
- Create budget for past period (allow or prevent?)
- Budget with negative amount (prevent)
- Delete budget mid-period (what happens to data?)
- Edit budget amount after spending started (recalculate %)
- Multiple budgets for same category (free tier blocked)
- Transaction in category without budget (no impact)
- Budget period ends while user is viewing (auto-refresh)
- Currency change mid-period (recalculate all)
- Very long category name in budget card (truncate)
- Budget for category with 0 transactions (show 0%)
- Free user tries to add 2nd budget (show premium gate)
- **[PREMIUM]** Copy budget that would exceed premium limits
- Budget with different currency than transactions (convert)
- Delete category that has active budget (cascade or prevent?)
- Budget start date in future (how to display?)
- Spending exceeds budget by huge margin (display handling)
- Network failure during budget creation
- Simultaneous budget edits from multiple devices
- Budget progress calculation with pending transactions
- Year-end rollover for yearly budgets

---

## 7. Savings Goals Module (`/savings`)

### Functional Features
- Create savings goal
  - Goal name (e.g., "Vacation Fund")
  - Target amount
  - Target date (deadline)
  - Initial amount (optional)
  - Color/icon selection
- Edit savings goal
- Delete savings goal (with confirmation)
- Contribute to goal (add funds)
- Withdraw from goal (reduce funds)
- View progress
  - Current amount vs target
  - Percentage complete
  - Days remaining
  - Suggested monthly contribution
- **[FREE]** Limit: 1 active savings goal
- **[PREMIUM]** Unlimited savings goals
- Mark goal as completed
- Goal achievement celebration (confetti/animation)

### Non-Functional Features
- Progress visualization (progress bar)
- Color-coded cards
- Automatic calculation of monthly savings needed
- Optimistic updates

### Happy Paths
1. **Create Savings Goal**
   - User clicks "Add Savings Goal"
   - Enters goal name "Emergency Fund"
   - Sets target amount $5,000
   - Sets target date (6 months from now)
   - Submits
   - Goal card appears with 0% progress

2. **Contribute to Goal**
   - User clicks "Add Contribution" on goal card
   - Enters amount $500
   - Submits
   - Progress updates to 10%
   - Suggested monthly savings recalculates

3. **Complete Goal**
   - User makes final contribution reaching 100%
   - Confetti animation plays
   - Goal marked as "Completed"
   - Option to archive or set new goal

### Edge Cases
- Target amount 0 or negative (validate)
- Target date in past (validate)
- Initial amount > target amount (set to 100%)
- Contribute amount that exceeds target (allow, show >100%)
- Withdraw more than current amount (prevent or allow negative?)
- Delete goal with contributions (confirm data loss)
- Goal deadline passes with incomplete progress (highlight overdue)
- Very long goal name (truncate)
- Goal with no target date (allow indefinite goal?)
- Edit target amount after contributions started
- Edit target date to sooner deadline (update suggestions)
- Free user tries to add 2nd goal (show premium prompt)
- Multiple rapid contributions (ensure correct calculations)
- Network failure during contribution
- Currency change for existing goal (recalculate?)
- Goal completion exactly at midnight (edge case timing)
- Contribute $0 amount (validate)
- Goal card display with very large numbers (format)

---

## 8. Payment Reminders Module (Dashboard & `/notifications`)

### Functional Features
- Create payment reminder
  - Reminder name (e.g., "Netflix Subscription")
  - Amount
  - Due date
  - Recurrence (one-time/daily/weekly/monthly/yearly)
  - Category (optional)
  - Notes (optional)
- Edit reminder
- Delete reminder (with confirmation)
- View upcoming reminders (carousel on dashboard)
- Mark reminder as paid (status update only, no transaction auto-create)
- **[PREMIUM]** Calendar sync (export reminders to external calendar)
- **[PREMIUM]** Email/push notification for reminders

### Non-Functional Features
- Automatic reminder generation for recurring items
- Real-time sync
- Sort by due date
- Past due highlighting
- Calendar-day-safe due date handling to reduce timezone drift

### Happy Paths
1. **Create Monthly Reminder**
   - User clicks "Add Reminder"
   - Enters name "Rent Payment"
   - Enters amount $1,200
   - Sets due date (1st of month)
   - Sets recurrence "Monthly"
   - Submits
   - Reminder appears in carousel

2. **Mark as Paid**
   - User sees reminder notification
   - Clicks "Mark as Paid"
   - Reminder status updates to "paid"
   - Next recurrence scheduled

### Edge Cases
- Create reminder with past due date (show as overdue)
- Reminder with amount 0 (allow, might be just a task)
- Recurrence "daily" creating too many items (performance)
- Delete recurring reminder (delete single or all future?)
- Edit recurring reminder (update single or all future?)
- Mark as paid and confirm no duplicate transaction appears in ledger
- Reminder notification at exactly midnight (timezone handling)
- **[PREMIUM]** Calendar sync failure (retry mechanism)
- Reminder with very long name (truncate in carousel)
- Multiple reminders due same day (display priority)
- Past due reminder still unpaid (escalate notification?)
- Edit reminder due date to future (affects notification schedule)
- Network failure during reminder creation
- Recurring reminder calculation spanning multiple years
- Reminder amount in different currency (convert for display)
- Delete reminder that has already sent notifications
- Carousel with 20+ reminders (pagination/scroll)

---

## 9. Analytics & Reports Module (`/analytics` & `/reports`)

### Functional Features
- Monthly spend overview (line chart)
  - Trend over last 12 months
  - Comparison to previous period
- Category distribution (donut chart)
  - Top categories by spending
  - Percentage breakdown
- Spending by category chart (bar chart)
- Expense trends chart
- Income vs Expense comparison
- Financial health score display
- **[FREE]** Last 30 days only
- **[PREMIUM]** Infinite transaction history
- **[PREMIUM]** Custom date range selection
- **[PREMIUM]** Period-over-period comparison
- **[PREMIUM]** Export report to PDF
- **[PREMIUM]** Export report to CSV
- **[PREMIUM]** Share report via link
- No production fallback to mock/sample analytics data

### Non-Functional Features
- Charts load under 300ms
- Responsive chart sizing
- Color-blind friendly palette
- Chart legend with clear labels
- Empty state for insufficient data

### Happy Paths
1. **View Monthly Analytics**
   - User navigates to `/analytics`
   - Charts load with current month data
   - Line chart shows spending trend
   - Donut chart shows category breakdown
   - Financial summary displays

2. **[PREMIUM] Custom Date Range**
   - User selects "Custom Range"
   - Picks start date (3 months ago)
   - Picks end date (today)
   - Charts update with filtered data
   - Export button becomes available

3. **[PREMIUM] Export Report**
   - User clicks "Export PDF"
   - Loading indicator appears
   - PDF generates with charts and data
   - Download starts automatically

### Edge Cases
- No transactions in selected period (show empty state)
- Only 1 transaction (chart rendering)
- All transactions in same category (donut chart 100%)
- Very high number of categories (legend overflow)
- Custom date range with reversed dates (validate)
- Free user tries to select date >30 days ago (show premium gate)
- **[PREMIUM]** Export fails due to large dataset (show error, retry)
- Chart rendering with incomplete data
- Negative amounts in spending (income, handle differently)
- Very large amounts (chart scaling)
- Multiple currencies in same period (convert all)
- Real-time data update while viewing chart (refresh)
- Chart zoom/pan on mobile (touch gestures)
- Period-over-period with unequal date ranges
- Export CSV with special characters in descriptions
- Share link expires after X days
- Network failure during chart data fetch

---

## 10. Notifications Module (`/notifications`)

### Functional Features
- View notification history
- Mark notification as read
- Mark all as read
- Delete notification
- Filter notifications by type
  - Budget alerts
  - Payment reminders
  - Savings milestones
  - System notifications
- In-app toast notifications
- **[PREMIUM]** Email notifications
- **[PREMIUM]** Push notifications (web/mobile)

### Non-Functional Features
- Real-time notification delivery
- Notification badge count on navigation
- Sound/vibration on mobile (user preference)
- Do Not Disturb mode

### Happy Paths
1. **Receive & View Notification**
   - Budget exceeded triggers notification
   - Toast appears in app
   - Badge appears on notifications icon
   - User clicks notification icon
   - Navigates to `/notifications`
   - Notification appears in list

2. **[PREMIUM] Push Notification**
   - Payment reminder due
   - Push notification sent to device
   - User clicks notification
   - App opens to payment reminder detail

### Edge Cases
- Notification list with 100+ items (pagination)
- Mark as read while notification still being delivered
- Delete notification that's mid-delivery
- Notification for deleted transaction (stale reference)
- Push notification permission denied (fallback to in-app only)
- Multiple notifications at exact same time (queue handling)
- Notification service unavailable (retry logic)
- User has DND enabled (respect settings)
- Notification link to deleted resource (show error gracefully)

---

## 11. Profile Module (`/profile`)

### Sub-Pages

#### 11.1 Personal Profile (`/profile/personal`)

##### Functional Features
- View user profile information
  - Display name
  - Email
  - Profile picture
  - Join date
  - Subscription status
- Edit display name
- Upload profile picture
  - Image crop/resize
  - Avatar preview
- Change password
- Delete account (with confirmation)

##### Non-Functional Features
- Image compression before upload
- Secure password change flow
- Profile picture caching
- Validation on all inputs

##### Happy Paths
1. **Update Profile Picture**
   - User clicks on avatar
   - Selects image from device
   - Crops/resizes image
   - Saves successfully
   - Avatar updates across app

2. **Change Password**
   - User clicks "Change Password"
   - Enters current password
   - Enters new password (twice)
   - Validates password strength
   - Submits successfully
   - Session remains active

##### Edge Cases
- Upload very large image >10MB (reject or compress)
- Upload non-image file (validate)
- Profile picture upload fails (retry or revert)
- Change password with incorrect current password (show error)
- New password same as current (allow or prevent?)
- Multiple rapid profile updates (debounce)
- Delete account with active subscription (refund handling?)
- Delete account confirmation accidentally clicked (require password re-entry)

#### 11.2 Data Management (`/profile/data`)

##### Functional Features
- Export all data (JSON/CSV)
- Import data from backup
- View data usage statistics
  - Total transactions
  - Total cards
  - Total budgets
  - Storage used
- Delete specific data types
  - Delete all transactions
  - Delete all budgets
  - Delete all reminders
- Clear cache

##### Non-Functional Features
- Export completes within 60 seconds
- Data export follows standard format (CSV/JSON)
- Privacy compliance (GDPR/CCPA)

##### Happy Paths
1. **Export All Data**
   - User clicks "Export Data"
   - Loading indicator appears
   - ZIP file generates with JSON/CSV
   - Download starts
   - Success message shown

##### Edge Cases
- Export with huge dataset (10k+ transactions) - handle timeout
- Export fails mid-generation (retry mechanism)
- Import malformed JSON (validation and error message)
- Import data with duplicate IDs (merge strategy)
- Delete all data accidentally (require confirmation + password)
- Network failure during export

#### 11.3 Referral/Invite (`/profile/invite`)

##### Functional Features
- View personal referral code
- Copy referral link
- View referral statistics
  - Total referrals
  - Active referrals
  - Rewards earned
- Share referral link (social media, email)
- Redeem referral code (for new users)

##### Non-Functional Features
- Unique referral code per user
- Referral tracking backend
- Reward distribution mechanism

##### Happy Paths
1. **Share Referral**
   - User views referral page
   - Clicks "Copy Link"
   - Toast confirms copy
   - User shares externally
   - New user signs up with code
   - Both users receive reward

##### Edge Cases
- Referral code already used by same user (prevent duplicate)
- Referral code case sensitivity
- Invalid referral code entered (show error)
- Expired referral code (if time-limited)
- Self-referral attempt (prevent)
- Referral reward distribution failure (retry)

---

## 12. Settings Module (`/settings`)

### Sub-Pages

#### 12.1 Preferences (`/settings/preferences`)

##### Functional Features
- Select primary currency
- Select timezone
- Select locale/language
- Set date format (MM/DD/YYYY vs DD/MM/YYYY)
- Set number format (comma vs period)
- Select theme (light/dark/cyberpunk/auto)
- Default transaction category
- Budget start day (1st vs custom)

##### Non-Functional Features
- Settings persist across sessions
- Theme changes apply immediately
- Currency change recalculates all displays

##### Happy Paths
1. **Change Currency**
   - User navigates to Settings
   - Selects currency dropdown
   - Chooses "EUR"
   - Confirms change
   - All amounts update to EUR across app

##### Edge Cases
- Change currency mid-month (how to handle budgets?)
- Unsupported locale selected (fallback to English)
- Theme change while chart is rendering (re-render)
- Timezone change affects reminder times (recalculate)

#### 12.2 Notifications (`/settings/notifications`)

##### Functional Features
- Enable/disable email notifications
- Enable/disable push notifications
- Set notification preferences by type
  - Budget alerts
  - Payment reminders
  - Savings milestones
  - Marketing emails
- Set quiet hours (DND)
- Notification sound selection

##### Non-Functional Features
- Real-time preference updates
- Respect OS-level notification permissions

##### Happy Paths
1. **Configure Notification Preferences**
   - User toggles "Email Notifications" on
   - Enables "Budget Alerts" only
   - Sets quiet hours (10 PM - 8 AM)
   - Saves successfully
   - Preferences applied immediately

##### Edge Cases
- Push permission denied at OS level (show guidance)
- Toggle off all notifications (confirm user intent)
- Quiet hours spanning midnight (time range validation)

---

## 13. Reports Module (`/reports`)

### Functional Features
- Generate expense report
  - Date range selection
  - Category filter
  - Card filter
- Generate income report
- Generate net worth report (future)
- **[PREMIUM]** Export to PDF with charts
- **[PREMIUM]** Export to CSV
- **[PREMIUM]** Schedule recurring reports (email delivery)

### Non-Functional Features
- Report generation under 10 seconds
- Professional PDF formatting
- CSV follows standard RFC 4180

### Happy Paths
1. **Generate Monthly Expense Report**
   - User selects "Expense Report"
   - Chooses date range (last month)
   - Selects all categories
   - Clicks "Generate"
   - Report displays in-app
   - **[PREMIUM]** Option to export PDF

### Edge Cases
- Date range > 5 years (performance warning)
- Report with 0 transactions (empty report)
- **[PREMIUM]** PDF generation timeout (retry)
- CSV export with special characters (proper escaping)
- Report includes deleted categories (show as "Deleted")

---

## 14. Premium Features & Subscription

### Premium Gating System

#### Functional Features
- `PremiumGuard` component wraps premium features
- Blur effect on locked features
- "Upgrade to Pro" modal
- Subscription status display
- Feature entitlement checks

#### Happy Paths
1. **Free User Encounters Premium Feature**
   - Free user tries to add 2nd budget
   - Modal blocks action
   - Shows "Upgrade to Pro" prompt
   - Lists premium benefits
   - Option to upgrade or cancel

#### Edge Cases
- Subscription expires while user is using premium feature (graceful degradation)
- Subscription status check fails (fallback to free tier)
- User upgrades mid-session (immediate access without reload)
- Premium feature used just before downgrade (grandfather in?)

---

## 15. Mobile-Specific Features

### Functional Features
- Pull-to-refresh on all list views
- Bottom navigation for primary routes
- Mobile-optimized touch targets (44x44px minimum)
- Capacitor native integration (iOS/Android)
- Geolocation for currency detection
- Camera access for receipt upload
- Local notifications (Capacitor)

### Non-Functional Features
- Responsive breakpoints (sm/md/lg/xl)
- Touch gesture support (swipe, pinch)
- Native-like transitions
- Offline data caching (future)

### Happy Paths
1. **Pull-to-Refresh**
   - User on transactions list
   - Pulls down from top
   - Loading indicator appears
   - Data refreshes
   - List updates

### Edge Cases
- Pull-to-refresh while data is already loading (prevent duplicate)
- Camera permission denied (show manual upload option)
- Geolocation timeout (fallback to manual currency)
- Deep link to app while offline (queue action)

---

## 16. Error Handling & Edge Cases (Cross-Module)

### Global Edge Cases
- Network offline (show offline banner, queue actions)
- Server error 500 (show retry option)
- Authentication expired mid-session (redirect to login)
- Rate limiting triggered (show cooldown message)
- Database connection failure (retry with exponential backoff)
- Real-time subscription disconnected (attempt reconnect)
- Supabase maintenance mode (show status page)
- Browser localStorage full (clear old cache)
- Invalid JWT token (force re-authentication)
- CORS issues (backend configuration)
- XSS attempt in user input (sanitize and reject)
- SQL injection attempt (Supabase RLS protection)
- Very large dataset performance (virtualization, pagination)
- Multi-device sync conflicts (last-write-wins strategy)
- User deletes data on one device while viewing on another (handle gracefully)
- App version mismatch (force refresh on major updates)

---

## 17. Accessibility Features (WCAG AA)

### Functional Features
- Keyboard navigation support
- Screen reader compatibility (ARIA labels)
- Focus visible indicators
- Skip to main content link
- Form error announcements
- Alt text on all images

### Non-Functional Features
- Color contrast ratio ≥ 4.5:1
- Text resizable up to 200%
- No flashing content (seizure prevention)

### Test Scenarios
- Navigate entire app using only keyboard
- Use app with screen reader (NVDA/JAWS/VoiceOver)
- Increase text size to 200% (layout should adapt)
- Test color contrast in all themes

---

## 18. Performance Benchmarks

### Non-Functional Requirements
- **Initial Load**: < 2 seconds on 3G
- **Dashboard Data Load**: < 300ms
- **Chart Rendering**: < 300ms
- **Transaction Search**: < 100ms for 1000 items
- **Real-time Update Latency**: < 1 second
- **Image Upload**: < 5 seconds for 5MB file
- **Report Generation**: < 10 seconds for 1 year data

### Test Scenarios
- Load test with 10,000 transactions
- Load test with 100 budgets
- Concurrent user simulation (100 users)
- Mobile performance on low-end devices
- Network throttling tests (3G/4G)

---

## 19. Security Test Scenarios

### Test Cases
- SQL injection attempts in all input fields
- XSS attacks via transaction descriptions
- CSRF token validation
- Session hijacking attempts
- Unauthorized API access (direct Supabase calls)
- Password strength enforcement
- Rate limiting on login endpoint (max 5 attempts)
- File upload validation (malicious files)
- Data export contains only user's data (no leakage)

---

## 20. Data Integrity Test Scenarios

### Test Cases
- Create transaction then immediately delete (optimistic update rollback)
- Edit transaction from multiple devices simultaneously (conflict resolution)
- Delete card with existing transactions (referential integrity)
- Currency change with existing budgets (recalculation accuracy)
- Budget period rollover at midnight (timing accuracy)
- Recurring reminder generation (correct future dates)
- Savings goal reaching exactly 100% (rounding errors)
- Exchange rate cache expiry (stale data prevention)
- Transaction date in different timezone (correct storage/display)

---

## Appendix: Premium Feature Matrix

| Feature | Free Tier | Pro Tier ($4.99/mo) |
|---------|-----------|---------------------|
| Transactions | Unlimited | Unlimited |
| Transaction History | Last 30 days | All-time |
| Cards | Up to 3-5 | Unlimited |
| Budgets | 1 active | Unlimited |
| Savings Goals | 1 active | Unlimited |
| Budget History Chart | ❌ | ✅ |
| Copy Budget to Next Period | ❌ | ✅ |
| Multi-Currency | ❌ | ✅ |
| Receipt Upload + OCR | ❌ | ✅ |
| CSV Import/Export | ❌ | ✅ |
| PDF Reports | ❌ | ✅ |
| Custom Date Ranges | ❌ | ✅ |
| Email Notifications | ❌ | ✅ |
| Push Notifications | ❌ | ✅ |
| Calendar Sync | ❌ | ✅ |
| Priority Support | ❌ | ✅ |

---

**End of Document**
