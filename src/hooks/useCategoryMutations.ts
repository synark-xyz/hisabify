import { supabase } from '@/integrations/supabase/client';
import { Category } from '@/types';

export interface AddCategoryInput {
  name: string;
  icon: string;
  color: string;
  type: 'expense' | 'income';
  parent_id?: string | null;
}

/**
 * Hook for category mutations (create, update, delete).
 * Handles optimistic updates and error handling.
 */
export function useCategoryMutations() {
  /**
   * Add a new custom category.
   * @param input Category data to insert
   * @returns The inserted Category row
   * @throws On Supabase error
   */
  const addCategory = async (input: AddCategoryInput): Promise<Category> => {
    const { name, icon, color, type, parent_id } = input;

    const { data, error } = await supabase
      .from('categories')
      .insert({
        name,
        icon,
        color,
        type,
        parent_id: parent_id || null,
        is_system_category: false,
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error('Failed to create category: no data returned');
    }

    return data as Category;
  };

  /**
   * Increment the usage count for a category.
   * Fire-and-forget operation: does not await, does not throw.
   * @param categoryId Category ID to increment usage count for
   */
  const incrementUsageCount = (categoryId: string): void => {
    // Fire-and-forget: silently swallow errors
    supabase
      .rpc('increment_category_usage_count', { p_category_id: categoryId })
      .catch(() => {
        // Silently ignore errors for fire-and-forget operation
      });
  };

  return {
    addCategory,
    incrementUsageCount,
  };
}
