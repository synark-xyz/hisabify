# RevenueCat Paywall — Design Spec

Everything here is derived from the live app tokens in `src/index.css` and
`tailwind.config.ts`. Enter these values in the RevenueCat paywall editor so the
paywall is indistinguishable from the rest of Hisabify.

---

## 1. AI generation prompt

Paste this into RevenueCat's AI paywall generator, then correct the colours by
hand using section 2 (AI generators approximate hex values, they do not honour them).

> Design a premium subscription paywall for **Hisabify**, a personal finance and
> budgeting app. Modern fintech glassmorphism aesthetic: soft frosted-glass cards,
> generous rounded corners, subtle depth rather than hard shadows.
>
> **Layout, top to bottom:**
> 1. Close button, top-left, subtle and low-contrast.
> 2. A circular badge with a crown icon, filled with a blue-to-purple gradient and
>    a soft outer glow.
> 3. Eyebrow label "HISABIFY PRO" in small bold uppercase letters with wide letter
>    spacing, in purple.
> 4. Headline "Take control of your money" — large, heavy weight, tight tracking.
> 5. One supporting line of muted body text.
> 6. A benefits list of 6 rows. Each row is a small circular blue-purple gradient
>    icon on the left with a checkmark, then the benefit text. Comfortable row spacing.
> 7. Two package cards side by side. The annual card is pre-selected, carries a
>    2px purple border, a faint purple tint background, and a small pill badge in
>    the top-right reading "SAVE 33%". The monthly card is unselected with a plain
>    neutral border.
> 8. A full-width primary CTA button with a blue-to-purple horizontal gradient,
>    heavy white label, large rounded corners, and a soft purple glow beneath.
> 9. Below the button, one line of small muted text: renewal terms.
> 10. A footer row of small muted links: Restore, Terms, Privacy.
>
> **Style:** rounded corners throughout (cards ~20px, buttons ~16px, badges fully
> round). Bold geometric sans-serif typography with strong weight contrast between
> headline and body. Airy padding. Dark mode as the primary design, with a light
> mode variant. No stock photography, no illustrations of people, icons only.

---

## 2. Exact colour values

The app ships a light and a dark theme. Build both variants in RevenueCat.

### Dark mode (design this one first)

| Role | Hex | Notes |
|---|---|---|
| Background | `#101318` | Page background |
| Card / surface | `#181D25` | Package cards, benefit rows |
| Elevated surface | `#212631` | Unselected package card |
| Border | `#29303D` | Card borders, dividers |
| Text primary | `#F2F2F2` | Headline, package prices |
| Text secondary | `#B3B3B3` | Body copy, footer links |
| Accent (purple) | `#7C3BED` | Eyebrow, selected border, badges |
| Primary (blue) | `#3C83F6` | Gradient start |
| Success green | `#29BC86` | Checkmarks, savings badge |

### Light mode

| Role | Hex |
|---|---|
| Background | `#F9F9FB` |
| Card / surface | `#FFFFFF` |
| Border | `#E3E3E8` |
| Text primary | `#17171C` |
| Text secondary | `#61616B` |
| Accent (purple) | `#7C3BED` |
| Primary (blue) | `#3C83F6` |
| Success green | `#29BC86` |

### Gradients

- **CTA button and icon badges:** linear, 90°, `#3C83F6` → `#7C3BED`
- **Header glow:** radial, `#7C3BED` at 35% opacity fading to transparent
- **Selected card tint:** `#7C3BED` at 8% opacity

---

## 3. Typography

The app uses **Exo 2** throughout (`--font-sans`). If RevenueCat's editor offers
it, select it. Otherwise pick the closest geometric sans in this order:
**Exo 2 → Outfit → Manrope → Inter**.

| Element | Size | Weight | Tracking |
|---|---|---|---|
| Eyebrow "HISABIFY PRO" | 11 | 800 | +0.28em, uppercase |
| Headline | 26–28 | 900 | tight |
| Sub-headline | 14 | 400 | normal |
| Benefit row | 14 | 500 | normal |
| Package price | 20 | 800 | normal |
| Package period | 12 | 500 | normal |
| Savings badge | 10 | 700 | +0.1em, uppercase |
| CTA label | 16 | 900 | normal |
| Legal / footer | 11 | 400 | normal |

---

## 4. Shape and spacing

Derived from `--radius: 1rem` and the app's `rounded-2xl` / `rounded-3xl` usage.

- Package cards: **20px** radius
- CTA button: **16px** radius, **52px** height
- Benefit icon circles: fully round, **28px**
- Badges and pills: fully round
- Page horizontal padding: **24px**
- Gap between benefit rows: **14px**
- Gap between package cards: **12px**

---

## 5. Copy (verified against the code)

Every line below maps to a gate that actually exists. See the audit in the
commit `8b40e74` notes — the earlier AI and "early access" claims were removed
because nothing in the codebase implements them.

**Headline:** Take control of your money
**Sub-headline:** Everything you need to budget, save, and understand your spending.

**Benefits:**
- Unlimited budgets & savings goals
- All-time transaction history
- Multi-currency tracking with live rates
- Export PDF & CSV financial reports
- Advanced analytics & spending insights
- No ads, ever

**CTA:** Continue
**Renewal line:** Cancel anytime. Renews automatically until cancelled.
**Footer:** Restore · Terms · Privacy

> Do not reintroduce claims about an "AI financial agent" or AI-generated
> insights. `useAdvancedAnalytics.tsx` is local heuristics with no model calls,
> and paid-feature misrepresentation is a Play Store takedown risk under the
> Deceptive Behaviour policy.

---

## 6. Checklist before publishing

- [ ] Both light and dark variants built
- [ ] Annual package pre-selected, savings badge percentage matches real prices
- [ ] Restore button present (required by App Store review guideline 3.1.1)
- [ ] Terms and Privacy links point to the live `/terms` and `/privacy` URLs
- [ ] Attached to the **current** offering, or `presentPaywall` renders nothing
- [ ] Previewed at 320pt width so the two package cards do not overflow
