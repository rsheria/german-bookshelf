import React, { useState } from 'react';
import { Book } from '../types/supabase';

interface DebugPanelProps {
  books: Book[];
  selectedCategories: string[];
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ books, selectedCategories }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);

  const applyManualFiltering = () => {
    if (!selectedCategories || selectedCategories.length === 0) {
      setFilteredBooks(books);
      return;
    }

    // Our super strict filtering function
    const result = books.filter(book => {
      // For debugging
      const bookCategories = book.categories || [];
      const bookGenre = book.genre || '';
      
      return selectedCategories.every(category => {
        // Case-insensitive comparison
        const cat = category.toLowerCase().trim();
        
        // Check in categories array
        if (Array.isArray(bookCategories)) {
          const matchInArray = bookCategories.some(bookCat => 
            typeof bookCat === 'string' && 
            bookCat.toLowerCase().trim().includes(cat)
          );
          
          if (matchInArray) return true;
        }
        
        // Check in genre string
        if (bookGenre && typeof bookGenre === 'string') {
          if (bookGenre.toLowerCase().includes(cat)) {
            return true;
          }
        }
        
        return false;
      });
    });
    
    setFilteredBooks(result);
  };

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: isOpen ? '0' : '-500px', 
      right: '0',
      width: '400px',
      height: isOpen ? '500px' : '40px',
      backgroundColor: '#333',
      color: '#fff',
      transition: 'all 0.3s ease',
      zIndex: 9999,
      padding: '10px',
      boxShadow: '0 0 10px rgba(0,0,0,0.5)',
      borderRadius: '4px 0 0 0',
      overflowY: 'auto'
    }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'absolute',
          top: '5px',
          right: '10px',
          background: 'none',
          border: 'none',
          color: 'white',
          fontSize: '16px',
          cursor: 'pointer'
        }}
      >
        {isOpen ? 'Close' : 'Debug Filtering'}
      </button>
      
      {isOpen && (
        <div>
          <h3>Debug Information</h3>
          <p>Selected Categories: {selectedCategories.join(', ') || 'None'}</p>
          <p>Total Books: {books.length}</p>
          
          <button 
            onClick={applyManualFiltering}
            style={{
              padding: '5px 10px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              marginTop: '10px',
              cursor: 'pointer'
            }}
          >
            Apply Manual Filtering
          </button>
          
          <div>
            <p>Manually Filtered Results: {filteredBooks.length} books match</p>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {filteredBooks.slice(0, 10).map(book => (
                <div key={book.id} style={{ padding: '5px', borderBottom: '1px solid #555' }}>
                  <strong>{book.title}</strong>
                  <div>Categories: {Array.isArray(book.categories) ? book.categories.join(', ') : 'None'}</div>
                  <div>Genre: {book.genre || 'None'}</div>
                </div>
              ))}
              {filteredBooks.length > 10 && <p>...and {filteredBooks.length - 10} more</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugPanel;
