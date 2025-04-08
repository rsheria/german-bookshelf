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
  
  // New fields for Amazon integration
  isbn?: string; // ISBN identifier
  external_id?: string; // ASIN or other external identifier
  published_date?: string; // Publication date
  publisher?: string; // Publisher name
  page_count?: number; // Number of pages (for ebooks)
}

export type UserStatus = 'active' | 'banned' | 'suspended';

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
  
  // New subscription and ban fields
  status?: UserStatus;
  ban_reason?: string;
  banned_until?: string;
  plan_id?: string;
  subscription_start_date?: string;
  subscription_end_date?: string;
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  daily_quota: number;
  monthly_request_quota: number;
  features: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface UserIp {
  id: string;
  user_id: string;
  ip_address: string;
  location?: string;
  device_info?: string;
  is_blocked: boolean;
  block_reason?: string;
  first_seen: string;
  last_seen: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  activity_type: string;
  entity_type?: string;
  entity_id?: string;
  ip_address?: string;
  details: Record<string, any>;
  created_at: string;
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
      plans: {
        Row: Plan;
        Insert: Omit<Plan, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Plan, 'id' | 'created_at' | 'updated_at'>>;
      };
      user_ips: {
        Row: UserIp;
        Insert: Omit<UserIp, 'id' | 'first_seen' | 'last_seen'>;
        Update: Partial<Omit<UserIp, 'id' | 'first_seen' | 'last_seen'>>;
      };
      activity_logs: {
        Row: ActivityLog;
        Insert: Omit<ActivityLog, 'id' | 'created_at'>;
        Update: Partial<Omit<ActivityLog, 'id' | 'created_at'>>;
      };
    };
    Functions: {
      assign_plan_to_user: {
        Args: { user_id: string; new_plan_id: string; months?: number };
        Returns: boolean;
      };
      ban_user: {
        Args: { user_id: string; reason: string; ban_days?: number };
        Returns: boolean;
      };
      unban_user: {
        Args: { user_id: string };
        Returns: boolean;
      };
      block_ip: {
        Args: { ip: string; reason: string };
        Returns: boolean;
      };
      is_ip_blocked: {
        Args: { ip: string };
        Returns: boolean;
      };
    };
  };
}
