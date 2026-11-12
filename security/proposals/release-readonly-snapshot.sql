-- READ ONLY: aggregate full-row/source-schema fingerprints. No row IDs/PII.
-- Capture before backup, verify against a restored disposable copy, then
-- recheck under the cutover transaction's source locks. A matching fingerprint
-- is evidence of content equality, not proof of owner consent.
SELECT
 (SELECT count(*) FROM public.clients)::bigint AS clients_count,
 (SELECT count(*) FROM public.leads)::bigint AS leads_count,
 (SELECT encode(sha256(convert_to(coalesce(string_agg(to_jsonb(c)::text,',' ORDER BY id),''),'UTF8')),'hex') FROM public.clients c) AS clients_sha256,
 (SELECT encode(sha256(convert_to(coalesce(string_agg(to_jsonb(l)::text,',' ORDER BY id),''),'UTF8')),'hex') FROM public.leads l) AS leads_sha256,
 encode(sha256(convert_to((
   SELECT jsonb_build_object(
     'columns',(SELECT jsonb_agg(jsonb_build_object('table',table_name,'column',column_name,'position',ordinal_position,'type',data_type,'nullable',is_nullable,'default',column_default) ORDER BY table_name,ordinal_position)
                FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('clients','leads')),
     'policies',(SELECT coalesce(jsonb_agg(jsonb_build_object('table',tablename,'name',policyname,'command',cmd,'roles',roles,'using',qual,'check',with_check,'permissive',permissive) ORDER BY tablename,policyname),'[]'::jsonb)
                 FROM pg_policies WHERE schemaname='public' AND tablename IN ('clients','leads')),
     'relations',(SELECT jsonb_agg(jsonb_build_object('name',c.relname,'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,'acl',c.relacl) ORDER BY c.relname)
                  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('clients','leads')),
     'constraints',(SELECT coalesce(jsonb_agg(jsonb_build_object('table',c.conrelid::regclass::text,'name',c.conname,'definition',pg_get_constraintdef(c.oid)) ORDER BY c.conrelid::regclass::text,c.conname),'[]'::jsonb)
                    FROM pg_constraint c WHERE c.conrelid IN ('public.clients'::regclass,'public.leads'::regclass)),
     'column_acl',(SELECT jsonb_agg(jsonb_build_object('table',c.relname,'column',a.attname,'acl',a.attacl) ORDER BY c.relname,a.attnum)
                   FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
                   WHERE n.nspname='public' AND c.relname IN ('clients','leads') AND a.attnum>0 AND NOT a.attisdropped)
   )
 )::text,'UTF8')),'hex') AS schema_sha256;
