You are an experienced UI designer and mobile apps theming expert. The app has two theme architectures:

1. **Default Theme** (Base/Light Mode)
2. **Cyberpunk Theme** (Pro User)

The current light mode theming is broken across almost every page — colors are bleeding through incorrectly, font colors are wrong against backgrounds, primary/accent colors are misapplied, and button colors do not respect the selected theme.

Your job: Audit and rewrite the **complete theming layer** of this Flutter app so that:

---

**THEME STRUCTURE REQUIREMENTS:**

- Create a single `AppTheme` class that exports both `lightTheme` and `cyberpunkTheme` as `ThemeData` objects.
- Every color, font, and component style MUST be defined inside the `ThemeData` — never hardcoded anywhere in the widget tree.
- Use `Theme.of(context)` or `context.theme` everywhere to pull colors dynamically.
- No raw `Color()` literals in any `build()` method unless it is a one-off overlay (e.g., splash screen).

---

**DEFAULT (LIGHT) THEME SPEC:**

- `scaffoldBackgroundColor`: `Color(0xFFF5F5F5)` (soft grey)
- `primaryColor` / `colorScheme.primary`: `Color(0xFFFF9800)` (orange — matching the app's accent brand)
- `colorScheme.secondary` / accent: `Color(0xFF6C3CE1)` (purple — for FAB, highlights)
- `colorScheme.onPrimary`: `Colors.white`
- `colorScheme.surface`: `Colors.white`
- `colorScheme.onSurface`: `Color(0xFF1A1A1A)` (near-black text)
- `colorScheme.background`: `Color(0xFFF5F5F5)`
- `colorScheme.onBackground`: `Color(0xFF1A1A1A)`
- `colorScheme.error`: `Color(0xFFE53935)`
- `colorScheme.onError`: `Colors.white`
- `colorScheme.tertiary`: `Color(0xFF4CAF50)` (green — for income/positive values)
- `colorScheme.onTertiary`: `Colors.white`
- Text theme:
  - `displayLarge` / headings: `Color(0xFF1A1A1A)`, weight `w700`
  - `bodyMedium` / default body: `Color(0xFF333333)`, weight `w400`
  - `bodySmall` / captions: `Color(0xFF757575)`
  - All text styles use `TextStyle` bound inside `textTheme`
- Card theme: white background, `borderRadius 16`, subtle shadow `BoxShadow(color: Color(0x1A000000), blurRadius: 8)`
- Button theme (ElevatedButton):
  - Background: `colorScheme.primary` (orange)
  - Foreground (text): `colorScheme.onPrimary` (white)
  - Shape: `RoundedRectangleBorder(borderRadius: 12)`
- FAB theme:
  - Background: `colorScheme.secondary` (purple)
  - Foreground: `Colors.white`
- AppBar theme:
  - Background: `Colors.white`
  - Title color: `Color(0xFF1A1A1A)`
  - `surfaceTintColor: Colors.transparent`
- Bottom navigation bar:
  - Background: `Colors.white`
  - Selected item color: `colorScheme.primary`
  - Unselected item color: `Color(0xFF9E9E9E)`
- Expense color (negative/red values): `Color(0xFFE53935)`
- Income color (positive/green values): `Color(0xFF4CAF50)`
- Balance card background: a gradient from `Color(0xFF1A1A2E)` to `Color(0xFF16213E)` (dark navy) with **white text** for readability.
- Financial health score ring color: `colorScheme.primary` (orange)

---

**CYBERPUNK THEME SPEC:**

- `scaffoldBackgroundColor`: `Color(0xFF0A0A1A)` (very dark navy/black)
- `primaryColor` / `colorScheme.primary`: `Color(0xFF00F0FF)` (cyan/neon blue)
- `colorScheme.secondary` / accent: `Color(0xFFFF2D95)` (neon pink)
- `colorScheme.onPrimary`: `Color(0xFF0A0A1A)` (dark — for text on cyan buttons)
- `colorScheme.surface`: `Color(0xFF12121F)` (dark card surface)
- `colorScheme.onSurface`: `Color(0xFFE0E0E0)` (light grey text)
- `colorScheme.background`: `Color(0xFF0A0A1A)`
- `colorScheme.onBackground`: `Color(0xFFE0E0E0)`
- `colorScheme.error`: `Color(0xFFFF2D95)` (neon pink doubles as error)
- `colorScheme.onError`: `Colors.white`
- `colorScheme.tertiary`: `Color(0xFF39FF14)` (neon green)
- `colorScheme.onTertiary`: `Color(0xFF0A0A1A)`
- Text theme:
  - `displayLarge` / headings: `Color(0xFF00F0FF)`, weight `w700`
  - `bodyMedium`: `Color(0xFFCCCCCC)`, weight `w400`
  - `bodySmall` / captions: `Color(0xFF888888)`
- Card theme: `Color(0xFF12121F)` background, border `Color(0xFF00F0FF)` with opacity `0.3`, `borderRadius 16`
- Button theme (ElevatedButton):
  - Background: `colorScheme.primary` (cyan)
  - Foreground: `colorScheme.onPrimary` (dark)
  - Shape: `RoundedRectangleBorder(borderRadius: 12)`
  - Optional: glow effect via `BoxShadow` with `color: Color(0x8000F0FF)`
- FAB theme:
  - Background: `colorScheme.secondary` (neon pink)
  - Foreground: `Colors.white`
  - Glow shadow: `Color(0x80FF2D95)`
- AppBar theme:
  - Background: `Color(0xFF0A0A1A)`
  - Title color: `Color(0xFF00F0FF)`
- Bottom navigation bar:
  - Background: `Color(0xFF0A0A1A)`
  - Selected item color: `colorScheme.primary` (cyan)
  - Unselected item color: `Color(0xFF555555)`
- Expense color: `colorScheme.error` (neon pink)
- Income color: `colorScheme.tertiary` (neon green)
- Balance card background: gradient from `Color(0xFF0A0A1A)` to `Color(0xFF1A0A2E)` with **white text**
- Financial health score ring color: `colorScheme.primary` (cyan)

---

**ENFORCEMENT RULES — APPLY ACROSS ALL PAGES:**

1. Every widget that displays text MUST pull its color from `Theme.of(context).textTheme` or `Theme.of(context).colorScheme`. No hardcoded `TextStyle(color: ...)`.
2. Every Card or container background MUST use `Theme.of(context).colorScheme.surface` or the card theme — never a hardcoded color.
3. Every button MUST use `ElevatedButtonTheme` or `ButtonStyle` from the theme — no manual `.copyWith(backgroundColor: ...)` with raw colors.
4. The balance card (showing Main Balance, Expenses, Income) MUST use its own themed decoration but keep text white in BOTH themes for contrast.
5. Expense amounts MUST always render in `colorScheme.error`.
6. Income amounts MUST always render in `colorScheme.tertiary`.
7. The FAB (floating action button) MUST use `fabTheme` from ThemeData.
8. The bottom nav bar selected/unselected colors MUST come from the theme.
9. Any "quote card" or info card background MUST use `colorScheme.surface`.
10. The Financial Health score ring MUST use `colorScheme.primary`.
11. If a `ThemeProvider` or `ChangeNotifierProvider` is used to switch themes at runtime, ensure the entire `MaterialApp` rebuilds with the correct `ThemeData` — do NOT cache or partially apply.
12. Audit every single screen/page file and replace any hardcoded color with the correct theme reference. List every file you change.

---

**OUTPUT:**

- Provide the full `AppTheme` class with both `ThemeData` objects.
- Provide a checklist of every widget pattern that must be updated (e.g., `Text` with hardcoded color, `Container` with hardcoded background, etc.).
- If you see the app uses a `ThemeProvider` or similar state management for theme switching, include the correct setup.
- Do NOT leave any hardcoded colors in widget trees. The theme layer must be the single source of truth.
