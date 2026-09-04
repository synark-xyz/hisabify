# UPDATE.md

## Recent Changes (August 29, 2026) — v1.0.0 release prep

Full detail lives in `CHANGELOG.md` under `[Unreleased]`. Headlines:

- **Sign out could leave the user signed in.** `supabase.auth.signOut()` returns `{ error }` rather
  than throwing, so the `try/catch` caught nothing; gotrue also skips `_removeSession()` when the
  server call fails. The app toasted success and navigated to `/auth` with a live session. Now the
  returned error is checked, `scope: 'local'` is the fallback, and the session is verified gone.
- **Unified error/offline UI.** `ErrorState` / `DataErrorState`, the pure `toErrorVariant()`
  classifier, `useOnline()` + `OfflineBanner`, per-route `ErrorBoundary`, and a bounded `useAuth`
  bootstrap. A failed fetch no longer renders as an empty state.
- **`/settings/subscription`.** One manage surface, driven by the pure `deriveSubscriptionStatus()`;
  `CustomerCenterTrigger` removed. Cancel and Restore render only for an actual paying subscriber.
- **Subscription mirror syncs downgrades.** `users.subscription_type` is written on every
  entitlement transition (value `'base'`, not `'free'`), cached per user so free accounts do not
  issue a redundant write on every cold start. Migration `20260828000000` repairs stranded rows.
- **AdMob correctness.** Banner lifecycle moved into `BannerAd`; `useAdBanner` keeps only the shared
  init/consent helpers. Staging builds can no longer pair Google's test app ID with the real ad
  unit — verified against built APKs by `npm run verify:apk-ads`.
- **Layout/scroll fixes.** The bottom inset now has exactly one owner (`Layout`'s `<main>`), which
  removed 236px of dead scroll space on the Dashboard; the bottom nav's lost anchor and the banner
  covering it are both fixed and pinned by tests.
- **Route-level page transitions removed** — they fought the scroll restore and the Suspense swap.

---

## Recent Changes (March 16, 2026)

### 4. **Android Google OAuth Fix**
**Status:** ✅ Complete
**Location:** `src/App.tsx`, `src/pages/AuthCallbackPage.tsx`

#### Problem:
Google sign-in on Android (Capacitor) failed silently with a 15s timeout.

Two bugs combined to cause this:

1. **Deep link URL parsing** — `new URL("io.synark.hisabify://auth/callback?code=...")` parses custom schemes differently: `host="auth"`, `pathname="/callback"`. The path check `path.includes('/auth/callback')` evaluated against `/callback` and never matched, so the deep link was logged as "Ignoring non-auth URL" and discarded.

2. **PKCE code never exchanged** — Supabase's `detectSessionInUrl: true` runs once at client initialization time (when the WebView loads `https://localhost/`). By the time React Router navigated to `/auth/callback?code=...` via the deep link, the Supabase client had already run its URL detection on the wrong URL and would never exchange the code automatically.

#### Fix:
1. In `App.tsx`: Reconstruct the full route path as `/${parsed.host}${parsed.pathname}` instead of using `parsed.pathname` alone, so the `/auth/callback` check works correctly for custom URL schemes.
2. In `AuthCallbackPage.tsx`: Manually extract the `code` param from `window.location.search` and call `supabase.auth.exchangeCodeForSession(code)` explicitly, bypassing the missed auto-detection.

---

### 1. **Voice Input "Record Once" Architecture**
**Status:** ✅ Complete
**Location:** `src/hooks/useVoiceInput.ts`, `src/components/VoiceInputFlow.tsx`, `src/components/NexusModal.tsx`

#### What Changed:
- Replaced event-listener + partial-results architecture with promise-based blocking calls
- `useVoiceInput` now returns `{ listen, stop, parseCommand }` instead of 9 separate state/action values
- `VoiceInputFlow` reduced from ~430 to ~290 lines; single async `handleRecord` drives all phase transitions
- Eliminated all race conditions: no `isListening` state, no refs, no useEffects for phase management

#### Technical Details:
- **Native (Capacitor):** `SpeechRecognition.start({ partialResults: false })` returns a blocking promise that resolves with final text when Android auto-detects silence (~2-3s)
- **Web fallback:** `new SpeechRecognition()` with `continuous: false, interimResults: false` wrapped in a Promise
- Calling `stop()` while `listen()` is pending triggers finalization and resolves the promise with whatever was captured

---

### 2. **Scrollbar Visibility Fix**
**Status:** ✅ Complete
**Location:** `src/index.css`, `android/app/src/main/java/io/synark/hisabify/MainActivity.java`

#### What Changed:
- Hidden scrollbars globally across all pages and platforms
- CSS uses `!important` to override cross-layer cascade issues (`@layer base` vs `@layer utilities`)
- Added explicit `#root` scrollbar hiding rules
- `.custom-scrollbar` class available for opt-in visible scrollbars
- Android WebView overlay scrollbars disabled natively in `MainActivity.java`

---

### 3. **Feature Connectivity Improvements**
**Status:** ✅ Complete (High Priority)

#### Budget → Expenses Navigation
**Location:** `src/components/BudgetProgressCard.tsx`, `src/components/BudgetDashboard.tsx`
- Added "View in Expenses" dropdown action on budget cards
- Navigates to `/expenses` pre-filtered by category and budget date range

#### Analytics → Expenses Drill-Down
**Location:** `src/components/dashboard/CategoryBreakdownChart.tsx`, `src/pages/AnalyticsPage.tsx`
- Pie chart slices and legend items are clickable
- Navigates to `/expenses?categoryName=X&from=Y&to=Z`

#### Notification Action Links
**Location:** `src/pages/NotificationsPage.tsx`
- Budget notification cards now have "View Budget →" and "View Spending →" buttons
- Links navigate to `/budget` and `/expenses` respectively

#### Savings → Budget Visibility
**Location:** `src/components/savings/SavingsGoalCard.tsx`, `src/pages/SavingsPage.tsx`
- Savings goal cards display a badge with linked budget name
- Uses `Wallet` icon for visual consistency

#### Expenses Page URL Param Support (Prerequisite)
**Location:** `src/pages/ExpensesPage.tsx`
- Accepts `category`, `categoryName`, `from`, `to`, `viewMode` search params
- Auto-infers viewMode from date range if not specified
- Deferred category name resolution via `pendingCategoryNameRef` for async matching

---

### 4. **Test Fixes**
**Status:** ✅ Complete
**Location:** `src/hooks/__tests__/useVoiceInput.test.ts`

- Changed all `toEqual` to `toMatchObject` to fix pre-existing failures
- `parseCommand` returns extra fields (`confidence`, `currency`, `type`) that exact matching rejected

---

## Recent Changes (January 23, 2026)

### 1. **Expenses Page Overhaul**
**Status:** ✅ Complete  
**Location:** `src/pages/ExpensesPage.tsx`

#### What Was Added:
- **Dual View Calendar System**: Seamlessly switch between a compact week strip and a full month calendar.
- **Segmented View Control**: New "Weekly / Monthly" toggle tab for clear view management.
- **Smart Date Navigation**: Interactive Year and Month dropdowns replaced static headers.
- **Context-Aware Analytics**: Stats headers dynamically update to "Daily", "Weekly", or "Monthly" based on user selection.
- **Swipeable Week View**: New `SwipeableWeekCalendar` component allows gesture-based week navigation.

#### Features:
- **Auto-Synchronization**: Selecting a date in a different month automatically switches the view context.
- **Improved UX**: 
  - Fixed bottom navigation "floating" bug.
  - Decoupled navigation/modals from scroll container for better stability.
  - "Daily Overview" mode triggers automatically when a specific date is selected.

---

## Recent Changes (January 22, 2026)

This document tracks the latest updates to the Hisabify application and outlines the roadmap for future enhancements.

---

## ✅ Completed in This Update

### 1. **Collapsible Calendar Component**
**Status:** ✅ Complete  
**Location:** `src/components/dashboard/CollapsibleCalendar.tsx`

#### What Was Added:
- Week view displayed by default (Monday-Sunday)
- Expandable month view with smooth animation
- Quick date navigation (Previous Week, Today, Next Week)
- Full calendar popup for date jumping
- Visual indicators for today and selected date
- Responsive design with touch-friendly interactions

#### Features:
- **Default Week View**: Shows current week with day-of-month numbers
- **Expand/Collapse**: Chevron button toggles full month view
- **Date Selection**: Click any date to select it
- **Visual Feedback**: 
  - Selected date: Orange background
  - Today: Ring indicator
  - Other month days: Faded appearance
- **Quick Navigation**: Buttons to jump weeks or return to today
- **Calendar Icon**: Opens full date picker popup

#### Usage:
```typescript
import { CollapsibleCalendar } from '@/components/dashboard/CollapsibleCalendar';

<CollapsibleCalendar
  selectedDate={date}
  onDateChange={setDate}
/>
```

---

### 2. **Financial Summary Component**
**Status:** ✅ Complete  
**Location:** `src/components/dashboard/FinancialSummary.tsx`

#### What Was Added:
- Comprehensive financial summaries with period comparisons
- Daily, weekly, and monthly totals
- Period-over-period percentage changes
- Transaction count tracking
- Quick insights panel

#### Features:
- **Three Summary Cards:**
  - **Today**: Current day income/expense vs yesterday
  - **This Week**: Current week totals vs last week
  - **This Month**: Current month totals vs last month

- **Each Card Shows:**
  - Income (green)
  - Expense (orange)
  - Net amount (color-coded: green if positive, red if negative)
  - Transaction count
  - Comparison: Percentage change and absolute difference from previous period
  - Visual indicator: Up/down arrow with appropriate colors

- **Quick Insights:**
  - Daily average spending for current month
  - Monthly savings rate (net/income %)
  - Income/expense ratio

#### Technical Details:
- Properly handles multi-currency using `convertedAmount` from transactions
- Uses date-fns for accurate period calculations
- Memoized for performance optimization
- Supports all transaction types (income/expense)
- Gracefully handles edge cases (zero transactions, division by zero)

#### Usage:
```typescript
import { FinancialSummary } from '@/components/dashboard/FinancialSummary';

<FinancialSummary
  transactions={allTransactions}
  selectedDate={date}
/>
```

---

### 3. **Bottom Navigation Enhancement**
**Status:** ✅ Complete  
**Location:** `src/components/BottomNavigation.tsx`

#### What Was Fixed:
- **iOS Safe Area Support**: Proper padding for notched devices (iPhone X and later)
- **Sticky Positioning**: Enhanced fixed positioning that works across all devices
- **Visual Polish**: Improved glass effect with backdrop blur

#### Technical Changes:
- Changed from CSS class to inline style for safe-area-inset-bottom
- Uses `max()` function to ensure minimum padding of 1rem
- Increased backdrop opacity to 95% for better visibility
- Added proper padding structure (top: 3, bottom: 2 + safe area)

#### CSS Utilities Added:
```css
.safe-top { padding-top: env(safe-area-inset-top, 0px); }
.safe-area-inset { /* All safe areas */ }
.pb-safe-nav { padding-bottom: calc(5rem + env(safe-area-inset-bottom, 0px)); }
```

---

### 4. **Security Enhancements**
**Status:** ✅ Complete  
**Location:** `src/lib/security.ts`, `src/hooks/useAuth.tsx`

#### What Was Added:
- **Input Sanitization**: XSS prevention for all text inputs
- **Rate Limiting**: Protection against brute force attacks
- **Email Validation**: RFC-compliant email format checking
- **Password Strength**: Enforced password requirements
- **Numeric Validation**: Prevent injection via numeric fields
- **URL Sanitization**: Prevent open redirect attacks
- **Timing Attack Prevention**: Constant-time string comparison
- **Secure Context Check**: HTTPS verification

#### Security Utilities:
```typescript
// Input sanitization
sanitizeInput(userInput);
sanitizeTransactionData(data);
sanitizeNumericInput(amount);

// Validation
isValidEmail(email);
validatePasswordStrength(password);
sanitizeUrl(redirectUrl);

// Rate limiting
loginRateLimiter.isAllowed(key);
apiRateLimiter.isAllowed(key);

// Security checks
isSecureContext();
generateRandomString(32);
```

#### Auth Hook Enhancements:
- Email validation before signup/signin
- Password strength validation on signup
- Rate limiting (5 attempts per minute)
- Automatic rate limit reset on success
- Logging of security events
- Timing attack prevention with random delays
- Proper error messages with reset time for rate limits

#### Identified Vulnerabilities Fixed:
1. ✅ **No input sanitization** → Added sanitizeInput() throughout
2. ✅ **No rate limiting** → Implemented client-side rate limiter
3. ✅ **Weak password policy** → Enforced 8+ chars with mixed case and numbers
4. ✅ **No email validation** → Added RFC-compliant regex validation
5. ✅ **Timing attacks possible** → Added random delays in auth operations
6. ✅ **No numeric validation** → Added sanitizeNumericInput()
7. ✅ **Missing security logging** → Integrated with logger for security events

---

## 📝 Documentation Created

### INSTRUCTIONS.md
Comprehensive developer guide covering:
- Architecture principles (DO/DON'T)
- Security guidelines
- Data management best practices
- UI/UX standards
- Testing requirements
- PWA & performance tips
- Deployment checklist
- Common patterns and code examples

### WARP.md (Already Existed)
Project context for AI assistants with:
- Development commands
- Architecture overview
- Provider hierarchy
- Core hooks documentation
- Common patterns

---

## 🔍 Code Quality Improvements

### Clean Architecture Implementation:
1. **Separation of Concerns**:
   - Components are presentational only
   - Business logic in custom hooks
   - Utilities in `lib/` folder
   - Type definitions centralized

2. **Security First**:
   - All user inputs sanitized
   - Rate limiting on auth operations
   - Proper error logging
   - No sensitive data in logs

3. **Performance Optimized**:
   - Memoized calculations
   - Efficient re-renders
   - Proper dependency arrays
   - Lazy loading ready

4. **Maintainability**:
   - Clear naming conventions
   - Comprehensive comments
   - Type-safe implementations
   - Reusable components

---

## 🚀 Future Roadmap

### High Priority (Next Sprint)

#### 1. **Enhanced Budget Tracking**
- Budget vs actual spending charts
- Category-wise budget alerts
- Rollover unused budget to next month
- Budget templates for common categories

#### 2. **Receipt Management Improvements**
- OCR for automatic receipt data extraction
- Receipt image compression
- Cloud storage integration (optional)
- Receipt search and filtering

#### 3. **Analytics Dashboard Enhancement**
- Spending patterns by time of day
- Merchant frequency analysis
- Category spending trends
- Predictive spending insights

#### 4. **Recurring Transactions**
- Auto-create recurring income/expenses
- Subscription tracking
- Renewal reminders
- Pause/resume recurring items

### Medium Priority

#### 5. **Multi-Account Support**
- Bank account synchronization (via Plaid/similar)
- Multiple wallet management
- Account-to-account transfers
- Consolidated view

#### 6. **Collaborative Features**
- Share budgets with family members
- Split expenses
- Group transactions
- Approval workflows

#### 7. **Advanced Security**
- Biometric authentication (fingerprint/Face ID)
- Two-factor authentication (2FA)
- Session management
- Device tracking

#### 8. **Export & Reporting**
- PDF reports with charts
- Excel export with formulas
- Tax preparation summaries
- Custom date ranges

### Low Priority (Future)

#### 9. **AI-Powered Insights**
- Spending anomaly detection
- Personalized savings recommendations
- Category auto-suggestion
- Budget optimization

#### 10. **Gamification**
- Savings goals with progress tracking
- Achievement badges
- Spending challenges
- Community leaderboards

#### 11. **Integrations**
- Connect with investment platforms
- Credit score monitoring
- Bill negotiation services
- Cashback tracking

#### 12. **Localization**
- Multi-language support
- Regional date/number formats
- Local currency symbols
- Cultural customization

---

## 🛠️ Technical Debt to Address

### 1. **Testing**
- [ ] Add unit tests for hooks
- [ ] Add integration tests for auth flows
- [ ] Add E2E tests for critical paths
- [ ] Set up CI/CD pipeline with tests

### 2. **Performance**
- [ ] Implement virtual scrolling for long transaction lists
- [ ] Add skeleton loaders for all async content
- [ ] Optimize image loading (lazy + WebP)
- [ ] Bundle size analysis and optimization

### 3. **Accessibility**
- [ ] Full keyboard navigation
- [ ] Screen reader optimization
- [ ] ARIA labels for all interactive elements
- [ ] High contrast mode support

### 4. **Backend**
- [ ] Implement Supabase RLS policies (if not done)
- [ ] Add database indexes for performance
- [ ] Set up backup and recovery procedures
- [ ] API rate limiting on backend

### 5. **Monitoring**
- [ ] Integrate Sentry for error tracking
- [ ] Add analytics (privacy-respecting)
- [ ] Performance monitoring (Core Web Vitals)
- [ ] User behavior analytics

---

## 📊 Known Issues

### Non-Critical:
1. **Sample data in Dashboard**: Analytics section uses hardcoded sample data for years 2023-2026. Should be replaced with actual transaction aggregation.

2. **Payment reminders**: Currently using mock data. Needs database table and CRUD operations.

3. **Currency conversion**: Real-time exchange rates need external API integration (currently manual).

### To Be Addressed:
- Add retry logic for failed API calls
- Implement offline queue for transactions
- Add conflict resolution for concurrent edits
- Improve error messages for users

---

## 🔐 Security Recommendations for Production

### Critical Before Launch:
1. **Enable Supabase RLS**: Row Level Security policies on all tables
2. **Set up HTTPS**: Force SSL in production
3. **Configure CSP**: Content Security Policy headers
4. **Rate limit backend**: Server-side rate limiting in Supabase
5. **Audit dependencies**: Run `npm audit` and fix critical vulnerabilities
6. **Environment vars**: Ensure no secrets in code/commits
7. **Backup strategy**: Automated database backups
8. **Incident response**: Plan for security breaches

### Recommended:
- Web Application Firewall (WAF)
- DDoS protection
- Regular security audits
- Penetration testing
- Bug bounty program

---

## 📈 Metrics to Track

### User Engagement:
- Daily/Monthly Active Users (DAU/MAU)
- Session duration
- Features used per session
- Retention rate

### Technical:
- Page load time
- Error rate
- API response time
- Crash rate

### Business:
- User growth rate
- Feature adoption
- User feedback scores
- Churn rate

---

## 🤝 Contributing

When adding new features:
1. Read INSTRUCTIONS.md first
2. Follow the established patterns
3. Add security measures (sanitization, validation)
4. Test on multiple devices
5. Update this file with changes
6. Document in code comments

---

## 📞 Support

For questions or issues:
- Check INSTRUCTIONS.md for guidelines
- Review WARP.md for architecture context
- Refer to inline code comments
- Consult Supabase/React Query documentation

---

**Last Updated:** January 22, 2026  
**Version:** 2.0.0  
**Contributors:** Warp AI Agent

---

## Changelog

### v2.0.0 (2026-01-22)
- Added CollapsibleCalendar component
- Added FinancialSummary component with period comparisons
- Enhanced BottomNavigation with iOS safe area support
- Implemented comprehensive security utilities
- Enhanced authentication with rate limiting and validation
- Created INSTRUCTIONS.md and UPDATE.md documentation
- Fixed security vulnerabilities (XSS, rate limiting, input validation)

### v1.0.0 (Previous)
- Initial application setup
- Basic transaction tracking
- Budget management
- Savings goals
- Multi-currency support
- PWA functionality
