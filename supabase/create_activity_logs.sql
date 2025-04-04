-- Create user activity logs table to track user actions
BEGIN;

-- Drop existing table if it exists
DROP TABLE IF EXISTS public.activity_logs;

-- Create activity_logs table
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT, -- Store the username for easier querying
  action TEXT NOT NULL, -- Login, Download, ProfileUpdate, etc.
  entity_id UUID, -- Optional reference to the entity (e.g., book_id for downloads)
  entity_type TEXT, -- Type of entity (e.g., 'book', 'profile')
  entity_name TEXT, -- Name of the entity (e.g., book title)
  details JSONB, -- Additional details about the action
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  ip_address TEXT -- Optional IP address for security logging
);

-- Create indexes for better performance
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_action ON public.activity_logs(action);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at);

-- Enable Row Level Security
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view only their own activity logs
CREATE POLICY "Users can view their own activity logs" 
  ON public.activity_logs FOR SELECT 
  USING (auth.uid() = user_id);

-- Only admins can add activity logs for other users
CREATE POLICY "Admins can insert activity logs for any user" 
  ON public.activity_logs FOR INSERT 
  WITH CHECK (
    auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true) OR
    auth.uid() = user_id
  );

-- Admins can view all activity logs
CREATE POLICY "Admins can view all activity logs" 
  ON public.activity_logs FOR SELECT 
  USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true)
  );

-- Create a function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity(
  user_id UUID,
  action TEXT,
  entity_id UUID DEFAULT NULL,
  entity_type TEXT DEFAULT NULL,
  entity_name TEXT DEFAULT NULL,
  details JSONB DEFAULT NULL,
  ip_address TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  username TEXT;
  log_id UUID;
BEGIN
  -- Get the username from profiles
  SELECT profiles.username INTO username
  FROM public.profiles
  WHERE profiles.id = user_id;

  -- Insert the activity log
  INSERT INTO public.activity_logs (
    user_id, username, action, entity_id, entity_type, entity_name, details, ip_address
  ) VALUES (
    user_id, username, action, entity_id, entity_type, entity_name, details, ip_address
  ) RETURNING id INTO log_id;

  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to automatically log user logins (via auth.users)
CREATE OR REPLACE FUNCTION log_user_login() 
RETURNS TRIGGER AS $$
BEGIN
  PERFORM log_user_activity(
    NEW.id, 
    'LOGIN', 
    NULL, 
    'auth',
    NEW.email,
    jsonb_build_object('last_sign_in_at', NEW.last_sign_in_at),
    NULL
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Register the trigger on auth.users for login events
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
CREATE TRIGGER on_auth_user_login
  AFTER UPDATE OF last_sign_in_at
  ON auth.users
  FOR EACH ROW
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE PROCEDURE log_user_login();

-- Create a trigger to automatically log book downloads
CREATE OR REPLACE FUNCTION log_book_download() 
RETURNS TRIGGER AS $$
DECLARE
  book_title TEXT;
BEGIN
  -- Get the book title
  SELECT title INTO book_title
  FROM public.books
  WHERE id = NEW.book_id;

  -- Log the download activity
  PERFORM log_user_activity(
    NEW.user_id, 
    'DOWNLOAD', 
    NEW.book_id, 
    'book',
    book_title,
    jsonb_build_object('download_id', NEW.id),
    NULL
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Register the trigger on downloads table
DROP TRIGGER IF EXISTS on_book_download ON public.downloads;
CREATE TRIGGER on_book_download
  AFTER INSERT
  ON public.downloads
  FOR EACH ROW
  EXECUTE PROCEDURE log_book_download();

-- Grant necessary permissions
GRANT ALL ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
GRANT EXECUTE ON FUNCTION log_user_activity TO authenticated;
GRANT EXECUTE ON FUNCTION log_user_activity TO service_role;

COMMIT;
