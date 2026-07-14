begin;

select plan(17);

select has_table('public', 'projects', 'projects exists');
select has_table('public', 'project_revisions', 'project_revisions exists');
select has_table('public', 'calculation_runs', 'calculation_runs exists');
select has_table('public', 'audit_events', 'audit_events exists');

select is(
  (select relrowsecurity from pg_class where oid = 'public.projects'::regclass),
  true,
  'projects has RLS'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.project_revisions'::regclass),
  true,
  'project_revisions has RLS'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.calculation_runs'::regclass),
  true,
  'calculation_runs has RLS'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.audit_events'::regclass),
  true,
  'audit_events has RLS'
);

select policies_are('public', 'projects', array[
  'projects_delete_own',
  'projects_insert_own',
  'projects_select_own',
  'projects_update_own'
]);
select policies_are('public', 'project_revisions', array[
  'revisions_insert_own',
  'revisions_select_own'
]);
select policies_are('public', 'calculation_runs', array[
  'runs_insert_own',
  'runs_select_own'
]);
select policies_are('public', 'audit_events', array['audit_select_own']);

select has_index('public', 'projects', 'projects_owner_id_idx');
select has_index('public', 'project_revisions', 'project_revisions_owner_id_idx');
select has_index('public', 'calculation_runs', 'calculation_runs_owner_id_idx');
select has_index('public', 'audit_events', 'audit_events_owner_id_created_at_idx');
select has_function('public', 'save_calculation_revision', array[
  'uuid', 'jsonb', 'text', 'text', 'text', 'text', 'text', 'jsonb', 'jsonb', 'jsonb'
]);

select * from finish();
rollback;
