import { describe, it, expect } from 'vitest';
import { suggestCategory, merchantPatterns } from '../categoryClassifier';

describe('Category Classifier - Rule-Based Suggestions', () => {
  describe('Dining Category', () => {
    it('should classify "Starbucks" as Dining', async () => {
      const result = await suggestCategory('Starbucks');
      expect(result).not.toBeNull();
      expect(result?.categoryName).toBe('Dining');
      expect(result?.confidence).toBeGreaterThanOrEqual(0.6);
    });

    it('should classify "Pizza Hut" as Dining', async () => {
      const result = await suggestCategory('Pizza Hut');
      expect(result?.categoryName).toBe('Dining');
    });

    it('should classify "Restaurant" as Dining', async () => {
      const result = await suggestCategory('Restaurant');
      expect(result?.categoryName).toBe('Dining');
    });
  });

  describe('Groceries Category', () => {
    it('should classify "Whole Foods" as Groceries', async () => {
      const result = await suggestCategory('Whole Foods');
      expect(result?.categoryName).toBe('Groceries');
    });

    it('should classify "Safeway" as Groceries', async () => {
      const result = await suggestCategory('Safeway');
      expect(result?.categoryName).toBe('Groceries');
    });
  });

  describe('Transportation Category', () => {
    it('should classify "Uber" as Transportation', async () => {
      const result = await suggestCategory('Uber');
      expect(result?.categoryName).toBe('Transportation');
    });

    it('should classify "Shell Gas" as Transportation', async () => {
      const result = await suggestCategory('Shell Gas');
      expect(result?.categoryName).toBe('Transportation');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty merchant', async () => {
      const result = await suggestCategory('');
      expect(result).toBeNull();
    });

    it('should handle non-matching merchant', async () => {
      const result = await suggestCategory('zzzzzzabc123');
      expect(result).toBeNull();
    });

    it('should be case-insensitive', async () => {
      const result1 = await suggestCategory('STARBUCKS');
      const result2 = await suggestCategory('starbucks');
      expect(result1?.categoryName).toBe(result2?.categoryName);
    });
  });

  describe('Merchant Patterns Structure', () => {
    it('should have patterns for all major categories', () => {
      const expectedCategories = [
        'Dining',
        'Groceries',
        'Transportation',
      ];

      expectedCategories.forEach(category => {
        expect(merchantPatterns[category]).toBeDefined();
        expect(Array.isArray(merchantPatterns[category])).toBe(true);
      });
    });
  });

  describe('Source Attribution', () => {
    it('should mark rule-based suggestions correctly', async () => {
      const result = await suggestCategory('Starbucks');
      expect(result?.source).toBe('rule');
    });
  });
});
