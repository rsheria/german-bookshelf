import React, { createContext, useContext, useState } from 'react';
import { BookType } from '../types/supabase';

interface FilterState {
  query: string;
  yearFrom: number | null;
  yearTo: number | null;
  language: string | null;
  fileType: string | null;
  bookType: 'all' | BookType;
  exactMatch: boolean;
  sortBy: 'popularity' | 'title_asc' | 'title_desc' | 'year' | 'size_asc' | 'size_desc' | 'latest';
}

interface FilterContextType {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  updateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  resetFilters: () => void;
}

const defaultFilters: FilterState = {
  query: '',
  yearFrom: null,
  yearTo: null,
  language: null,
  fileType: null,
  bookType: 'all',
  exactMatch: false,
  sortBy: 'popularity',
};

export const BookFilterContext = createContext<FilterContextType | undefined>(undefined);

export const BookFilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  return (
    <BookFilterContext.Provider value={{ filters, setFilters, updateFilter, resetFilters }}>
      {children}
    </BookFilterContext.Provider>
  );
};

export const useBookFilter = () => {
  const context = useContext(BookFilterContext);
  if (context === undefined) {
    throw new Error('useBookFilter must be used within a BookFilterProvider');
  }
  return context;
};
