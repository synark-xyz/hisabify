export const FREE_HISTORY_DAYS = 30;

export type FeatureKey =
  | 'history_extended'
  | 'analytics_custom_range'
  | 'report_export'
  | 'transaction_receipt_ocr';

export interface EntitlementContext {
  isPremium: boolean;
}

export function canUseFeature(context: EntitlementContext, feature: FeatureKey): boolean {
  if (context.isPremium) {
    return true;
  }

  switch (feature) {
    case 'history_extended':
    case 'analytics_custom_range':
    case 'report_export':
    case 'transaction_receipt_ocr':
      return false;
    default:
      return false;
  }
}
