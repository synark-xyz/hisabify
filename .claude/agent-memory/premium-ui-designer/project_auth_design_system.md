---
name: AuthPage Design System
description: Visual design decisions, animation patterns, and component conventions used in the premium AuthPage redesign
type: project
---

AuthPage was redesigned on 2026-03-16 on branch `ui/auth-redesign-social-login` to match high-end fintech aesthetics (Revolut/Linear tier).

**Why:** The original design had flat inputs, no micro-interactions, no password strength, no show/hide toggle, and used a static background.

**How to apply:** Replicate these conventions when building or modifying any auth-adjacent screen (onboarding, reset-password, etc.).

## Key design decisions

### Background
- Fixed dark base: `background: linear-gradient(160deg, #07091200 0%, #080c14 40%, #0a0518 100%)`
- Animated blobs use `framer-motion` `animate` with `scale` + `opacity` only (GPU-safe)
- Blobs are skipped when `useReducedMotion()` returns true
- Fine dot grid overlay via `radial-gradient` background-image at 28px spacing

### Card surface (glassmorphism)
- `background: linear-gradient(160deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.03) 100%)`
- `backdropFilter: blur(28px)` with `-webkit-` prefix
- `border: 1px solid rgba(255,255,255,0.085)`
- `boxShadow: 0 32px 80px -16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07)`

### Animated tab pill
- Uses `motion.div` with `layoutId="tab-active-pill"` for spring-physics sliding indicator
- Login tab: blue→indigo gradient; Signup tab: purple→pink gradient
- Spring config: `stiffness: 320, damping: 28`

### FloatingInput component
- Floating label: CSS transition from `top-1/2` (unfocused) to `top-2 text-[10px]` (focused/filled)
- Focus border glow: `shadow-[0_0_0_1px_rgba(59,130,246,0.35),inset_0_1px_0_rgba(255,255,255,0.05)]`
- Error state: `border-red-500/50 bg-red-500/[0.06] shadow-[0_0_0_1px_rgba(239,68,68,0.3)]`
- Error shake animation: `x: [0, -4, 4, -3, 3, 0]` via framer-motion

### Password strength bar
- 5-segment bar, each fills with `scaleX` from 0→1 with 40ms stagger
- Colors: Weak=#ef4444, Fair=#f97316, Good=#eab308, Strong=#22c55e, Excellent=#10b981

### Submit button success state
- On success: transitions to green gradient + CheckCircle2 icon with spring bounce
- Uses AnimatePresence with mode="wait" to swap between label/loading/success states
- Navigate delay: 400ms to allow success animation to register

### OAuth buttons
- Google: pure white with multi-level shadow
- Apple: near-black (#1a1a1a) with subtle inset highlight and border
- Both use `whileHover: scale(1.015) y(-1)` + `whileTap: scale(0.975)` spring physics

### Motion variants pattern
All page-level elements use named variants (`pageVariants`, `cardVariants`, `formVariants`) defined as constants, not inline, for reuse and readability.

### prefers-reduced-motion
`useReducedMotion()` from framer-motion gates all blob animations. Translate values collapse to 0 in variant definitions when `shouldReduce` is true.
