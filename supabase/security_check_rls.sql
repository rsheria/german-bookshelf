-- Security Check: Tables without RLS enabled (these tables have NO protection)
SELECT 
  tablename AS "Table Without RLS"
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

-- Security Check: Tables with RLS enabled but no policies (these won't allow any access)
SELECT 
  c.relname AS "Table With No Policies"
FROM 
  pg_class c
  JOIN pg_namespace n ON c.relnamespace = n.oid
  LEFT JOIN pg_policy p ON c.oid = p.polrelid
WHERE 
  c.relkind = 'r'
  AND n.nspname = 'public' 
  AND c.relrowsecurity
  AND p.polname IS NULL
GROUP BY c.relname;
