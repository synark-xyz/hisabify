import { Trash2, SmartphoneNfc, Mail, ShieldCheck, Clock } from 'lucide-react';
import { LEGAL_CONTACT_EMAIL } from '@/lib/legalContent';

export function DeleteAccountPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      {/* Header */}
      <header className="border-b border-gray-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
            <Trash2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-bold text-gray-900">Hisabify</span>
            <span className="text-gray-400 text-sm ml-2">by Synark</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-10">
        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Delete Your Account</h1>
          <p className="mt-2 text-gray-500 text-sm leading-relaxed">
            You can request deletion of your Hisabify account and all associated data at any time.
            This page explains how to do that and what happens to your data.
          </p>
        </div>

        {/* Method 1 — In-App */}
        <section className="border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <SmartphoneNfc className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Method 1 — Delete in the App (Recommended)</h2>
              <p className="text-xs text-gray-500 mt-0.5">Instant deletion of all your financial data</p>
            </div>
          </div>

          <ol className="space-y-3 text-sm text-gray-700">
            <li className="flex gap-3">
              <span className="w-5 h-5 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
              <span>Open the <strong>Hisabify</strong> app and sign in to your account.</span>
            </li>
            <li className="flex gap-3">
              <span className="w-5 h-5 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
              <span>Tap your <strong>profile avatar</strong> in the top-right corner of the dashboard.</span>
            </li>
            <li className="flex gap-3">
              <span className="w-5 h-5 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
              <span>Select <strong>Data &amp; Privacy</strong> from the profile menu.</span>
            </li>
            <li className="flex gap-3">
              <span className="w-5 h-5 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
              <span>Scroll to the <strong>Danger Zone</strong> section and tap <strong>Delete Data</strong>.</span>
            </li>
            <li className="flex gap-3">
              <span className="w-5 h-5 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center flex-shrink-0 mt-0.5">5</span>
              <span>Type <code className="bg-gray-100 px-1 rounded font-mono text-xs">DELETE</code> in the confirmation box and tap <strong>Delete Data</strong> to confirm.</span>
            </li>
          </ol>

          <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-4 py-3">
            Your financial data is deleted immediately. You will be signed out automatically.
          </p>
        </section>

        {/* Method 2 — Email */}
        <section className="border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Method 2 — Request via Email</h2>
              <p className="text-xs text-gray-500 mt-0.5">For full account removal including your login credentials</p>
            </div>
          </div>

          <ol className="space-y-3 text-sm text-gray-700">
            <li className="flex gap-3">
              <span className="w-5 h-5 bg-orange-500 text-white rounded-full text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
              <span>
                Send an email to{' '}
                <a href={`mailto:${LEGAL_CONTACT_EMAIL}?subject=Account Deletion Request — Hisabify`}
                  className="text-blue-600 underline font-medium">
                  {LEGAL_CONTACT_EMAIL}
                </a>
              </span>
            </li>
            <li className="flex gap-3">
              <span className="w-5 h-5 bg-orange-500 text-white rounded-full text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
              <span>Use the subject line: <strong>Account Deletion Request — Hisabify</strong></span>
            </li>
            <li className="flex gap-3">
              <span className="w-5 h-5 bg-orange-500 text-white rounded-full text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
              <span>Include the <strong>email address</strong> associated with your Hisabify account in the message body.</span>
            </li>
          </ol>

          <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-4 py-3">
            We will process your request within <strong>30 days</strong> and send a confirmation to your email once complete.
          </p>
        </section>

        {/* What gets deleted */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-green-600" />
            <h2 className="font-semibold text-gray-900">What Data Is Deleted</h2>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden text-sm">
            <table className="w-full">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Data Type</th>
                  <th className="text-left px-4 py-3 font-semibold">Deleted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  ['Transactions & expenses', 'Immediately on request'],
                  ['Budgets', 'Immediately on request'],
                  ['Cards & accounts', 'Immediately on request'],
                  ['Savings goals', 'Immediately on request'],
                  ['Payment reminders', 'Immediately on request'],
                  ['Recurring expenses', 'Immediately on request'],
                  ['Report templates', 'Immediately on request'],
                  ['Profile & preferences', 'Immediately on request'],
                  ['Login credentials (email/password)', 'Within 30 days (email request required)'],
                ].map(([type, timing]) => (
                  <tr key={type} className="text-gray-700">
                    <td className="px-4 py-3">{type}</td>
                    <td className="px-4 py-3 text-gray-500">{timing}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-500">
            Hisabify does not sell or share your personal financial data with third parties.
            No financial data is retained after deletion. Anonymous, aggregated analytics
            (e.g. crash reports) that cannot identify you personally may be retained for
            service improvement.
          </p>
        </section>

        {/* Retention note */}
        <section className="flex gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
          <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 space-y-1">
            <p className="font-semibold">Data Retention</p>
            <p className="text-xs leading-relaxed">
              In-app deletion removes your financial data immediately from our servers with no
              retention period. Login credential removal via email is processed within 30 days.
              Backups that include your data are purged within 90 days of the deletion request
              as part of our standard backup rotation schedule.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-200 pt-6 text-xs text-gray-400 space-y-1">
          <p>
            Questions? Contact us at{' '}
            <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="text-blue-500 underline">
              {LEGAL_CONTACT_EMAIL}
            </a>
          </p>
          <p>Hisabify is developed by Synark Labs · <a href="/privacy" className="text-blue-500 underline">Privacy Policy</a></p>
        </footer>
      </main>
    </div>
  );
}
