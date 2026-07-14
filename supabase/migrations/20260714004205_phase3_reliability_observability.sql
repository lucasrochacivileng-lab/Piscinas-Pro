create table public.operational_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  correlation_id uuid not null,
  event_type text not null check (
    event_type in ('ui_error', 'repository_error', 'calculation_error', 'recovery_drill')
  ),
  severity text not null check (severity in ('warning', 'error')),
  message_code text not null check (message_code ~ '^[a-z0-9_]{3,80}$'),
  context jsonb not null default '{}'::jsonb check (
    jsonb_typeof(context) = 'object'
    and octet_length(context::text) <= 4096
  ),
  created_at timestamptz not null default now(),
  unique (owner_id, correlation_id)
);

create index operational_events_owner_created_at_idx
on public.operational_events(owner_id, created_at desc);

create index operational_events_created_at_idx
on public.operational_events(created_at);

alter table public.operational_events enable row level security;

create policy "operational_events_select_own"
on public.operational_events for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy "operational_events_insert_own"
on public.operational_events for insert
to authenticated
with check ((select auth.uid()) = owner_id);

revoke all on table public.operational_events from anon;
grant select, insert on table public.operational_events to authenticated;

comment on table public.operational_events is
  'Sanitized per-user reliability events. Never store credentials, structural inputs or raw error messages.';

create or replace function private.prune_operational_events(cutoff timestamptz)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  deleted_rows bigint;
begin
  if cutoff > now() - interval '7 days' then
    raise exception 'Operational event retention must be at least 7 days';
  end if;
  delete from public.operational_events where created_at < cutoff;
  get diagnostics deleted_rows = row_count;
  return deleted_rows;
end;
$$;

revoke all on function private.prune_operational_events(timestamptz)
from public, anon, authenticated;
