import { useTranslation } from 'react-i18next';
import { Trash2, SmartphoneNfc, Mail, ShieldCheck, Clock } from 'lucide-react';
import { LEGAL_CONTACT_EMAIL } from '@/lib/legalContent';

const deleteDataItems = [
  { key: 'transactionsExpenses', timingKey: 'immediately' },
  { key: 'budgets', timingKey: 'immediately' },
  { key: 'cardsAccounts', timingKey: 'immediately' },
  { key: 'savingsGoals', timingKey: 'immediately' },
  { key: 'paymentReminders', timingKey: 'immediately' },
  { key: 'recurringExpenses', timingKey: 'immediately' },
  { key: 'reportTemplates', timingKey: 'immediately' },
  { key: 'profilePreferences', timingKey: 'immediately' },
  { key: 'loginCredentials', timingKey: 'within30Days' },
];

export function DeleteAccountPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      {/* Header */}
      <header className="border-b border-gray-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
            <Trash2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-bold text-gray-900">{t('common.hisabify')}</span>
            <span className="text-gray-400 text-sm ml-2">{t('deleteAccount.bySynark')}</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-10">
        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('deleteAccount.title')}</h1>
          <p className="mt-2 text-gray-500 text-sm leading-relaxed">
            {t('deleteAccount.desc')}
          </p>
        </div>

        {/* Method 1 — In-App */}
        <section className="border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <SmartphoneNfc className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{t('deleteAccount.method1.title')}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{t('deleteAccount.method1.desc')}</p>
            </div>
          </div>

          <ol className="space-y-3 text-sm text-gray-700">
            <li className="flex gap-3">
              <span className="w-5 h-5 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
              <span>{t('deleteAccount.method1.step1')}</span>
            </li>
            <li className="flex gap-3">
              <span className="w-5 h-5 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
              <span>{t('deleteAccount.method1.step2')}</span>
            </li>
            <li className="flex gap-3">
              <span className="w-5 h-5 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
              <span>{t('deleteAccount.method1.step3')}</span>
            </li>
            <li className="flex gap-3">
              <span className="w-5 h-5 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
              <span>{t('deleteAccount.method1.step4')}</span>
            </li>
            <li className="flex gap-3">
              <span className="w-5 h-5 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center flex-shrink-0 mt-0.5">5</span>
              <span>{t('deleteAccount.method1.step5')}</span>
            </li>
          </ol>

          <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-4 py-3">
            {t('deleteAccount.method1.note')}
          </p>
        </section>

        {/* Method 2 — Email */}
        <section className="border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{t('deleteAccount.method2.title')}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{t('deleteAccount.method2.desc')}</p>
            </div>
          </div>

          <ol className="space-y-3 text-sm text-gray-700">
            <li className="flex gap-3">
              <span className="w-5 h-5 bg-orange-500 text-white rounded-full text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
              <span>
                {t('deleteAccount.method2.step1', { email: LEGAL_CONTACT_EMAIL })}
              </span>
            </li>
            <li className="flex gap-3">
              <span className="w-5 h-5 bg-orange-500 text-white rounded-full text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
              <span>{t('deleteAccount.method2.step2')}</span>
            </li>
            <li className="flex gap-3">
              <span className="w-5 h-5 bg-orange-500 text-white rounded-full text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
              <span>{t('deleteAccount.method2.step3')}</span>
            </li>
          </ol>

          <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-4 py-3">
            {t('deleteAccount.method2.note')}
          </p>
        </section>

        {/* What gets deleted */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-green-600" />
            <h2 className="font-semibold text-gray-900">{t('deleteAccount.whatGetsDeleted.title')}</h2>
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
                {deleteDataItems.map((item) => (
                  <tr key={item.key} className="text-gray-700">
                    <td className="px-4 py-3">{t(`deleteAccount.whatGetsDeleted.${item.key}`)}</td>
                    <td className="px-4 py-3 text-gray-500">{t(`deleteAccount.whatGetsDeleted.${item.timingKey}`)}</td>
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
            <p className="font-semibold">{t('deleteAccount.dataRetention.title')}</p>
            <p className="text-xs leading-relaxed">
              {t('deleteAccount.dataRetention.desc')}
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-200 pt-6 text-xs text-gray-400 space-y-1">
          <p>
            {t('deleteAccount.footer.questions', { email: LEGAL_CONTACT_EMAIL })}
          </p>
          <p>
            {t('common.hisabify')} {t('deleteAccount.bySynark')} · <a href="/privacy" className="text-blue-500 underline">{t('page.privacyPolicy')}</a>
          </p>
        </footer>
      </main>
    </div>
  );
}