import { PageShell } from '@/components/PageShell';
import { useAuth } from '@/hooks/useAuth';
import { LEGAL_LAST_UPDATED } from '@/lib/legalContent';

interface LegalDocPageProps {
  title: string;
  children: React.ReactNode;
}

/**
 * Shared shell for the routed legal documents (/terms, /privacy).
 *
 * The page scrolls natively — deliberately no ScrollArea. A fixed-height inner
 * scroll box cannot know the header height, which varies with
 * env(safe-area-inset-top), and it costs iOS momentum scrolling too.
 *
 * These routes are public, so a signed-out reader arriving from the store
 * listing or the signup screen goes back to /auth rather than a Settings page
 * they cannot open.
 */
export function LegalDocPage({ title, children }: LegalDocPageProps) {
  const { user } = useAuth();

  return (
    <PageShell title={title} backTo={user ? '/settings' : '/auth'} className="py-6 space-y-6">
      {children}
      <p className="text-[10px] text-muted-foreground pt-4 text-center">
        Last updated: {LEGAL_LAST_UPDATED}
      </p>
    </PageShell>
  );
}
