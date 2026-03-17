import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Invoked daily at 08:00 UTC by a Supabase pg_cron job.
 * Queries payment reminders due within notify_before_days and sends
 * a push notification to each user (Android FCM) via send-push-notification.
 *
 * CRON setup (run once in Supabase SQL editor):
 *   select cron.schedule(
 *     'daily-payment-reminders',
 *     '0 8 * * *',
 *     $$ select net.http_post(
 *       url := 'https://<project-ref>.supabase.co/functions/v1/schedule-payment-reminders',
 *       headers := '{"Authorization": "Bearer <service-role-key>"}'::jsonb
 *     ) $$
 *   );
 */
serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // ── Auth: service-role key required ───────────────────────────────────────
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader || authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // ── Find reminders that fall due in exactly notify_before_days days ────────
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const { data: reminders, error } = await supabase
    .from('payment_reminders')
    .select(`
      id,
      title,
      amount,
      currency,
      due_date,
      notify_before_days,
      user_id,
      users!inner(push_notifications_enabled)
    `)
    .eq('status', 'upcoming')
    .not('notify_before_days', 'is', null);

  if (error) {
    console.error('[schedule-payment-reminders] Query failed:', error.message);
    return new Response('Query failed', { status: 500 });
  }

  if (!reminders || reminders.length === 0) {
    return new Response(JSON.stringify({ scheduled: 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── Filter to reminders due exactly today + notify_before_days ────────────
  const matching = reminders.filter((r) => {
    const user = r.users as unknown as { push_notifications_enabled: boolean };
    if (!user?.push_notifications_enabled) return false;

    const dueDate = new Date(r.due_date);
    dueDate.setUTCHours(0, 0, 0, 0);
    const diffDays = Math.round((dueDate.getTime() - today.getTime()) / 86_400_000);
    return diffDays === (r.notify_before_days ?? 0);
  });

  console.log(`[schedule-payment-reminders] ${matching.length} reminder(s) to send`);

  const sendUrl = `${supabaseUrl}/functions/v1/send-push-notification`;
  let scheduled = 0;

  await Promise.all(
    matching.map(async (reminder) => {
      const daysLabel =
        (reminder.notify_before_days ?? 1) === 1
          ? 'tomorrow'
          : `in ${reminder.notify_before_days} days`;

      const amountLabel = reminder.amount != null
        ? ` — ${reminder.currency ?? ''} ${reminder.amount}`.trimEnd()
        : '';

      const res = await fetch(sendUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: reminder.user_id,
          title: `Reminder: ${reminder.title}`,
          body: `Due ${daysLabel}${amountLabel}`,
          data: { reminder_id: reminder.id },
        }),
      });

      if (res.ok) {
        scheduled++;
      } else {
        console.error(
          `[schedule-payment-reminders] Failed to send for reminder ${reminder.id}:`,
          await res.text()
        );
      }
    })
  );

  return new Response(JSON.stringify({ scheduled, checked: reminders.length }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
