-- Optional helper: seed remaining template version rows from application builtins.
-- Safe to re-run. Primary schema remains supabase/swagstack_schema.sql.

insert into public.ss_template_versions (template_id, version, schema, default_config)
select t.id, 1, '{}'::jsonb, '{}'::jsonb
from public.ss_templates t
where not exists (
  select 1 from public.ss_template_versions v where v.template_id = t.id and v.version = 1
);
-- Application builtins in src/swagstack/lib/templates.js fill schema/default_config when DB JSON is empty.
