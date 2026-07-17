begin;

select plan(10);

select has_table('public', 'operational_events', 'operational_events exists');
select is(
  (select relrowsecurity from pg_class where oid = 'public.operational_events'::regclass),
  true,
  'operational_events has RLS'
);
select policies_are('public', 'operational_events', array[
  'operational_events_insert_own',
  'operational_events_select_own'
]);
select has_index('public', 'operational_events', 'operational_events_owner_created_at_idx', 'operational events owner and created at index exists');
select has_index('public', 'operational_events', 'operational_events_created_at_idx', 'operational events created at index exists');
select has_column('public', 'operational_events', 'correlation_id', 'operational events correlation id exists');
select has_column('public', 'operational_events', 'message_code', 'operational events message code exists');
select col_not_null('public', 'operational_events', 'owner_id', 'operational events owner id is not null');
select col_not_null('public', 'operational_events', 'context', 'operational events context is not null');
select has_function('private', 'prune_operational_events', array['timestamp with time zone']);

select * from finish();
rollback;
