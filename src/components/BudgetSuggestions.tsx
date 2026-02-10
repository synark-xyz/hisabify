interface BudgetSuggestion {
  budgetName: string;
  categoryId: string | null;
  remaining: number;
  icon?: string;
  color?: string;
}

interface BudgetSuggestionsProps {
  suggestions: BudgetSuggestion[];
  onSelect: (categoryId: string | null) => void;
}

export function BudgetSuggestions({ suggestions, onSelect }: BudgetSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="mb-4">
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Quick pick from active budgets:</p>
      <div className="flex gap-2 flex-wrap">
        {suggestions.map((s, index) => (
          <button
            key={`${s.categoryId}-${index}`}
            type="button"
            onClick={() => onSelect(s.categoryId)}
            className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {s.icon && <span className="text-lg">{s.icon}</span>}
            <div className="text-left">
              <p className="text-sm font-medium">{s.budgetName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">${s.remaining.toFixed(2)} left</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
