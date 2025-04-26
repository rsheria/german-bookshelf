-- SIMPLIFIED DIAGNOSTIC SCRIPT
-- This will help identify issues with IP tracking and last_active updates

-- 1. Check table structure of ip_logs
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'ip_logs';

-- 2. Check table structure of profiles
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles';

-- 3. Check RLS policies for ip_logs
SELECT 
    pol.polname AS policy_name,
    CASE pol.polcmd
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        WHEN '*' THEN 'ALL'
    END AS command,
    pg_get_expr(pol.polqual, pol.polrelid) AS using_expression,
    pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expression
FROM pg_policy pol
JOIN pg_class c ON c.oid = pol.polrelid
WHERE c.relname = 'ip_logs';

-- 4. Check RLS policies for profiles
SELECT 
    pol.polname AS policy_name,
    CASE pol.polcmd
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        WHEN '*' THEN 'ALL'
    END AS command,
    pg_get_expr(pol.polqual, pol.polrelid) AS using_expression,
    pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expression
FROM pg_policy pol
JOIN pg_class c ON c.oid = pol.polrelid
WHERE c.relname = 'profiles';

-- 5. Check is_admin function definition
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'is_admin' 
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 6. Check user examples from profiles table
SELECT id, email, is_admin, last_active, created_at
FROM profiles
LIMIT 5;

-- 7. Test a profile update directly
UPDATE profiles 
SET last_active = CURRENT_TIMESTAMP 
WHERE id = (SELECT id FROM profiles LIMIT 1)
RETURNING id, last_active;
