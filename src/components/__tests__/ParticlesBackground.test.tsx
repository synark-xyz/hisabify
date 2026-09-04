import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ParticlesBackground } from '@/components/ParticlesBackground';

// Regression: this component read a bare `theme` identifier while `useTheme()` only
// exposes `resolvedTheme`. In dev that surfaced nowhere, but the production bundle
// threw `ReferenceError: theme is not defined` on render — and because
// ParticlesBackground is the first child of Dashboard, it took the whole page into
// the ErrorBoundary. Rendering in both themes is enough to catch a recurrence.

const resolvedTheme = vi.hoisted(() => ({ current: 'dark' as 'dark' | 'light' }));

vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ resolvedTheme: resolvedTheme.current }),
}));

describe('ParticlesBackground', () => {
  it.each(['dark', 'light'] as const)('renders in %s mode without throwing', (mode) => {
    resolvedTheme.current = mode;
    expect(() => render(<ParticlesBackground />)).not.toThrow();
  });
});
