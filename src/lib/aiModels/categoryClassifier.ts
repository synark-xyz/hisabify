import { SuggestedCategory, CategorySample } from '@/types/localAI';
import { logger } from '@/lib/logger';

/**
 * Merchant patterns for rule-based categorization
 * These are fallback patterns when embedding similarity is not available or confidence is low
 */
export const merchantPatterns: Record<string, string[]> = {
  'Dining': [
    'restaurant', 'cafe', 'coffee', 'starbucks', 'pizza', 'burger', 'mcdonalds',
    'subway', 'taco', 'sushi', 'bar', 'pub', 'diner', 'grill', 'kitchen',
    'bistro', 'lounge', 'steakhouse', 'bbq', 'brunch', 'lunch', 'dinner',
    'doordash', 'uber eats', 'grubhub', 'postmates', 'delivery',
  ],
  'Groceries': [
    'whole foods', 'safeway', 'kroger', 'trader joes', 'costco', 'sprouts',
    'instacart', 'waitrose', 'tesco', 'sainsbury', 'asda', 'morrisons',
    'supermarket', 'grocery', 'market', 'store', 'organic', 'farm fresh',
  ],
  'Transportation': [
    'uber', 'lyft', 'taxi', 'gas', 'chevron', 'shell', 'bp', 'exxon',
    'parking', 'transit', 'bus', 'train', 'metro', 'airline', 'flight',
    'delta', 'united', 'southwest', 'american airlines', 'car rental',
    'hertz', 'avis', 'enterprise', 'maintenance', 'repair', 'wash',
  ],
  'Entertainment': [
    'netflix', 'spotify', 'disney', 'hulu', 'cinema', 'movie', 'theater',
    'concert', 'ticket', 'music', 'game', 'steam', 'playstation',
    'xbox', 'nintendo', 'amazon prime', 'apple tv', 'museum', 'zoo',
    'theme park', 'amusement', 'comedy', 'show', 'podcast',
  ],
  'Utilities': [
    'electric', 'gas', 'water', 'internet', 'verizon', 'at&t', 'comcast',
    'spectrum', 'power', 'utility', 'phone', 'mobile', 'wireless',
  ],
  'Health & Fitness': [
    'gym', 'fitness', 'yoga', 'pilates', 'trainer', 'health', 'doctor',
    'hospital', 'clinic', 'pharmacy', 'cvs', 'walgreens', 'medicine',
    'dental', 'dentist', 'dermatology', 'spa', 'massage', 'wellness',
  ],
  'Shopping': [
    'amazon', 'walmart', 'target', 'costco', 'mall', 'store', 'shop',
    'retail', 'clothing', 'fashion', 'apparel', 'shoes', 'nike',
    'adidas', 'apple', 'best buy', 'electronics', 'departmentstore',
  ],
  'Travel': [
    'hotel', 'airbnb', 'booking', 'expedia', 'travel', 'vacation',
    'resort', 'motel', 'hostel', 'lodging', 'accommodation',
  ],
  'Finance': [
    'bank', 'credit card', 'loan', 'investment', 'stocks', 'trading',
    'insurance', 'premium', 'fee', 'charge', 'interest', 'mortgage',
  ],
};

/**
 * Suggest a category for a merchant using rule-based matching
 */
function ruleBasedSuggest(merchant: string): SuggestedCategory | null {
  const normalizedMerchant = merchant.toLowerCase().trim();

  let bestMatch: SuggestedCategory | null = null;
  let highestScore = 0;

  for (const [categoryName, patterns] of Object.entries(merchantPatterns)) {
    for (const pattern of patterns) {
      if (normalizedMerchant.includes(pattern) || pattern.includes(normalizedMerchant)) {
        // Exact substring match has higher confidence
        const isExactMatch = pattern === normalizedMerchant || normalizedMerchant === pattern;
        const score = isExactMatch ? 0.95 : 0.70;

        if (score > highestScore) {
          highestScore = score;
          bestMatch = {
            categoryId: categoryName.toLowerCase().replace(/\s+/g, '_'),
            categoryName,
            confidence: score,
            source: 'rule',
          };
        }
      }
    }
  }

  return bestMatch;
}

/**
 * Suggest a category for a merchant using embedding similarity
 */
async function embeddingBasedSuggest(
  merchant: string,
  categorySamples: CategorySample[],
  findSimilarCategory: (merchant: string, samples: Map<string, any>) => Promise<SuggestedCategory | null>
): Promise<SuggestedCategory | null> {
  if (categorySamples.length === 0) {
    return null;
  }

  try {
    // Build samples map with category names
    const samplesMap = new Map<string, any>();
    const categoryNameMap = new Map<string, string>();

    for (const sample of categorySamples) {
      if (sample.embedding) {
        const key = `${sample.category_id}-${sample.merchant}`;
        samplesMap.set(key, {
          categoryId: sample.category_id,
          categoryName: getCategoryDisplayName(sample.category_id),
          embedding: sample.embedding,
        });
        categoryNameMap.set(sample.category_id, getCategoryDisplayName(sample.category_id));
      }
    }

    if (samplesMap.size === 0) {
      return null;
    }

    return await findSimilarCategory(merchant, samplesMap);
  } catch (err) {
    logger.warn('Embedding-based suggestion failed', err);
    return null;
  }
}

/**
 * Get display name for a category ID
 */
function getCategoryDisplayName(categoryId: string): string {
  const names: Record<string, string> = {
    dining: 'Dining',
    groceries: 'Groceries',
    transportation: 'Transportation',
    entertainment: 'Entertainment',
    utilities: 'Utilities',
    'health_fitness': 'Health & Fitness',
    shopping: 'Shopping',
    travel: 'Travel',
    finance: 'Finance',
  };

  return names[categoryId.toLowerCase()] || categoryId;
}

/**
 * Main function to suggest a category
 */
export async function suggestCategory(
  merchant: string,
  categorySamples: CategorySample[] = [],
  confidenceThreshold: number = 0.6,
  options?: {
    findSimilarCategory?: (merchant: string, samples: Map<string, any>) => Promise<SuggestedCategory | null>;
  }
): Promise<SuggestedCategory | null> {
  if (!merchant.trim()) {
    return null;
  }

  try {
    // Try rule-based first (fast, 0-5ms)
    const ruleSuggestion = ruleBasedSuggest(merchant);
    if (ruleSuggestion && ruleSuggestion.confidence >= confidenceThreshold) {
      return ruleSuggestion;
    }

    // Fall back to embedding-based if available
    if (categorySamples.length > 0 && options?.findSimilarCategory) {
      const embeddingSuggestion = await embeddingBasedSuggest(
        merchant,
        categorySamples,
        options.findSimilarCategory
      );

      if (embeddingSuggestion && embeddingSuggestion.confidence >= confidenceThreshold) {
        return embeddingSuggestion;
      }
    }

    // Return rule-based suggestion even if below threshold (better than nothing)
    if (ruleSuggestion) {
      return ruleSuggestion;
    }

    return null;
  } catch (err) {
    logger.error('Category suggestion failed', err);
    return null;
  }
}

/**
 * Batch suggest categories for multiple merchants
 */
export async function suggestCategoriesBatch(
  merchants: string[],
  categorySamples: CategorySample[] = [],
  confidenceThreshold: number = 0.6,
  options?: {
    findSimilarCategory?: (merchant: string, samples: Map<string, any>) => Promise<SuggestedCategory | null>;
  }
): Promise<(SuggestedCategory | null)[]> {
  return Promise.all(
    merchants.map(merchant =>
      suggestCategory(merchant, categorySamples, confidenceThreshold, options).catch(err => {
        logger.warn(`Failed to suggest category for ${merchant}`, err);
        return null;
      })
    )
  );
}

/**
 * Get all available categories
 */
export function getAvailableCategories(): { id: string; name: string }[] {
  return Object.entries(merchantPatterns).map(([name]) => ({
    id: name.toLowerCase().replace(/\s+/g, '_'),
    name,
  }));
}
