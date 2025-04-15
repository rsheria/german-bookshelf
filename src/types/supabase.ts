export type BookType = 'audiobook' | 'ebook' | 'Hörbuch';

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
  
  // New fields for Amazon integration
  isbn?: string; // ISBN identifier
  external_id?: string; // ASIN or other external identifier
  published_date?: string; // Publication date
  publisher?: string; // Publisher name
  page_count?: number; // Number of pages (for ebooks)

  // New fields for audiobooks/ebooks
  narrator?: string; // Audiobook narrator
  audio_length?: string; // Audiobook length (e.g., '10h 23m')
  audio_format?: string; // Audiobook file format (e.g., 'MP3')
  ebook_format?: string; // Ebook file format (e.g., 'EPUB', 'PDF')
  file_size?: string; // File size (e.g., '250MB')
  categories?: string[]; // Categories/genres as an array
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

// New interface for IP logs
export interface IpLog {
  id: string;
  user_id: string;
  ip_address: string;
  user_agent?: string;
  location?: Record<string, any>; // Geolocation data in JSON format
  created_at: string;
}

// New interface for user bans
export interface UserBan {
  id: string;
  user_id?: string;
  ip_address?: string;
  reason?: string;
  banned_by: string;
  banned_at: string;
  expires_at?: string;
  is_active: boolean;
}

// New interface for user sessions
export interface UserSession {
  id: string;
  user_id: string;
  session_id: string;
  ip_address?: string;
  user_agent?: string;
  started_at: string;
  last_active_at: string;
  ended_at?: string;
  is_active: boolean;
}

// New interface for online users
export interface OnlineUser {
  user_id: string;
  username: string;
  last_active: string;
}

// New interface for user download statistics
export interface UserDownloadStats {
  user_id: string;
  username: string;
  total_downloads: number;
  downloads_today: number;
  downloads_this_week: number;
  downloads_this_month: number;
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
      // New tables
      ip_logs: {
        Row: IpLog;
        Insert: Omit<IpLog, 'id' | 'created_at'>;
        Update: Partial<Omit<IpLog, 'id' | 'created_at'>>;
      };
      user_bans: {
        Row: UserBan;
        Insert: Omit<UserBan, 'id' | 'banned_at'>;
        Update: Partial<Omit<UserBan, 'id' | 'banned_at'>>;
      };
      user_sessions: {
        Row: UserSession;
        Insert: Omit<UserSession, 'id' | 'started_at' | 'last_active_at'>;
        Update: Partial<Omit<UserSession, 'id' | 'started_at'>>;
      };
    };
    Functions: {
      is_user_banned: {
        Args: { check_user_id: string; check_ip: string };
        Returns: boolean;
      };
      update_user_last_active: {
        Args: { user_id: string; session_id: string };
        Returns: void;
      };
      end_user_session: {
        Args: { user_id: string; session_id: string };
        Returns: void;
      };
      get_online_users: {
        Args: Record<string, never>;
        Returns: OnlineUser[];
      };
      get_user_download_stats: {
        Args: { lookup_user_id?: string };
        Returns: UserDownloadStats[];
      };
    };
  };
}
