---
created: 2026-03-28T00:00:00.000Z
title: Fira — AI chat assistant for pro users (v2.0)
area: general
files:
  - src/components/InputMethodSheet.tsx
  - src/components/Layout.tsx
  - src/components/TransactionForm.tsx
  - supabase/functions/
---

## Problem

Transaction logging requires users to navigate a multi-field form even for simple expenses. Voice and receipt scan are separate flows with separate UX. For pro users, there is no intelligent assistant that understands their financial context and can handle complex requests ("set a budget for food", "how much did I spend on transport this month?").

## Solution

**Fira is a conversational AI chatbot for pro users.** Users describe their finances in natural language. Fira interprets the intent using Claude (claude-sonnet-4-6) with user financial context, fills in the appropriate form, and opens a confirmation modal before committing any action. All existing scan (camera) and voice (mic) inputs are absorbed into Fira as attachment/input modes — not separate FAB options.

**FAB restructure:**
- **Pro users:** 2 options — "Fira" (AI chat) and "Manual" (form)
- **Free users:** 1 option — "Manual" (with a Fira teaser card showing "Upgrade to unlock Fira")
- `InputMethodSheet.tsx` simplified from 4 cards to 2 (or 1 for free users)

**Fira chat UI (`FiraAssistant.tsx` — new component):**
- Full-screen or tall bottom sheet with message thread
- User input bar with 3 input modes: text type, mic button (voice), camera button (receipt scan)
- Voice → transcribes via existing Web Speech / Capacitor Speech Recognition → feeds transcript into Fira message
- Receipt → captures image, calls existing Mindee/Gemini pipeline → feeds extracted data into Fira context
- Typing indicator (3-dot animation) while Claude processes
- Fira's response shows extracted fields and a "Confirm & Add" button
- Tapping "Confirm & Add" pre-fills and opens the relevant confirmation modal (AddTransactionModal, AddBudgetModal, etc.)
- Short message history in session (last 10 messages) for multi-turn clarification ("actually make it ৳500")
- Suggested quick-prompts on open: "Log an expense", "Create a budget", "How am I doing this month?"

**Backend — `fira-chat` Edge Function (new):**
- Input: `{ message: string, mode: 'text'|'voice'|'receipt', attachmentData?: ParsedReceiptResult, userId: string }`
- Builds user context: last 10 transactions (summarised), active budgets (name + remaining), savings goals (name + progress)
- Calls Claude API with system prompt defining Fira's persona and available tools
- Claude tool use:
  - `prepare_transaction({ merchant, amount, currency, type, category, date, note })` → opens AddTransactionModal
  - `prepare_budget({ name, amount, period, categoryId })` → opens AddBudgetModal
  - `prepare_savings_goal({ name, target_amount, deadline })` → opens AddSavingsGoalModal
  - `query_spending({ period, category? })` → returns summary, Fira narrates it
- Returns: `{ reply: string, action?: { type, payload } }`

**Data privacy:** User context sent to Claude contains only aggregated/anonymised data (budget names, category totals, savings goal names and progress percentages) — no raw merchant names or transaction notes.

**Rollout:** Fira introduced in v2.0. Voice and scan inputs remain in the codebase as Fira's internal input modes (not deprecated), ensuring existing VoiceInputFlow and ReceiptScannerModal logic is reused rather than rewritten.
