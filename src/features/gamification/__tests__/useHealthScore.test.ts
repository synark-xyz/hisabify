import { describe, it, expect } from 'vitest';
import { calculateHealthScore } from '../utils/healthScoreLogic';

describe('calculateHealthScore', () => {
    it('should return 100 for perfect financial behavior', () => {
        const score = calculateHealthScore({
            totalSpent: 0,
            totalBudget: 1000,
            currentSavings: 1000,
            targetSavings: 1000,
            lastActiveAt: new Date().toISOString()
        });
        expect(score.total).toBe(100);
    });

    it('should return a high score for staying well under budget', () => {
        const score = calculateHealthScore({
            totalSpent: 200,
            totalBudget: 1000,
            currentSavings: 1000,
            targetSavings: 1000,
            lastActiveAt: new Date().toISOString()
        });
        // Budget score: 40% of (100 - 20) = 32
        // Savings score: 30% of 100 = 30
        // Activity score: 30% of 100 = 30
        // Total: 92
        expect(score.total).toBe(92);
    });

    it('should penalize overspending budget', () => {
        const score = calculateHealthScore({
            totalSpent: 1200,
            totalBudget: 1000,
            currentSavings: 1000,
            targetSavings: 1000,
            lastActiveAt: new Date().toISOString()
        });
        // Budget score: max(0, 100 - 120) = 0
        // Total: 0 + 30 + 30 = 60
        expect(score.total).toBe(60);
    });

    it('should reflect savings progress', () => {
        const score = calculateHealthScore({
            totalSpent: 0,
            totalBudget: 1000,
            currentSavings: 500,
            targetSavings: 1000,
            lastActiveAt: new Date().toISOString()
        });
        // Budget: 40
        // Savings: 30% of 50 = 15
        // Activity: 30
        // Total: 85
        expect(score.total).toBe(85);
    });

    it('should decay score based on inactivity', () => {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const score = calculateHealthScore({
            totalSpent: 0,
            totalBudget: 1000,
            currentSavings: 1000,
            targetSavings: 1000,
            lastActiveAt: threeDaysAgo.toISOString()
        });
        // Budget: 40
        // Savings: 30
        // Activity: 100 - (3 * 10) = 70. 30% of 70 = 21
        // Total: 40 + 30 + 21 = 91
        expect(score.total).toBe(91);
    });

    it('should handle zero budget gracefully', () => {
        const score = calculateHealthScore({
            totalSpent: 100,
            totalBudget: 0,
            currentSavings: 1000,
            targetSavings: 1000,
            lastActiveAt: new Date().toISOString()
        });
        // Budget score should default to something neutral or 0 if spending exists
        expect(score.total).toBeLessThan(100);
        expect(score.total).toBeGreaterThan(0);
    });
});
