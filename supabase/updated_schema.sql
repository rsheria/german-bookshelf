-- Create tables if they don't exist
CREATE TABLE IF NOT EXISTS books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  description TEXT,
  genre TEXT,
  language TEXT DEFAULT 'German',
  cover_url TEXT,
  download_url TEXT,
  type TEXT CHECK (type IN ('audiobook', 'ebook')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  daily_quota INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS download_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE NOT NULL,
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create or replace function for trigger
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, is_admin)
  VALUES (NEW.id, NEW.email, FALSE);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE create_profile_for_user();

-- Enable Row Level Security
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE download_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can read books" ON books;
DROP POLICY IF EXISTS "Only admins can insert books" ON books;
DROP POLICY IF EXISTS "Only admins can update books" ON books;
DROP POLICY IF EXISTS "Only admins can delete books" ON books;
DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Users can read their own download logs" ON download_logs;
DROP POLICY IF EXISTS "Admins can read all download logs" ON download_logs;
DROP POLICY IF EXISTS "Users can insert their own download logs" ON download_logs;

-- Books policies
CREATE POLICY "Anyone can read books"
  ON books FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert books"
  ON books FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can update books"
  ON books FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can delete books"
  ON books FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Profiles policies
CREATE POLICY "Users can read their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND is_admin = false);

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Download logs policies
CREATE POLICY "Users can read their own download logs"
  ON download_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all download logs"
  ON download_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Users can insert their own download logs"
  ON download_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Sample data (only insert if not already present)
INSERT INTO books (title, author, description, genre, language, cover_url, download_url, type)
SELECT 
  'Der Prozess', 
  'Franz Kafka', 
  'Ein Roman über einen Mann, der ohne ersichtlichen Grund verhaftet und in ein undurchsichtiges Gerichtsverfahren verwickelt wird.', 
  'Fiction', 
  'German', 
  'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=2942&auto=format&fit=crop', 
  'https://example.com/books/der-prozess.pdf', 
  'ebook'
WHERE NOT EXISTS (SELECT 1 FROM books WHERE title = 'Der Prozess' AND author = 'Franz Kafka');

INSERT INTO books (title, author, description, genre, language, cover_url, download_url, type)
SELECT 
  'Die Verwandlung', 
  'Franz Kafka', 
  'Die Geschichte von Gregor Samsa, der eines Morgens als riesiges Insekt aufwacht.', 
  'Fiction', 
  'German', 
  'https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=2787&auto=format&fit=crop', 
  'https://example.com/books/die-verwandlung.pdf', 
  'ebook'
WHERE NOT EXISTS (SELECT 1 FROM books WHERE title = 'Die Verwandlung' AND author = 'Franz Kafka');

INSERT INTO books (title, author, description, genre, language, cover_url, download_url, type)
SELECT 
  'Faust', 
  'Johann Wolfgang von Goethe', 
  'Ein Gelehrter, der mit dem Teufel einen Pakt schließt.', 
  'Classic', 
  'German', 
  'https://images.unsplash.com/photo-1621351183012-e2f9972dd9bf?q=80&w=2835&auto=format&fit=crop', 
  'https://example.com/books/faust.mp3', 
  'audiobook'
WHERE NOT EXISTS (SELECT 1 FROM books WHERE title = 'Faust' AND author = 'Johann Wolfgang von Goethe');

INSERT INTO books (title, author, description, genre, language, cover_url, download_url, type)
SELECT 
  'Buddenbrooks', 
  'Thomas Mann', 
  'Die Geschichte vom Verfall einer Familie.', 
  'Classic', 
  'German', 
  'https://images.unsplash.com/photo-1476275466078-4007374efbbe?q=80&w=2829&auto=format&fit=crop', 
  'https://example.com/books/buddenbrooks.mp3', 
  'audiobook'
WHERE NOT EXISTS (SELECT 1 FROM books WHERE title = 'Buddenbrooks' AND author = 'Thomas Mann');

INSERT INTO books (title, author, description, genre, language, cover_url, download_url, type)
SELECT 
  'Die Blechtrommel', 
  'Günter Grass', 
  'Die Geschichte von Oskar Matzerath, der mit drei Jahren beschließt, nicht mehr zu wachsen.', 
  'Fiction', 
  'German', 
  'https://images.unsplash.com/photo-1490633874781-1c63cc424610?q=80&w=2940&auto=format&fit=crop', 
  'https://example.com/books/die-blechtrommel.pdf', 
  'ebook'
WHERE NOT EXISTS (SELECT 1 FROM books WHERE title = 'Die Blechtrommel' AND author = 'Günter Grass');

INSERT INTO books (title, author, description, genre, language, cover_url, download_url, type)
SELECT 
  'Der Zauberberg', 
  'Thomas Mann', 
  'Ein junger Mann besucht seinen Cousin in einem Sanatorium und bleibt dort sieben Jahre.', 
  'Classic', 
  'German', 
  'https://images.unsplash.com/photo-1518281361980-b26bfd556770?q=80&w=2940&auto=format&fit=crop', 
  'https://example.com/books/der-zauberberg.mp3', 
  'audiobook'
WHERE NOT EXISTS (SELECT 1 FROM books WHERE title = 'Der Zauberberg' AND author = 'Thomas Mann');
