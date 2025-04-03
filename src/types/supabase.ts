export type BookType = 'audiobook' | 'ebook';

export interface Book {
  id: string;
  title: string;
  author: string;
  genre: string;
  language: string;
  description: string;
  cover_url: string;
  type: BookType;
  download_url?: string;
  file_url?: string;
  created_at: string;
  updated_at?: string;
  rating?: number; // Rating score for the book (1-10 scale)
}

export interface Profile {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  daily_quota: number;
  website?: string;
  is_admin: boolean;
  monthly_request_quota: number;
}

export interface DownloadLog {
  id: string;
  user_id: string;
  book_id: string;
  downloaded_at: string;
}

export interface Database {
  public: {
    Tables: {
      books: {
        Row: Book;
        Insert: Omit<Book, 'id' | 'created_at'>;
        Update: Partial<Omit<Book, 'id' | 'created_at'>>;
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>;
      };
      download_logs: {
        Row: DownloadLog;
        Insert: Omit<DownloadLog, 'id' | 'downloaded_at'>;
        Update: Partial<Omit<DownloadLog, 'id' | 'downloaded_at'>>;
      };
    };
  };
}
