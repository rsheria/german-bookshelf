# German Bookshelf

A complete, production-ready web application for managing and distributing German-language audiobooks and ebooks, inspired by Audiobookshelf. This application uses modern web technologies and is designed to be easily deployed on Netlify with Supabase as the backend.

![German Bookshelf Screenshot](https://via.placeholder.com/800x450?text=German+Bookshelf)

## Features

- **Beautiful, Responsive UI**: Modern interface for browsing and downloading German audiobooks and ebooks
- **Multi-language Support**: Full support for German and English languages
- **User Authentication**: Secure login and registration with Supabase Auth
- **Download Management**: Track and limit user downloads with a daily quota system
- **Admin Dashboard**: Comprehensive admin interface for managing books, users, and monitoring downloads
- **Responsive Design**: Works great on desktop, tablet, and mobile devices

## Tech Stack

### Frontend
- React with TypeScript
- Vite for fast development and optimized builds
- React Router for navigation
- react-i18next for internationalization
- Styled Components for styling
- Chakra UI for UI components
- React Icons for beautiful icons

### Backend
- Supabase for authentication, database, and storage
- PostgreSQL database for storing book metadata and user information
- Supabase Storage for cover images (optional)

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Supabase account

### Setting Up Supabase

1. Create a new Supabase project at [https://app.supabase.io/](https://app.supabase.io/)

2. Set up the database schema by running the following SQL in the Supabase SQL editor:

```sql
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
```

3. Set up Supabase Storage (optional):
   - Create a new bucket called `book-covers`
   - Set the bucket to public
   - Configure CORS if needed

4. Note your Supabase URL and anon key from the API settings

### Local Development Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/german-bookshelf.git
cd german-bookshelf
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with your Supabase credentials:
```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:5173](http://localhost:5173) in your browser

### Creating an Admin User

After signing up for the first time, you'll need to manually set yourself as an admin:

1. Go to the Supabase dashboard
2. Navigate to the SQL editor
3. Run the following SQL (replace `your-email@example.com` with your email):

```sql
UPDATE profiles
SET is_admin = TRUE
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'your-email@example.com'
);
```

## Deployment to Netlify

### One-Click Deployment

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/yourusername/german-bookshelf)

### Manual Deployment

1. Push your code to a Git repository (GitHub, GitLab, etc.)

2. Log in to [Netlify](https://app.netlify.com/)

3. Click "New site from Git" and select your repository

4. Configure the build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`

5. Add environment variables:
   - `VITE_SUPABASE_URL`: Your Supabase URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key

6. Deploy the site

## User Guide

### Regular Users

1. **Browsing Books**:
   - Browse audiobooks and ebooks from the homepage
   - Use the search and filter options to find specific books
   - Click on a book to view details

2. **Downloading Books**:
   - Create an account or log in
   - Navigate to a book you want to download
   - Click the "Download" button
   - The download will count against your daily quota

3. **Managing Your Account**:
   - View your profile to see your download history
   - Monitor your remaining daily quota
   - Toggle between German and English language

### Admin Users

1. **Managing Books**:
   - Add new books with metadata and cover images
   - Edit existing book information
   - Delete books from the system

2. **Managing Users**:
   - View all users in the system
   - Adjust user daily download quotas
   - Grant or revoke admin privileges

3. **Monitoring Downloads**:
   - View download statistics
   - See which books are most popular
   - Track user download activity

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Inspired by [Audiobookshelf](https://www.audiobookshelf.org/)
- Built with [React](https://reactjs.org/), [Vite](https://vitejs.dev/), and [Supabase](https://supabase.io/)
