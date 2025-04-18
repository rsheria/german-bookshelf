import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

type CategoryCounts = {
  [key: string]: number;
};

export function useCategories() {
  const [cats, setCats] = useState<CategoryCounts>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchCategories() {
      try {
        setLoading(true);
        const { data, error } = await supabase.from('books').select('*');

        if (error) throw error;

        // Extract categories from all books
        const categoryCount: CategoryCounts = {};
        data?.forEach(book => {
          // Process categories array
          if (book.categories && Array.isArray(book.categories)) {
            book.categories.forEach((cat: string) => {
              if (cat && typeof cat === 'string') {
                categoryCount[cat] = (categoryCount[cat] || 0) + 1;
              }
            });
          }
          
          // Process genre field
          if (book.genre) {
            const parts = book.genre.split(/[,\/>&]+/).map((p: string) => p.trim()).filter(Boolean);
            parts.forEach(part => {
              categoryCount[part] = (categoryCount[part] || 0) + 1;
            });
          }
        });

        setCats(categoryCount);
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    }

    fetchCategories();
  }, []);

  return { cats, loading, error };
}
