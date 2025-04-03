-- Fix RLS policies for book_requests table

-- First, let's check the existing policies and drop them if necessary
DROP POLICY IF EXISTS "Users can create their own book requests" ON public.book_requests;
DROP POLICY IF EXISTS "Users can view their own book requests" ON public.book_requests;
DROP POLICY IF EXISTS "Users can update their own pending book requests" ON public.book_requests;
DROP POLICY IF EXISTS "Users can delete their own pending book requests" ON public.book_requests;
DROP POLICY IF EXISTS "Admins can do everything with book requests" ON public.book_requests;

-- Now recreate the policies with correct permissions
-- 1. Allow authenticated users to INSERT their own requests
CREATE POLICY "Users can create book requests"
ON public.book_requests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 2. Allow users to view their own requests
CREATE POLICY "Users can view their own book requests"
ON public.book_requests FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 3. Allow users to update their own pending requests
CREATE POLICY "Users can update their own pending book requests"
ON public.book_requests FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status = 'Pending');

-- 4. Allow users to delete their own pending requests
CREATE POLICY "Users can delete their own pending book requests"
ON public.book_requests FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND status = 'Pending');

-- 5. Allow admins (via service_role) to do everything
CREATE POLICY "Service role can do everything with book requests"
ON public.book_requests
TO service_role
USING (true)
WITH CHECK (true);

-- Make sure permissions are correctly set
GRANT ALL ON TABLE public.book_requests TO authenticated;
GRANT ALL ON TABLE public.book_requests TO service_role;
