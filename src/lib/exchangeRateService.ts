/**
 * Exchange Rate Background Service
 * Manages automatic currency rate updates every 24 hours
 */

const LAST_UPDATE_KEY = 'exchange-rate-last-update';
const UPDATE_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Common currency pairs to prefetch
const COMMON_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'INR', 'AUD', 'CAD', 'CHF', 'HKD'];

/**
 * Check if exchange rates need updating
 */
export function shouldUpdateRates(): boolean {
  const lastUpdate = localStorage.getItem(LAST_UPDATE_KEY);

  if (!lastUpdate) {
    return true;
  }

  const lastUpdateTime = parseInt(lastUpdate, 10);
  const now = Date.now();

  return (now - lastUpdateTime) >= UPDATE_INTERVAL;
}

/**
 * Mark exchange rates as updated
 */
export function markRatesUpdated(): void {
  localStorage.setItem(LAST_UPDATE_KEY, Date.now().toString());
}

/**
 * Start background exchange rate update service
 * Should be called once when the app initializes
 */
export async function startExchangeRateService(
  userCurrency: string,
  prefetchRates: (baseCurrency: string, targetCurrencies: string[]) => Promise<void>
): Promise<void> {
  // Check if we need to update
  if (!shouldUpdateRates()) {
    console.log('[Exchange Rate Service] Rates are up to date');
    return;
  }

  console.log('[Exchange Rate Service] Updating exchange rates...');

  try {
    // Prefetch rates from user's currency to common currencies
    const targetCurrencies = COMMON_CURRENCIES.filter(c => c !== userCurrency);
    await prefetchRates(userCurrency, targetCurrencies);

    // Also prefetch USD pairs (as USD is often a base currency)
    if (userCurrency !== 'USD') {
      await prefetchRates('USD', targetCurrencies);
    }

    // Mark as updated
    markRatesUpdated();

    console.log('[Exchange Rate Service] Exchange rates updated successfully');
  } catch (error) {
    console.error('[Exchange Rate Service] Failed to update exchange rates:', error);
  }
}

/**
 * Get time until next update (in ms)
 */
export function getTimeUntilNextUpdate(): number {
  const lastUpdate = localStorage.getItem(LAST_UPDATE_KEY);

  if (!lastUpdate) {
    return 0;
  }

  const lastUpdateTime = parseInt(lastUpdate, 10);
  const nextUpdateTime = lastUpdateTime + UPDATE_INTERVAL;
  const now = Date.now();

  return Math.max(0, nextUpdateTime - now);
}

/**
 * Get last update timestamp
 */
export function getLastUpdateTime(): Date | null {
  const lastUpdate = localStorage.getItem(LAST_UPDATE_KEY);

  if (!lastUpdate) {
    return null;
  }

  return new Date(parseInt(lastUpdate, 10));
}
