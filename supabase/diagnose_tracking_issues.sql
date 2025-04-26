-- DIAGNOSTIC SCRIPT FOR IP TRACKING AND LAST_ACTIVE ISSUES
-- Run this script in the Supabase SQL Editor and share the results

-- Check all tables and their RLS status
SELECT
    n.nspname as schema,
    c.relname as table,
    CASE WHEN c.relrowsecurity THEN 'RLS enabled' ELSE 'RLS disabled' END as rls_status
FROM
    pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE
    c.relkind = 'r'  -- only tables
    AND n.nspname = 'public'
ORDER BY
    n.nspname, c.relname;

-- Check all policies on ip_logs table
SELECT
    n.nspname AS schema,
    c.relname AS table,
    pol.polname AS policy_name,
    CASE pol.polpermissive WHEN TRUE THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END AS policy_type,
    CASE WHEN pol.polroles = '{0}' THEN 'PUBLIC' ELSE array_to_string(array(SELECT rolname FROM pg_roles WHERE oid = ANY(pol.polroles)), ', ') END AS roles,
    CASE pol.polcmd
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        WHEN '*' THEN 'ALL'
    END AS command,
    pg_get_expr(pol.polqual, pol.polrelid) AS using_expression,
    pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expression
FROM
    pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE
    n.nspname = 'public'
    AND c.relname = 'ip_logs'
ORDER BY
    n.nspname, c.relname, pol.polname;

-- Check all policies on profiles table
SELECT
    n.nspname AS schema,
    c.relname AS table,
    pol.polname AS policy_name,
    CASE pol.polpermissive WHEN TRUE THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END AS policy_type,
    CASE WHEN pol.polroles = '{0}' THEN 'PUBLIC' ELSE array_to_string(array(SELECT rolname FROM pg_roles WHERE oid = ANY(pol.polroles)), ', ') END AS roles,
    CASE pol.polcmd
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        WHEN '*' THEN 'ALL'
    END AS command,
    pg_get_expr(pol.polqual, pol.polrelid) AS using_expression,
    pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expression
FROM
    pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE
    n.nspname = 'public'
    AND c.relname = 'profiles'
ORDER BY
    n.nspname, c.relname, pol.polname;

-- Check all policies on active_sessions table
SELECT
    n.nspname AS schema,
    c.relname AS table,
    pol.polname AS policy_name,
    CASE pol.polpermissive WHEN TRUE THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END AS policy_type,
    CASE WHEN pol.polroles = '{0}' THEN 'PUBLIC' ELSE array_to_string(array(SELECT rolname FROM pg_roles WHERE oid = ANY(pol.polroles)), ', ') END AS roles,
    CASE pol.polcmd
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        WHEN '*' THEN 'ALL'
    END AS command,
    pg_get_expr(pol.polqual, pol.polrelid) AS using_expression,
    pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expression
FROM
    pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE
    n.nspname = 'public'
    AND c.relname = 'active_sessions'
ORDER BY
    n.nspname, c.relname, pol.polname;

-- Check all triggers on relevant tables
SELECT
    n.nspname AS schema,
    c.relname AS table_name,
    t.tgname AS trigger_name,
    pg_get_triggerdef(t.oid) AS trigger_definition
FROM
    pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE
    n.nspname = 'public'
    AND c.relname IN ('profiles', 'ip_logs', 'active_sessions')
    AND NOT t.tgisinternal
ORDER BY
    n.nspname, c.relname, t.tgname;

-- Check the function definitions
SELECT
    n.nspname AS schema,
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM
    pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE
    n.nspname = 'public'
    AND p.proname IN ('track_user_activity', 'update_user_last_active', 'is_admin')
ORDER BY
    n.nspname, p.proname;

-- Check a sample of actual last_active values in profiles
SELECT
    id,
    is_admin,
    last_active,
    created_at
FROM
    public.profiles
LIMIT 10;

-- Check recent ip_logs
SELECT
    id,
    user_id,
    ip_address,
    created_at,
    location
FROM
    public.ip_logs
ORDER BY
    created_at DESC
LIMIT 10;
