-- READ-ONLY snapshot: no lead or customer data accessed.
-- Run before and after a human-approved staged permission change.
SELECT
  c.relname AS table_name,
  r.rolname AS role_name,
  c.relrowsecurity AS rls_enabled,
  has_table_privilege(r.rolname,c.oid,'SELECT') AS can_select,
  has_table_privilege(r.rolname,c.oid,'INSERT') AS can_insert,
  has_table_privilege(r.rolname,c.oid,'UPDATE') AS can_update,
  has_table_privilege(r.rolname,c.oid,'DELETE') AS can_delete,
  has_table_privilege(r.rolname,c.oid,'TRUNCATE') AS can_truncate,
  has_table_privilege(r.rolname,c.oid,'TRIGGER') AS can_create_trigger,
  has_table_privilege(r.rolname,c.oid,'REFERENCES') AS can_reference
FROM pg_class c
CROSS JOIN pg_roles r
WHERE c.relnamespace = 'public'::regnamespace
  AND c.relname IN ('clients','leads')
  AND r.rolname IN ('anon','authenticated')
ORDER BY table_name,role_name;
