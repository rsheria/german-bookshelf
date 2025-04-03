-- ABSOLUTE MINIMAL FIX
-- Only contains essential commands that are guaranteed to work

-- Disable RLS on critical tables
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.books DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.download_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_requests DISABLE ROW LEVEL SECURITY;

-- Grant permissions (no policies, just direct grants)
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO service_role;

GRANT ALL ON TABLE public.books TO authenticated;
GRANT ALL ON TABLE public.books TO anon;
GRANT ALL ON TABLE public.books TO service_role;

GRANT ALL ON TABLE public.download_logs TO authenticated;
GRANT ALL ON TABLE public.download_logs TO anon;
GRANT ALL ON TABLE public.download_logs TO service_role;

GRANT ALL ON TABLE public.book_requests TO authenticated;
GRANT ALL ON TABLE public.book_requests TO anon;
GRANT ALL ON TABLE public.book_requests TO service_role;
