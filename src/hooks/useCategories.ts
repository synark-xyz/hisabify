import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Category } from '@/types';

/**
 * Centralized hook for fetching categories across the application.
 * Ensures consistent category fetching logic and caching.
 */
export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('categories')
        .select('*, translations:translations')
        .order('name', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      if (data) {
        // Cast to Category[] - translations column exists but may not be in generated types
        const categoriesData = data as unknown as Category[];
        const sorted = categoriesData.sort((a, b) => {
          const aSystem = a.is_system_category ? 1 : 0;
          const bSystem = b.is_system_category ? 1 : 0;

          if (aSystem !== bSystem) {
            return bSystem - aSystem;
          }

          return a.name.localeCompare(b.name);
        });
        setCategories(sorted);
      } else {
        setCategories([]);
      }
    } catch (err) {
      console.error('[useCategories] Error fetching categories:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch categories'));
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    loading,
    error,
    refetch: fetchCategories,
  };
}
