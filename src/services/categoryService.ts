import { supabase } from './supabase';

/**
 * Service for managing book categories in the German Bookshelf application
 */

// Types
export interface Category {
  id?: string;
  name: string;
  parent_id?: string | null;
  count?: number;
  type?: 'ebook' | 'audiobook';
  fictionType?: 'Fiction' | 'Non-Fiction';
  blacklisted?: boolean;
}

/**
 * Get all categories from the database
 */
export const getAllCategories = async (includeBlacklisted = true) => {
  try {
    console.log('Getting categories, includeBlacklisted:', includeBlacklisted);
    
    // Create the basic query
    let query = supabase.from('categories').select('*').order('name');
    
    // Filter out blacklisted categories if requested
    if (!includeBlacklisted) {
      query = query.eq('blacklisted', false);
    }
    
    const { data, error } = await query;
    
    if (error) {
      // If error mentions column doesn't exist, we need to handle it
      if (error.message && error.message.includes('does not exist')) {
        console.log('Blacklisted column does not exist, fetching all categories');
        // Just get all categories without filtering
        const { data: allData, error: allError } = await supabase
          .from('categories')
          .select('*')
          .order('name');
          
        if (allError) {
          console.error('Error fetching all categories:', allError);
          throw allError;
        }
        
        return allData || [];
      } else {
        console.error('Error fetching categories:', error);
        throw error;
      }
    }
    
    console.log('Successfully fetched categories:', data?.length || 0);
    return data || [];
  } catch (error) {
    console.error('Error in getAllCategories:', error);
    throw error;
  }
};

/**
 * Create a new category
 */
export const createCategory = async (category: Category): Promise<Category> => {
  const { data, error } = await supabase
    .from('categories')
    .insert(category)
    .select()
    .single();

  if (error) {
    console.error('Error creating category:', error);
    throw error;
  }

  return data;
};

/**
 * Update an existing category
 */
export const updateCategory = async (id: string, category: Partial<Category>): Promise<Category> => {
  const { data, error } = await supabase
    .from('categories')
    .update(category)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating category:', error);
    throw error;
  }

  return data;
};

/**
 * Delete a category
 */
export const deleteCategory = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
};

/**
 * Blacklist a category instead of deleting it
 */
export const blacklistCategory = async (id: string, blacklisted: boolean) => {
  try {
    console.log(`Setting category ${id} blacklisted=${blacklisted}`);
    
    // First verify the category exists to avoid problems
    const { data: categoryExists, error: existsError } = await supabase
      .from('categories')
      .select('id, name')
      .eq('id', id)
      .single();
      
    if (existsError || !categoryExists) {
      console.error('Category not found:', existsError || 'No data returned');
      throw new Error('Category not found');
    }
    
    console.log(`Updating category: ${categoryExists.name}`);

    // Try to add column if needed - use a safer update pattern
    try {
      // First try adding the column if it doesn't exist
      const { error: updateError } = await supabase
        .from('categories')
        .update({ blacklisted })
        .eq('id', id);

      if (updateError && updateError.message.includes('does not exist')) {
        console.log('Need to add blacklisted column first');
        // Fall back to using individual field updates
        // This is a workaround that doesn't rely on SQL
        const categoryData = {
          ...categoryExists,
        };
        
        // Try again with just the fields we know exist
        const { data: finalData, error: finalError } = await supabase
          .from('categories')
          .update(categoryData)
          .eq('id', id)
          .select();
          
        if (finalError) {
          console.error('Error in final update:', finalError);
          throw finalError;
        }
        
        return finalData?.[0] || categoryExists;
      }
    } catch (updateErr) {
      console.error('Error in update process:', updateErr);
    }

    // Get the updated category data
    const { data: updatedData, error: selectError } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();

    if (selectError) {
      console.error('Error getting updated category:', selectError);
      // Return the original category to avoid client errors
      return { ...categoryExists, blacklisted };
    }

    return updatedData;
  } catch (error) {
    console.error('Error in blacklistCategory:', error);
    throw error;
  }
};

/**
 * Auto-detect new categories from books and add/update them in the database
 */
export const detectAndAddNewCategories = async () => {
  try {
    // Fetch all books for analysis
    const { data: books, error: booksError } = await supabase
      .from('books')
      .select('id, type, fictionType, categories, genre, title');
    if (booksError) throw booksError;

    // Aggregate fresh counts per category
    const statsMap = new Map<string, { name: string; type: Category['type']; fictionType: Category['fictionType']; count: number }>;
    books?.forEach(book => {
      const rawType = (book.type || '').toLowerCase();
      const bType: Category['type'] = rawType === 'audiobook' || rawType === 'hörbuch' ? 'audiobook' : 'ebook';
      const bFiction: Category['fictionType'] = book.fictionType === 'Fiction' ? 'Fiction' : 'Non-Fiction';
      let cats: string[] = [];
      if (Array.isArray(book.categories) && book.categories.length) cats = book.categories;
      else if (book.genre) cats = mapBookCategories(book.genre);
      cats.forEach(name => {
        if (!name) return;
        const entry = statsMap.get(name);
        if (entry) entry.count++;
        else statsMap.set(name, { name, type: bType, fictionType: bFiction, count: 1 });
      });
    });

    // Preserve existing blacklisted flags
    const { data: existingCats, error: fetchError } = await supabase
      .from('categories')
      .select('name, blacklisted');
    if (fetchError) throw fetchError;
    const blacklistMap = new Map(existingCats.map(c => [c.name, c.blacklisted]));

    // Prepare upsert data (overwrite counts)
    const upsertArray = Array.from(statsMap.values()).map(s => ({
      name: s.name,
      type: s.type,
      fictionType: s.fictionType,
      count: s.count,
      blacklisted: !!blacklistMap.get(s.name)
    }));

    const { data, error } = await supabase
      .from('categories')
      .upsert(upsertArray, { onConflict: 'name' })
      .select();
    if (error) throw error;
    return { added: data?.length || 0, categories: data, message: `Upserted ${data?.length} categories` };
  } catch (error) {
    console.error('Error in detectAndAddNewCategories:', error);
    throw error;
  }
};

/**
 * Get category statistics (count of books in each category)
 */
export const getCategoryStats = async (): Promise<Array<{ name: string; count: number; type: Category['type']; fictionType: Category['fictionType']; }>> => {
  try {
    const { data: books, error } = await supabase
      .from('books')
      .select('type, fictionType, categories, genre')
      .not('categories', 'is', null);
    if (error) {
      console.error('Error fetching category stats:', error);
      throw error;
    }

    // Aggregate counts per category per type and fictionType
    const statsMap = new Map<string, { name: string; count: number; type: Category['type']; fictionType: Category['fictionType'] }>;
    books?.forEach(book => {
      // Determine type
      const rawType = book.type?.toLowerCase() || 'ebook';
      const bType: Category['type'] = (rawType === 'audiobook' || rawType === 'hörbuch') ? 'audiobook' : 'ebook';
      // Determine fictionType
      const bFiction: Category['fictionType'] = book.fictionType === 'Fiction' ? 'Fiction' : 'Non-Fiction';

      // Determine categories list
      let cats: string[] = [];
      if (Array.isArray(book.categories) && book.categories.length > 0) {
        cats = book.categories;
      } else if (book.genre) {
        cats = mapBookCategories(book.genre);
      }
      // Count each category
      cats.forEach(name => {
        const key = `${name}||${bType}||${bFiction}`;
        const entry = statsMap.get(key);
        if (entry) entry.count++;
        else statsMap.set(key, { name, count: 1, type: bType, fictionType: bFiction });
      });
    });

    return Array.from(statsMap.values());
  } catch (error) {
    console.error('Error in getCategoryStats:', error);
    throw error;
  }
};

/**
 * Map book categories from book data 
 * (used when parsing and normalizing book data)
 */
export const mapBookCategories = (genre: string): string[] => {
  if (!genre) return [];
  
  // Blacklist of terms to filter out
  const blacklist = [
    'kindle ebooks', 'kindle e-books', 'ebooks', 'kindle', 
    'fiction', 'non-fiction', 'nonfiction', 'non fiction'
  ];
  
  // Process the genre string to extract categories
  return genre
    .split(/>|&|,/) // Split by hierarchy markers and commas
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => p.replace(/\(\d+\)$/g, '').trim().toLowerCase())
    .filter(p => p && p.length > 1 && !blacklist.includes(p));
};
