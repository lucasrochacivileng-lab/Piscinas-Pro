create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  location text not null default '' check (char_length(location) <= 240),
  status text not null default 'draft' check (status in ('draft', 'calculated', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_revisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  revision_number integer not null check (revision_number > 0),
  input_snapshot jsonb not null check (jsonb_typeof(input_snapshot) = 'object'),
  created_at timestamptz not null default now(),
  unique (project_id, revision_number)
);

create table public.calculation_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  revision_id uuid not null unique references public.project_revisions(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  engine_version text not null check (char_length(engine_version) between 1 and 40),
  profile_id text not null check (char_length(profile_id) between 1 and 120),
  profile_version text not null check (char_length(profile_version) between 1 and 40),
  overall_status text not null check (overall_status in ('PASS', 'FAIL', 'REQUIRES_REVIEW')),
  input_hash text not null check (input_hash ~ '^[0-9a-f]{64}$'),
  result_summary jsonb not null check (jsonb_typeof(result_summary) = 'object'),
  full_result jsonb not null check (jsonb_typeof(full_result) = 'object'),
  warnings jsonb not null default '[]'::jsonb check (jsonb_typeof(warnings) = 'array'),
  created_at timestamptz not null default now()
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  entity_type text not null check (entity_type in ('project', 'project_revision', 'calculation_run')),
  entity_id uuid not null,
  action text not null check (action in ('insert', 'update', 'delete')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index projects_owner_id_idx on public.projects(owner_id);
create index project_revisions_owner_id_idx on public.project_revisions(owner_id);
create index project_revisions_project_id_idx on public.project_revisions(project_id);
create index calculation_runs_owner_id_idx on public.calculation_runs(owner_id);
create index calculation_runs_project_id_idx on public.calculation_runs(project_id);
create index audit_events_owner_id_created_at_idx on public.audit_events(owner_id, created_at desc);

alter table public.projects enable row level security;
alter table public.project_revisions enable row level security;
alter table public.calculation_runs enable row level security;
alter table public.audit_events enable row level security;

create policy "projects_select_own"
on public.projects for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy "projects_insert_own"
on public.projects for insert
to authenticated
with check ((select auth.uid()) = owner_id);

create policy "projects_update_own"
on public.projects for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "projects_delete_own"
on public.projects for delete
to authenticated
using ((select auth.uid()) = owner_id);

create policy "revisions_select_own"
on public.project_revisions for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy "revisions_insert_own"
on public.project_revisions for insert
to authenticated
with check (
  (select auth.uid()) = owner_id
  and project_id in (
    select id from public.projects where owner_id = (select auth.uid())
  )
);

create policy "runs_select_own"
on public.calculation_runs for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy "runs_insert_own"
on public.calculation_runs for insert
to authenticated
with check (
  (select auth.uid()) = owner_id
  and project_id in (
    select id from public.projects where owner_id = (select auth.uid())
  )
  and revision_id in (
    select id
    from public.project_revisions
    where owner_id = (select auth.uid())
      and project_id = calculation_runs.project_id
  )
);

create policy "audit_select_own"
on public.audit_events for select
to authenticated
using ((select auth.uid()) = owner_id);

revoke all on table public.projects from anon;
revoke all on table public.project_revisions from anon;
revoke all on table public.calculation_runs from anon;
revoke all on table public.audit_events from anon;

grant select, insert, update, delete on table public.projects to authenticated;
grant select, insert on table public.project_revisions to authenticated;
grant select, insert on table public.calculation_runs to authenticated;
grant select on table public.audit_events to authenticated;

create or replace function public.save_calculation_revision(
  target_project_id uuid,
  new_input_snapshot jsonb,
  new_engine_version text,
  new_profile_id text,
  new_profile_version text,
  new_overall_status text,
  new_input_hash text,
  new_result_summary jsonb,
  new_full_result jsonb,
  new_warnings jsonb
)
returns table (revision_id uuid, run_id uuid, revision_number integer)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  next_revision integer;
begin
  if caller_id is null then
    raise exception 'Authentication required';
  end if;

  perform 1
  from public.projects
  where id = target_project_id and owner_id = caller_id
  for update;

  if not found then
    raise exception 'Project not found or access denied';
  end if;

  select coalesce(max(pr.revision_number), 0) + 1
  into next_revision
  from public.project_revisions pr
  where pr.project_id = target_project_id;

  insert into public.project_revisions (
    project_id,
    owner_id,
    revision_number,
    input_snapshot
  ) values (
    target_project_id,
    caller_id,
    next_revision,
    new_input_snapshot
  )
  returning id into revision_id;

  insert into public.calculation_runs (
    project_id,
    revision_id,
    owner_id,
    engine_version,
    profile_id,
    profile_version,
    overall_status,
    input_hash,
    result_summary,
    full_result,
    warnings
  ) values (
    target_project_id,
    revision_id,
    caller_id,
    new_engine_version,
    new_profile_id,
    new_profile_version,
    new_overall_status,
    new_input_hash,
    new_result_summary,
    new_full_result,
    new_warnings
  )
  returning id into run_id;

  revision_number := next_revision;
  return next;
end;
$$;

revoke all on function public.save_calculation_revision(
  uuid, jsonb, text, text, text, text, text, jsonb, jsonb, jsonb
) from public, anon;
grant execute on function public.save_calculation_revision(
  uuid, jsonb, text, text, text, text, text, jsonb, jsonb, jsonb
) to authenticated;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;

create trigger projects_set_updated_at
before update on public.projects
for each row execute function private.set_updated_at();

create or replace function private.log_poolstruct_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_owner uuid;
  row_id uuid;
begin
  row_owner := case when tg_op = 'DELETE' then old.owner_id else new.owner_id end;
  row_id := case when tg_op = 'DELETE' then old.id else new.id end;

  insert into public.audit_events (
    owner_id,
    actor_id,
    entity_type,
    entity_id,
    action,
    metadata
  ) values (
    row_owner,
    (select auth.uid()),
    case tg_table_name
      when 'projects' then 'project'
      when 'project_revisions' then 'project_revision'
      when 'calculation_runs' then 'calculation_run'
    end,
    row_id,
    lower(tg_op),
    jsonb_build_object('table', tg_table_schema || '.' || tg_table_name)
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.log_poolstruct_audit() from public, anon, authenticated;

create trigger projects_audit
after insert or update or delete on public.projects
for each row execute function private.log_poolstruct_audit();

create trigger project_revisions_audit
after insert on public.project_revisions
for each row execute function private.log_poolstruct_audit();

create trigger calculation_runs_audit
after insert on public.calculation_runs
for each row execute function private.log_poolstruct_audit();
