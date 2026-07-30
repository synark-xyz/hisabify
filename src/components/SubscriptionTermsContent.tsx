// src/components/SubscriptionTermsContent.tsx

import { LegalSection } from '@/lib/legalContent';

export function SubscriptionTermsContent() {
  const LEGAL_CONTACT_EMAIL = 'synarklabs@gmail.com';

  return (
    <div className="space-y-5">
      <LegalSection title="1. Subscription Model">
        <p>
          Hisabify offers three options: Free tier (limited features), Premium subscription
          (recurring monthly or yearly), and optional in-app purchases (premium credits).
        </p>
        <p>
          <strong>Auto-Renewal:</strong> Premium subscriptions automatically renew unless you
          cancel. You are responsible for cancellation. Cancellation takes effect at the end of
          your current billing period.
        </p>
      </LegalSection>

      <LegalSection title="2. Free Trial Period">
        <p>
          <strong>Trial Duration:</strong> New premium subscribers receive a 7-day free trial.
        </p>
        <p>
          <strong>Trial Benefits:</strong> All premium features are fully accessible during the
          trial period.
        </p>
        <p>
          <strong>No Payment During Trial:</strong> You will not be charged during the 7-day
          trial.
        </p>
        <p>
          <strong>Automatic Charge:</strong> On Day 8 (at the same time you subscribed), your
          payment method will be automatically charged for the first recurring billing period (30
          or 365 days, depending on your plan choice).
        </p>
        <p>
          <strong>Cancellation Before Trial Ends:</strong> To cancel before trial ends and avoid
          charges, go to Settings → Subscription → Cancel. No questions asked. No charges will
          be applied.
        </p>
        <p>
          <strong>One Trial Per Account:</strong> Trial is available once per account. If you
          cancel and reactivate, the trial will not restart.
        </p>
      </LegalSection>

      <LegalSection title="3. Cancellation & Refund Policy">
        <p>
          <strong>Full Refund (Within 7 Days):</strong> If you request a refund within 7 days of
          purchase, you receive 100% of your payment back, no questions asked.
        </p>
        <p>
          <strong>Partial Refund (Days 8-30):</strong> If you request a refund between days 8
          and 30 after purchase, you receive a prorated refund based on days remaining in your
          billing period.
        </p>
        <p>
          <strong>Example:</strong> If you purchase a $10 monthly subscription on Day 1 and
          request a refund on Day 15, you receive approximately $5 (50% of days remaining: 15 ÷
          30 = 50%).
        </p>
        <p>
          <strong>No Refund (After 30 Days):</strong> Refund requests submitted after 30 days
          from purchase are not eligible for refund. Subscription continues auto-renewing.
        </p>
        <p>
          <strong>Refund Processing Time:</strong> Approved refunds are processed within 5-10
          business days to your original payment method.
        </p>
        <p>
          <strong>Exceptions (No Refund):</strong>
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>
            Premium features substantially used or accessed (e.g., downloaded export files,
            generated reports)
          </li>
          <li>Account deleted by you after subscription purchase</li>
          <li>Account canceled by us due to Terms of Service violations</li>
          <li>In-app purchases (one-time, non-refundable except for defects)</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Billing & Payment">
        <p>
          <strong>Payment Authorization:</strong> By purchasing a subscription, you authorize us
          to charge your payment method for recurring subscription fees.
        </p>
        <p>
          <strong>Billing Cycle:</strong> Subscriptions automatically renew on the anniversary of
          your purchase date each month or year (depending on your plan).
        </p>
        <p>
          <strong>Failed Payments:</strong> If your payment fails:
        </p>
        <ol className="list-decimal pl-4 space-y-1">
          <li>We retry the charge within 5 days (up to 3 attempts)</li>
          <li>If all retries fail, your subscription is suspended until payment succeeds</li>
          <li>You will receive email notifications for each failed attempt</li>
          <li>Premium features become inaccessible when suspended</li>
        </ol>
        <p>
          <strong>Payment Restoration:</strong> Update your payment method in Settings → Billing
          to reactivate your subscription immediately.
        </p>
        <p>
          <strong>Price Changes:</strong> We may change subscription pricing anytime. 30 days'
          notice required before price increases take effect. Continued use after notice
          constitutes acceptance of the new price.
        </p>
        <p>
          <strong>Grandfathering:</strong> Existing subscribers may be grandfathered into the old
          price for their current billing cycle; new subscribers and renewals reflect the new
          price.
        </p>
      </LegalSection>

      <LegalSection title="5. Chargebacks & Disputes (Anti-Fraud)">
        <p>
          <strong>IMPORTANT:</strong> If you dispute a charge with your bank or payment processor
          instead of requesting a refund from us, we consider this a serious breach of trust.
        </p>
        <p>
          <strong>First Chargeback:</strong> Your account will be flagged. We may require
          additional verification or documentation for future purchases.
        </p>
        <p>
          <strong>Second Chargeback:</strong> Your account will be suspended. Future purchases
          will be blocked.
        </p>
        <p>
          <strong>Persistent Chargebacks:</strong> Your account will be terminated permanently.
          All access to Hisabify is revoked.
        </p>
        <p>
          <strong>Why This Policy:</strong> Chargebacks damage our payment processor relationships
          and increase fees for all users. Always contact us first at{' '}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="underline">
            {LEGAL_CONTACT_EMAIL}
          </a>{' '}
          before disputing a charge with your bank.
        </p>
        <p>
          <strong>We Want to Help:</strong> If there's a billing issue, we'll resolve it quickly.
          Email us instead of disputing.
        </p>
      </LegalSection>

      <LegalSection title="6. Premium Feature Access Control">
        <p>
          <strong>Active Subscription Required:</strong> Premium features are available only to
          users with active premium subscriptions.
        </p>
        <p>
          <strong>If Subscription Lapses:</strong> When your subscription expires or is canceled:
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Premium features become inaccessible</li>
          <li>
            Historical data remains viewable (you don't lose transactions, budgets, or goals)
          </li>
          <li>Premium analytics, reports, and exports require active subscription to download</li>
        </ul>
        <p>
          <strong>Upon Resubscription:</strong> All premium features are immediately restored
          when you renew or purchase a new subscription.
        </p>
      </LegalSection>

      <LegalSection title="7. Account Deletion & Premium Credits">
        <p>
          <strong>Account Deletion:</strong> If you delete your account, all unused premium
          credits are forfeited with no refund.
        </p>
        <p>
          <strong>No Recovery:</strong> Once a deletion request is approved, credits cannot be
          recovered. Deletion is permanent within 30 days of your original request.
        </p>
        <p>
          <strong>Store Subscriptions:</strong> Deleting your account does not cancel an active
          Google Play or App Store subscription, and does not trigger a refund. Cancel your
          subscription separately through the store before requesting deletion if you want to
          stop being billed.
        </p>
        <p>
          <strong>Refund + Deletion Sequence:</strong> If you request both a refund AND account
          deletion:
        </p>
        <ol className="list-decimal pl-4 space-y-1">
          <li>We issue the refund first</li>
          <li>Your account deletion request is then submitted for review, per the process described above</li>
          <li>All data is deleted within 30 days of your original request, once approved</li>
        </ol>
        <p>
          This prevents "refund + keep the data" abuse.
        </p>
      </LegalSection>

      <LegalSection title="8. Premium Credits Policy">
        <p>
          <strong>What Are Credits?</strong> Premium credits are one-time in-app purchases (e.g.,
          "$5 for 500 credits") that unlock premium features and one-time actions.
        </p>
        <p>
          <strong>Purchase & Usage:</strong>
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Non-refundable once purchased (except for defects or non-delivery)</li>
          <li>Apply to your account only; cannot transfer or share with other users</li>
          <li>Each feature displays its credit cost before you commit to using it</li>
          <li>Credits deducted immediately upon feature use</li>
          <li>
            Partial usage: If a feature costs 100 credits and you have 150, you'll have 50
            remaining after use
          </li>
        </ul>
        <p>
          <strong>Credit Expiration:</strong>
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>
            <strong>Expiration Date:</strong> All credits expire 12 months after purchase if
            unused
          </li>
          <li>
            <strong>Definition of "Unused":</strong> Not yet applied to a feature purchase
          </li>
          <li>Expired credits cannot be restored or refunded</li>
          <li>
            We send email reminders 30 days and 7 days before expiration as a courtesy
          </li>
          <li>Accepting reminder emails = acknowledgment of expiration policy</li>
        </ul>
        <p>
          <strong>Refunds for Defects:</strong> If a feature didn't work or credits didn't apply
          correctly, email us within 7 days at{' '}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="underline">
            {LEGAL_CONTACT_EMAIL}
          </a>{' '}
          with proof. We'll issue a full refund or credit restoration.
        </p>
        <p>
          <strong>No Refund for Remorse:</strong> If you purchased credits but changed your mind
          before using them, no refund. However, you have 12 months to use them on any premium
          feature.
        </p>
        <p>
          <strong>Feature Deprecation:</strong> If we sunset (discontinue) a premium feature that
          required credits:
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>We restore any unused credits for that feature</li>
          <li>
            Restored credits can be used on other premium features (not refunded as cash)
          </li>
          <li>We give 30 days' notice before discontinuing a feature</li>
        </ul>
        <p>
          <strong>Promotional Credits:</strong> Bonus credits from promotions follow the same
          12-month expiration policy. They are:
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Non-transferable</li>
          <li>Cannot be cashed out</li>
          <li>Subject to expiration and the same usage rules as purchased credits</li>
          <li>
            Abuse of promotional offers (e.g., creating multiple accounts to farm free credits)
            may result in removal of bonus credits and account suspension
          </li>
        </ul>
        <p>
          <strong>Pricing Changes:</strong> We may change credit pricing anytime. New credit
          pricing takes effect immediately for new purchases. Existing unused credits are honored
          at the old prices you paid.
        </p>
      </LegalSection>

      <LegalSection title="9. In-App Purchases (One-Time Transactions)">
        <p>
          <strong>Definition:</strong> In-app purchases are non-refundable one-time transactions
          (e.g., premium credits, one-time feature unlocks).
        </p>
        <p>
          <strong>Credit Expiration:</strong> Credits purchased expire 12 months after purchase
          if unused.
        </p>
        <p>
          <strong>Non-Transferable:</strong> Credits cannot be transferred to other accounts or
          sold.
        </p>
        <p>
          <strong>Feature Deprecation:</strong> We reserve the right to adjust, deprecate, or
          discontinue premium features at any time. Upon deprecation, unused credits for that
          feature are restored (not refunded as cash).
        </p>
        <p>
          <strong>Non-Refundable Exception:</strong> One-time purchases are non-refundable except
          when a feature is defective or fails to deliver the promised functionality.
        </p>
      </LegalSection>

      <LegalSection title="10. Billing Disputes Process (Fair Process)">
        <p>
          <strong>Step 1: Contact Us</strong>
        </p>
        <p>
          Email{' '}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="underline">
            {LEGAL_CONTACT_EMAIL}
          </a>{' '}
          with "Billing Dispute" in the subject line. Include: your user ID, transaction date,
          the transaction amount, and a brief description of the issue.
        </p>
        <p>
          <strong>Step 2: Initial Response</strong>
        </p>
        <p>
          We will respond within 5 business days with acknowledgment, initial assessment, and
          next steps.
        </p>
        <p>
          <strong>Step 3: Resolution or Explanation</strong>
        </p>
        <p>
          If we agree an error occurred, we issue a refund or credit within 10 business days to
          your original payment method. If we disagree, we provide a detailed explanation with
          evidence supporting our position.
        </p>
        <p>
          <strong>Step 4: Escalation if Unresolved</strong>
        </p>
        <p>
          If the dispute remains unresolved, it proceeds to binding arbitration per our Terms of
          Service § 12 (Singapore International Arbitration Centre rules).
        </p>
      </LegalSection>

      <LegalSection title="11. Contact for Subscription Issues">
        <p>
          For subscription, billing, or refund questions, email{' '}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="underline">
            {LEGAL_CONTACT_EMAIL}
          </a>
          . Subject line: "Subscription Issue" or "Billing Dispute". Response time: 5 business
          days.
        </p>
      </LegalSection>

      <p className="text-[10px] text-muted-foreground pt-4 text-center">
        Last updated: July 2026
      </p>
    </div>
  );
}
