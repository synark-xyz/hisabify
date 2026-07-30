import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, CheckCircle2 } from 'lucide-react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

// Mirrors the allowlist in public.is_admin() — see
// supabase/migrations/20260729000100_add_admin_read_access.sql. RLS is the real gate;
// this only decides whether to bother rendering the page.
const ADMIN_EMAILS = ['scode43@gmail.com'];

// Adding a table here is the whole cost of adding it to the panel for plain viewing — the
// view builds its columns from whatever comes back. deletion_requests is the one exception:
// it also gets a per-row Approve action and non-generic column rendering below, because it's
// the only table in this panel with a lifecycle a human needs to act on. Don't generalize that
// into every table — it's deliberately special-cased.
const TABLES = ['app_feedback', 'user_behavior_events', 'deletion_requests'] as const;
type TableName = (typeof TABLES)[number];

const ROW_LIMIT = 100;
const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  cancelled: 'bg-muted text-muted-foreground border-border',
  completed: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
};

type Row = Record<string, unknown>;

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value).toLocaleString();
  }
  return String(value);
}

// Not translated: internal tool, single operator. ponytail: i18n it if support staff ever use it.
export function AdminPage() {
  const { user } = useAuth();
  const isAdmin = !!user?.email && ADMIN_EMAILS.includes(user.email);

  const [table, setTable] = useState<TableName>('app_feedback');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: queryError } = await supabase
      .from(table as 'app_feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(ROW_LIMIT);

    if (queryError) setError(queryError.message);
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }, [table]);

  // Runs regardless of which tab is selected — it's the one signal that the
  // 30-day response clock is running on an unreviewed request.
  const fetchPendingCount = useCallback(async () => {
    const { count } = await supabase
      .from('deletion_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');
    setPendingCount(count ?? 0);
  }, []);

  useEffect(() => {
    if (isAdmin) fetchRows();
  }, [isAdmin, fetchRows]);

  useEffect(() => {
    if (isAdmin) fetchPendingCount();
  }, [isAdmin, fetchPendingCount]);

  const handleApprove = useCallback(
    async (requestId: string) => {
      setApprovingId(requestId);
      const { error: invokeError } = await supabase.functions.invoke('process-deletion-request', {
        body: { requestId },
      });
      setApprovingId(null);

      if (invokeError) {
        setError(invokeError.message);
        return;
      }
      await fetchRows();
      await fetchPendingCount();
    },
    [fetchRows, fetchPendingCount],
  );

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="Admin" showBack />
        <main className="px-4 py-6">
          <p className="text-sm text-muted-foreground">Not authorized.</p>
        </main>
      </div>
    );
  }

  const columns = rows.length ? Object.keys(rows[0]) : [];

  return (
    <div className="min-h-screen bg-background pb-page-content">
      <Header title="Admin" showBack />
      <main className="px-4 py-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {TABLES.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setTable(name)}
              aria-pressed={table === name}
              className={cn(
                'rounded-xl border px-3 py-2 text-sm font-semibold transition-colors',
                table === name
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border/60 text-muted-foreground hover:bg-muted/50'
              )}
            >
              {name}
              {name === 'deletion_requests' && pendingCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchRows}
            disabled={loading}
            aria-label="Refresh"
            className="ml-auto"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          {loading ? 'Loading…' : `${rows.length} row${rows.length === 1 ? '' : 's'}`}
          {rows.length === ROW_LIMIT && ` (newest ${ROW_LIMIT})`}
        </p>

        {error && (
          <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {!loading && !error && rows.length === 0 && (
          <p className="text-sm text-muted-foreground">No rows.</p>
        )}

        {rows.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-border/50">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50">
                <tr>
                  {columns.map((column) => (
                    <th key={column} className="whitespace-nowrap px-3 py-2 font-semibold">
                      {column}
                    </th>
                  ))}
                  {table === 'deletion_requests' && (
                    <th className="whitespace-nowrap px-3 py-2 font-semibold">action</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index} className="border-t border-border/40 align-top">
                    {columns.map((column) => {
                      if (table === 'deletion_requests' && column === 'status') {
                        const status = String(row[column]);
                        return (
                          <td key={column} className="px-3 py-2">
                            <span
                              className={cn(
                                'inline-block rounded-full border px-2 py-0.5 font-semibold whitespace-nowrap',
                                STATUS_STYLES[status] ?? 'bg-muted text-muted-foreground border-border'
                              )}
                            >
                              {status}
                            </span>
                          </td>
                        );
                      }

                      if (table === 'deletion_requests' && column === 'detail') {
                        const text = formatCell(row[column]);
                        return (
                          <td key={column} className="px-3 py-2 max-w-sm whitespace-pre-wrap break-words">
                            {text}
                          </td>
                        );
                      }

                      const text = formatCell(row[column]);
                      return (
                        <td key={column} className="px-3 py-2" title={text}>
                          <span className="block max-w-[24rem] truncate">{text}</span>
                        </td>
                      );
                    })}
                    {table === 'deletion_requests' && (
                      <td className="px-3 py-2">
                        {row.status === 'pending' ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={approvingId === row.id}
                            onClick={() => handleApprove(row.id as string)}
                          >
                            {approvingId === row.id ? 'Approving…' : 'Approve & delete'}
                          </Button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {String(row.status)}
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
