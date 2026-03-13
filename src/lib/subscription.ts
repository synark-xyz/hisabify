interface ResolvePremiumAccessParams {
  disableSubscriptionGating?: boolean;
  subscriptionType: 'base' | 'pro';
  subscriptionStatus: string;
  referralGrantedUntil: string | null;
  proAccessOverride: boolean | null;
  isSpecialUser?: boolean;
  now?: Date;
}

export function resolvePremiumAccess(params: ResolvePremiumAccessParams): boolean {
  if (params.disableSubscriptionGating) {
    return true;
  }

  if (params.proAccessOverride === true) {
    return true;
  }

  if (params.proAccessOverride === false) {
    return false;
  }

  const now = params.now || new Date();
  const hasActiveReferralGrant = params.referralGrantedUntil
    ? new Date(params.referralGrantedUntil) > now
    : false;

  return (
    (params.subscriptionType === 'pro' && params.subscriptionStatus === 'active') ||
    hasActiveReferralGrant ||
    Boolean(params.isSpecialUser)
  );
}
