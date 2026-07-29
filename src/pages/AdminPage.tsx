import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

// Mirrors the allowlist in public.is_admin() — see
// supabase/migrations/20260729000100_add_admin_read_access.sql. RLS is the real gate;
// this only decides whether to bother rendering the page.
const ADMIN_EMAILS = ['scode43@gmail.com'];

// Adding a table here is the whole cost of adding it to the panel — the view builds its
// columns from whatever comes back.
const TABLES = ['app_feedback', 'user_behavior_events'] as const;
type TableName = (typeof TABLES)[number];

const ROW_LIMIT = 100;

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

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);

    // The table is picked at runtime, so the row type can't be known statically; every table
    // here has created_at, which is all the query itself depends on.
    const { data, error: queryError } = await supabase
      .from(table as 'app_feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(ROW_LIMIT);

    if (queryError) setError(queryError.message);
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }, [table]);

  useEffect(() => {
    if (isAdmin) fetchRows();
  }, [isAdmin, fetchRows]);

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
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index} className="border-t border-border/40 align-top">
                    {columns.map((column) => {
                      const text = formatCell(row[column]);
                      return (
                        <td key={column} className="px-3 py-2" title={text}>
                          <span className="block max-w-[24rem] truncate">{text}</span>
                        </td>
                      );
                    })}
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
