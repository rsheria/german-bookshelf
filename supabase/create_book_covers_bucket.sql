-- Create the book-covers storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('book-covers', 'book-covers', true);

-- Set up RLS (Row Level Security) policies for the book-covers bucket

-- Allow anyone to view/download covers (public access)
CREATE POLICY "Public Access for Book Covers"
ON storage.objects
FOR SELECT
USING (bucket_id = 'book-covers');

-- Allow authenticated users to upload new covers
CREATE POLICY "Authenticated Users Can Upload Book Covers"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'book-covers');

-- Allow authenticated users to update their own covers
CREATE POLICY "Authenticated Users Can Update Their Own Covers"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'book-covers' AND owner = auth.uid())
WITH CHECK (bucket_id = 'book-covers');

-- Allow authenticated users to delete their own covers
CREATE POLICY "Authenticated Users Can Delete Their Own Covers"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'book-covers' AND owner = auth.uid());

-- Add a more permissive policy for admins to manage all covers
CREATE POLICY "Admins Can Manage All Book Covers"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'book-covers' AND 
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (
      auth.users.email = 'admin@example.com'  -- Change to your admin email
      OR (auth.users.raw_app_meta_data->>'is_admin')::boolean = true
    )
  )
);
