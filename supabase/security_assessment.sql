-- Security Assessment Script for German Bookshelf Supabase Database
-- Date: 2025-04-24

-- 1. CHECK ROLE SETTINGS AND PRIVILEGES
SELECT 
  r.rolname, 
  r.rolsuper,
  r.rolinherit,
  r.rolcreaterole,
  r.rolcreatedb,
  r.rolcanlogin,
  r.rolreplication,
  r.rolbypassrls
FROM 
  pg_roles r
ORDER BY 
  r.rolname;

-- 2. CHECK PUBLIC SCHEMA PERMISSIONS
SELECT 
  n.nspname, 
  acl.grantee,
  acl.privilege_type
FROM 
  pg_namespace n,
  LATERAL aclexplode(n.nspacl) AS acl
WHERE 
  n.nspname = 'public';

-- 3. CHECK TABLE SECURITY
SELECT 
  n.nspname AS schema_name,
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced,
  COALESCE(array_agg(p.polname) FILTER (WHERE p.polname IS NOT NULL), '{}'::name[]) AS policies
FROM 
  pg_class c
  JOIN pg_namespace n ON c.relnamespace = n.oid
  LEFT JOIN pg_policy p ON c.oid = p.polrelid
WHERE 
  c.relkind = 'r' AND
  n.nspname = 'public'
GROUP BY 
  n.nspname, c.relname, c.relrowsecurity, c.relforcerowsecurity
ORDER BY 
  n.nspname, c.relname;

-- 4. CHECK FOR TABLES WITHOUT RLS ENABLED
SELECT 
  n.nspname AS schema_name,
  c.relname AS table_name
FROM 
  pg_class c
  JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE 
  c.relkind = 'r' AND
  n.nspname = 'public' AND
  NOT c.relrowsecurity
ORDER BY 
  n.nspname, c.relname;

-- 5. CHECK FOR TABLES WITHOUT ANY RLS POLICIES
SELECT 
  n.nspname AS schema_name,
  c.relname AS table_name
FROM 
  pg_class c
  JOIN pg_namespace n ON c.relnamespace = n.oid
  LEFT JOIN pg_policy p ON c.oid = p.polrelid
WHERE 
  c.relkind = 'r' AND
  n.nspname = 'public' AND
  c.relrowsecurity AND
  p.polrelid IS NULL
GROUP BY 
  n.nspname, c.relname
ORDER BY 
  n.nspname, c.relname;

-- 6. CHECK FOREIGN KEY CONSTRAINTS (potential data leakage points)
SELECT 
  conrelid::regclass AS table_from,
  confrelid::regclass AS table_to,
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_def
FROM 
  pg_constraint
WHERE 
  contype = 'f' AND
  connamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY 
  conrelid::regclass::text;

-- 7. CHECK FOR FUNCTIONS MARKED AS SECURITY DEFINER 
-- (these run with privileges of creator rather than caller)
SELECT 
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS function_def
FROM 
  pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE 
  n.nspname = 'public' AND
  p.prosecdef = true
ORDER BY 
  n.nspname, p.proname;

-- 8. CHECK FOR ANY AUTH TRIGGERS
SELECT 
  n.nspname AS schema_name,
  t.tgname AS trigger_name,
  c.relname AS table_name,
  pg_get_triggerdef(t.oid) AS trigger_def
FROM 
  pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE 
  n.nspname = 'public' AND
  pg_get_triggerdef(t.oid) ~* 'auth'
ORDER BY 
  n.nspname, c.relname, t.tgname;

-- 9. CHECK FOR OBJECTS WITH PUBLIC PRIVILEGES
WITH 
  tables AS (
    SELECT c.oid, c.relname, 'TABLE' as object_type
    FROM pg_class c 
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  ),
  functions AS (
    SELECT p.oid, p.proname as relname, 'FUNCTION' as object_type
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
  ),
  all_objects AS (
    SELECT * FROM tables
    UNION ALL
    SELECT * FROM functions
  )
SELECT 
  a.object_type,
  a.relname,
  acl.grantee,
  acl.privilege_type
FROM 
  all_objects a,
  LATERAL aclexplode(CASE 
    WHEN a.object_type = 'TABLE' THEN (SELECT relacl FROM pg_class WHERE oid = a.oid)
    WHEN a.object_type = 'FUNCTION' THEN (SELECT proacl FROM pg_proc WHERE oid = a.oid)
  END) AS acl
WHERE 
  acl.grantee = 'PUBLIC'
ORDER BY 
  a.object_type, a.relname;

-- 10. CHECK FOR STORAGE BUCKETS AND THEIR POLICIES
SELECT 
  'storage.buckets'::text AS "table_name",
  p.polname AS policy_name,
  p.polcmd AS command,
  pg_get_expr(p.polqual, p.polrelid) AS using_expression,
  pg_get_expr(p.polwithcheck, p.polrelid) AS with_check_expression
FROM 
  pg_policy p
  JOIN pg_class c ON p.polrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE 
  n.nspname = 'storage' AND
  c.relname = 'buckets'
UNION ALL
SELECT 
  'storage.objects'::text AS "table_name",
  p.polname AS policy_name,
  p.polcmd AS command,
  pg_get_expr(p.polqual, p.polrelid) AS using_expression,
  pg_get_expr(p.polwithcheck, p.polrelid) AS with_check_expression
FROM 
  pg_policy p
  JOIN pg_class c ON p.polrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE 
  n.nspname = 'storage' AND
  c.relname = 'objects'
ORDER BY 
  "table_name", policy_name;
