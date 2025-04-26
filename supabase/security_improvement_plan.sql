-- GERMAN BOOKSHELF SECURITY AUDIT & IMPROVEMENT PLAN
-- Use this file to identify and fix security issues in your database

-- PHASE 1: IDENTIFYING SECURITY GAPS

-- 1. Check tables missing Row Level Security (RLS)
-- These tables have NO protection at all!
SELECT 
  tablename AS unprotected_table,
  'NO RLS' AS security_issue
FROM 
  pg_tables
WHERE 
  schemaname = 'public' 
  AND tablename NOT IN (
    SELECT tablename 
    FROM pg_tables t
    JOIN pg_class c ON t.tablename = c.relname AND t.schemaname = c.relnamespace::regnamespace::text
    WHERE c.relrowsecurity AND t.schemaname = 'public'
  );

-- 2. Find tables that might leak data to anonymous users
-- These tables don't have policies restricting anonymous access
SELECT 
  c.relname AS table_name,
  'ANON ACCESS POSSIBLE' AS security_issue
FROM 
  pg_class c
  JOIN pg_namespace n ON c.relnamespace = n.oid
  LEFT JOIN pg_policy p ON c.oid = p.polrelid AND 
         pg_get_expr(p.polqual, p.polrelid) LIKE '%anon%'
WHERE 
  c.relkind = 'r'
  AND n.nspname = 'public'
  AND c.relrowsecurity
GROUP BY c.relname
HAVING COUNT(p.polname) = 0;

-- 3. Check for tables with excessive public SELECT permissions
-- Security policy check: Look for tables allowing all users to SELECT
SELECT 
  tablename AS table_name,
  'BROAD SELECT POLICY' AS security_issue
FROM 
  pg_tables t
  JOIN pg_class c ON t.tablename = c.relname AND t.schemaname = c.relnamespace::regnamespace::text
  JOIN pg_policy p ON c.oid = p.polrelid
WHERE 
  t.schemaname = 'public'
  AND p.polcmd = 'r' 
  AND (pg_get_expr(p.polqual, p.polrelid) = 'true' 
       OR pg_get_expr(p.polqual, p.polrelid) LIKE '%authenticated%');

-- 4. Check for any security-critical tables missing specific book request protections
-- Given your book request system's importance, verify it has proper policies
SELECT 
  'book_requests' AS table_name,
  'MISSING REQUEST PROTECTION' AS security_issue  
WHERE 
  NOT EXISTS (
    SELECT 1
    FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE 
      n.nspname = 'public' 
      AND c.relname = 'book_requests'
      AND p.polcmd = 'w'
      AND pg_get_expr(p.polqual, p.polrelid) LIKE '%status%'
  );

-- PHASE 2: STORAGE SECURITY FOR AVATARS AND BOOK COVERS
-- Check for appropriate storage bucket policies
SELECT
  b.name AS bucket_name,
  b.public AS is_public,
  CASE 
    WHEN b.public AND b.name = 'avatars' THEN 'PUBLIC AVATAR BUCKET - OK IF INTENDED'
    WHEN b.public AND b.name != 'avatars' THEN 'UNEXPECTED PUBLIC BUCKET'
    ELSE NULL
  END AS security_note
FROM
  storage.buckets b;
