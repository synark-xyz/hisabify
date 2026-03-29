/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AICategorySuggestion } from '../AICategorySuggestion';
import { useLocalAI } from '@/hooks/useLocalAI';
import { useLocalDB } from '@/hooks/useLocalDB';
import { useAIPreferences } from '@/hooks/useAIPreferences';
import { logger } from '@/lib/logger';

// Mock hooks
vi.mock('@/hooks/useLocalAI');
vi.mock('@/hooks/useLocalDB');
vi.mock('@/hooks/useAIPreferences');
vi.mock('@/lib/logger');

describe('AICategorySuggestion Component', () => {
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    mockOnSelect.mockClear();

    (useAIPreferences as any).mockReturnValue({
      confidenceThreshold: 0.6,
    });

    (useLocalAI as any).mockReturnValue({
      isReady: false,
      isLoading: false,
      error: null,
      getEmbedding: vi.fn(),
      findSimilarCategory: vi.fn(),
      cosineSimilarity: vi.fn(),
    });

    (useLocalDB as any).mockReturnValue({
      getCategorySamples: vi.fn().mockResolvedValue([]),
      query: vi.fn(),
      insertTransaction: vi.fn(),
      getUnsyncedData: vi.fn(),
      updateSynced: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should not render when merchant is empty', () => {
    const { container } = render(
      <AICategorySuggestion
        merchant=""
        onSelect={mockOnSelect}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render suggestion when merchant matches pattern', async () => {
    render(
      <AICategorySuggestion
        merchant="Starbucks"
        onSelect={mockOnSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Dining/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('should show confidence percentage', async () => {
    render(
      <AICategorySuggestion
        merchant="Pizza Restaurant"
        onSelect={mockOnSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/\d+%/)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('should handle DB error gracefully', async () => {
    (useLocalDB as any).mockReturnValue({
      getCategorySamples: vi
        .fn()
        .mockRejectedValue(new Error('DB not initialized')),
    });

    render(
      <AICategorySuggestion
        merchant="Starbucks"
        onSelect={mockOnSelect}
      />
    );

    // Should still show suggestion via rule-based matching
    await waitFor(() => {
      expect(screen.getByText(/Dining/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });
});
