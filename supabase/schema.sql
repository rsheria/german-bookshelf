-- German Bookshelf Database Schema
-- This script sets up all tables, indexes, RLS policies, and triggers for the application

-- Create tables
CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  genre TEXT NOT NULL,
  language TEXT NOT NULL,
  description TEXT NOT NULL,
  cover_url TEXT,
  type TEXT NOT NULL CHECK (type IN ('audiobook', 'ebook')),
  download_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  daily_quota INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE download_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_books_type ON books(type);
CREATE INDEX idx_books_genre ON books(genre);
CREATE INDEX idx_download_logs_user_id ON download_logs(user_id);
CREATE INDEX idx_download_logs_downloaded_at ON download_logs(downloaded_at);

-- Set up Row Level Security (RLS)
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE download_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Books policies
CREATE POLICY "Books are viewable by everyone" 
  ON books FOR SELECT 
  USING (true);

CREATE POLICY "Books can be inserted by admins" 
  ON books FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  ));

CREATE POLICY "Books can be updated by admins" 
  ON books FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  ));

CREATE POLICY "Books can be deleted by admins" 
  ON books FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  ));

-- Profiles policies
CREATE POLICY "Users can view their own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" 
  ON profiles FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  ));

CREATE POLICY "Users can update their own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Admins can update all profiles" 
  ON profiles FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  ));

-- Download logs policies
CREATE POLICY "Users can insert their own download logs" 
  ON download_logs FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own download logs" 
  ON download_logs FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all download logs" 
  ON download_logs FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  ));

-- Create trigger to create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, is_admin)
  VALUES (new.id, new.email, FALSE);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- Sample data (optional, uncomment to add sample books)
/*
INSERT INTO books (title, author, genre, language, description, type, download_url)
VALUES 
  ('Der Prozess', 'Franz Kafka', 'Fiction', 'German', 'Ein Roman über einen Mann, der ohne ersichtlichen Grund verhaftet und verfolgt wird.', 'ebook', 'https://example.com/download/der-prozess.pdf'),
  ('Die Verwandlung', 'Franz Kafka', 'Fiction', 'German', 'Die Geschichte von Gregor Samsa, der sich eines Morgens in ein Ungeziefer verwandelt findet.', 'ebook', 'https://example.com/download/die-verwandlung.pdf'),
  ('Faust', 'Johann Wolfgang von Goethe', 'Drama', 'German', 'Die Tragödie eines Gelehrten, der einen Pakt mit dem Teufel schließt.', 'audiobook', 'https://example.com/download/faust.mp3'),
  ('Siddhartha', 'Hermann Hesse', 'Fiction', 'German', 'Ein Roman über die spirituelle Reise eines jungen Mannes im alten Indien.', 'audiobook', 'https://example.com/download/siddhartha.mp3');
*/
