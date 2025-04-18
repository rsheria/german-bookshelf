import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export function useBookFilters() {
  const [categories, setCategories] = useState<string[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error|null>(null);

  useEffect(() => {
    async function fetchFilters() {
      setLoading(true);
      setError(null);
      try {
        // Fetch all genres (categories)
        const { data: genreData, error: genreError } = await supabase
          .from('books')
          .select('genre, published_date');
        if (genreError) throw genreError;
        if (!genreData) return;

        // Extract and clean categories from all genres
        const catSet = new Set<string>();
        const yearSet = new Set<number>();
        genreData.forEach((row: any) => {
          // --- Categories ---
          if (row.genre) {
            row.genre
              .replace(/Kindle eBooks/gi, '')
              .split(/>|&|,|\//)
              .map((p: string) => p.trim())
              .filter(Boolean)
              .map((p: string) => p.replace(/\(\d+\)$/g, '').trim().toLowerCase())
              .filter((p: string, i: number, arr: string[]) => p && arr.indexOf(p) === i && p !== 'kindle ebooks')
              .forEach((cat: string) => catSet.add(cat));
          }
          // --- Years ---
          if (row.published_date) {
            const year = new Date(row.published_date).getFullYear();
            if (!isNaN(year)) yearSet.add(year);
          }
        });
        setCategories(Array.from(catSet));
        setYears(Array.from(yearSet).sort((a, b) => b - a));
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch filters'));
      } finally {
        setLoading(false);
      }
    }
    fetchFilters();
  }, []);

  return { categories, years, loading, error };
}
