import { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocalAI } from '@/hooks/useLocalAI';
import { useLocalDB } from '@/hooks/useLocalDB';
import { useAIPreferences } from '@/hooks/useAIPreferences';
import { suggestCategory } from '@/lib/aiModels/categoryClassifier';
import { SuggestedCategory } from '@/types/localAI';
import { logger } from '@/lib/logger';

export interface AICategorySuggestionHandle {
  getSuggestion: () => Promise<void>;
  isLoading: boolean;
}

interface AICategorySuggestionProps {
  merchant: string;
  confidenceThreshold?: number;
  onSelect: (categoryId: string, categoryName: string) => void;
  disabled?: boolean;
  /**
   * If true, suggestions only appear on manual trigger via ref
   * If false, shows suggestion automatically after typing (debounced)
   */
  manual?: boolean;
}

/**
 * Component that shows AI category suggestion chip below merchant input
 * Falls back to rule-based categorization if local DB is unavailable
 * 
 * Can be used in two modes:
 * 1. Auto mode (manual=false): Shows suggestion after 300ms of inactivity (default)
 * 2. Manual mode (manual=true): Only shows when getSuggestion() is called via ref
 */
export const AICategorySuggestion = forwardRef<
  AICategorySuggestionHandle,
  AICategorySuggestionProps
>(
  (
    {
      merchant,
      confidenceThreshold: thresholdOverride,
      onSelect,
      disabled = false,
      manual = false,
    },
    ref
  ) => {
    const [suggestion, setSuggestion] = useState<SuggestedCategory | null>(null);
    const [loading, setLoading] = useState(false);
    const localAI = useLocalAI();
    const localDB = useLocalDB();
    const { confidenceThreshold: userThreshold } = useAIPreferences();
    const debounceTimerRef = useRef<NodeJS.Timeout>();

    const confidenceThreshold = thresholdOverride ?? userThreshold;

    /**
     * Get suggestion for merchant
     * Tries embedding-based first (if DB available), then falls back to rule-based
     */
    const getSuggestion = useCallback(async () => {
      if (!merchant.trim() || disabled) {
        setSuggestion(null);
        return;
      }

      try {
        setLoading(true);

        let samples = [];
        try {
          samples = await localDB.getCategorySamples();
        } catch (dbError) {
          logger.debug('Local DB samples unavailable (using rule-based only)', dbError);
        }

        const suggested = await suggestCategory(merchant, samples, confidenceThreshold, {
          findSimilarCategory: localAI.findSimilarCategory,
        });

        setSuggestion(suggested);
      } catch (err) {
        logger.debug('AI suggestion failed (non-critical)', err);
        setSuggestion(null);
      } finally {
        setLoading(false);
      }
    }, [merchant, confidenceThreshold, disabled, localDB, localAI]);

    /**
     * Expose getSuggestion via ref for manual triggering from parent
     */
    useImperativeHandle(
      ref,
      () => ({
        getSuggestion,
        isLoading: loading,
      }),
      [getSuggestion, loading]
    );

    /**
     * Auto mode: debounce suggestion fetching
     * Manual mode: do nothing (wait for ref call)
     */
    useEffect(() => {
      if (manual) {
        return;
      }

      // Clear previous timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new timer for faster feedback (300ms instead of 500ms)
      debounceTimerRef.current = setTimeout(() => {
        getSuggestion();
      }, 300);

      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
      };
    }, [merchant, getSuggestion, manual]);

    // Only render suggestion chip if we have one
    if (!merchant.trim() || !suggestion) {
      return null;
    }

    const confidencePercent = Math.round(suggestion.confidence * 100);
    const isHighConfidence = suggestion.confidence >= 0.8;
    const isMediumConfidence = suggestion.confidence >= 0.6;

    return (
      <button
        type="button"
        onClick={() => onSelect(suggestion.categoryId, suggestion.categoryName)}
        disabled={loading}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all',
          'border border-dashed',
          'text-sm font-medium',
          isHighConfidence && 'border-emerald-500/50 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10',
          isMediumConfidence && !isHighConfidence && 'border-amber-500/50 bg-amber-500/5 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10',
          !isMediumConfidence && 'border-slate-300/50 bg-slate-500/5 text-slate-600 dark:text-slate-400 hover:bg-slate-500/10',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        <Sparkles className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1 text-left">
          {loading ? 'Analyzing...' : `${suggestion.categoryName} (${confidencePercent}%)`}
        </span>
        <span
          className={cn(
            'text-xs font-bold px-2 py-0.5 rounded-lg',
            isHighConfidence && 'bg-emerald-500/20',
            isMediumConfidence && !isHighConfidence && 'bg-amber-500/20',
            !isMediumConfidence && 'bg-slate-500/20'
          )}
        >
          {suggestion.source === 'rule' ? 'Pattern' : 'Smart'}
        </span>
      </button>
    );
  }
);

AICategorySuggestion.displayName = 'AICategorySuggestion';

/**
 * Button component for manually triggering AI suggestions
 * Place next to merchant input field
 */
export function AISuggestionButton({
  onClick,
  isLoading = false,
  disabled = false,
  title = 'Get AI suggestion for this merchant',
}: {
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isLoading}
      title={title}
      className={cn(
        'p-2 rounded-lg transition-all duration-200',
        'text-slate-400 dark:text-slate-500',
        'hover:bg-slate-100 dark:hover:bg-slate-800',
        'hover:text-slate-600 dark:hover:text-slate-300',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'disabled:hover:bg-transparent disabled:hover:text-slate-400',
        isLoading && 'animate-spin'
      )}
    >
      <Sparkles className="w-5 h-5" />
    </button>
  );
}
