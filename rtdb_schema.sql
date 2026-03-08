-- Supabase schema for Firebase-RTDB compatible storage.
-- Run this file once in Supabase SQL Editor.

create table if not exists public.rtdb_state (
  id smallint primary key,
  data jsonb not null default '{}'::jsonb,
  version bigint not null default 0,
  updated_at timestamptz not null default timezone('utc', now()),
  check (id = 1)
);

insert into public.rtdb_state (id, data, version)
values (1, '{}'::jsonb, 0)
on conflict (id) do nothing;

create or replace function public.rtdb_path_array(p_path text)
returns text[]
language sql
immutable
as $$
  select coalesce(
    array_remove(string_to_array(trim(both '/' from coalesce(p_path, '')), '/'), ''),
    array[]::text[]
  );
$$;

create or replace function public.rtdb_read(p_path text default '')
returns jsonb
language sql
security definer
set search_path = public
as $$
  with p as (
    select public.rtdb_path_array(p_path) as arr
  )
  select
    case
      when array_length(p.arr, 1) is null then s.data
      else s.data #> p.arr
    end
  from public.rtdb_state s
  cross join p
  where s.id = 1;
$$;

create or replace function public.rtdb_read_all()
returns table(version bigint, data jsonb)
language sql
security definer
set search_path = public
as $$
  select s.version, s.data
  from public.rtdb_state s
  where s.id = 1;
$$;

create or replace function public.rtdb_version()
returns bigint
language sql
security definer
set search_path = public
as $$
  select s.version
  from public.rtdb_state s
  where s.id = 1;
$$;

create or replace function public.rtdb_set(p_path text, p_value jsonb)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  path_parts text[] := public.rtdb_path_array(p_path);
  current_data jsonb;
  next_data jsonb;
  next_version bigint;
begin
  select s.data into current_data
  from public.rtdb_state s
  where s.id = 1
  for update;

  if not found then
    insert into public.rtdb_state (id, data, version)
    values (1, '{}'::jsonb, 0)
    returning data into current_data;
  end if;

  next_data := current_data;

  if array_length(path_parts, 1) is null then
    if p_value is null or p_value = 'null'::jsonb then
      next_data := '{}'::jsonb;
    else
      next_data := p_value;
    end if;
  else
    if p_value is null or p_value = 'null'::jsonb then
      next_data := next_data #- path_parts;
    else
      next_data := jsonb_set(next_data, path_parts, p_value, true);
    end if;
  end if;

  update public.rtdb_state
  set data = next_data,
      version = version + 1,
      updated_at = timezone('utc', now())
  where id = 1
  returning version into next_version;

  return next_version;
end;
$$;

create or replace function public.rtdb_patch(p_updates jsonb)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  current_data jsonb;
  next_data jsonb;
  entry record;
  path_parts text[];
  next_version bigint;
begin
  if p_updates is null then
    return public.rtdb_version();
  end if;

  if jsonb_typeof(p_updates) <> 'object' then
    raise exception 'p_updates must be a JSON object';
  end if;

  select s.data into current_data
  from public.rtdb_state s
  where s.id = 1
  for update;

  if not found then
    insert into public.rtdb_state (id, data, version)
    values (1, '{}'::jsonb, 0)
    returning data into current_data;
  end if;

  next_data := current_data;

  for entry in select key, value from jsonb_each(p_updates)
  loop
    path_parts := public.rtdb_path_array(entry.key);

    if array_length(path_parts, 1) is null then
      if entry.value is null or entry.value = 'null'::jsonb then
        next_data := '{}'::jsonb;
      else
        next_data := entry.value;
      end if;
    else
      if entry.value is null or entry.value = 'null'::jsonb then
        next_data := next_data #- path_parts;
      else
        next_data := jsonb_set(next_data, path_parts, entry.value, true);
      end if;
    end if;
  end loop;

  update public.rtdb_state
  set data = next_data,
      version = version + 1,
      updated_at = timezone('utc', now())
  where id = 1
  returning version into next_version;

  return next_version;
end;
$$;

create or replace function public.rtdb_compare_and_set(
  p_path text,
  p_expected jsonb,
  p_next jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  path_parts text[] := public.rtdb_path_array(p_path);
  current_data jsonb;
  next_data jsonb;
  current_value jsonb;
begin
  select s.data into current_data
  from public.rtdb_state s
  where s.id = 1
  for update;

  if not found then
    insert into public.rtdb_state (id, data, version)
    values (1, '{}'::jsonb, 0)
    returning data into current_data;
  end if;

  if array_length(path_parts, 1) is null then
    current_value := current_data;
  else
    current_value := current_data #> path_parts;
  end if;

  if not (current_value is not distinct from p_expected) then
    return false;
  end if;

  next_data := current_data;

  if array_length(path_parts, 1) is null then
    if p_next is null or p_next = 'null'::jsonb then
      next_data := '{}'::jsonb;
    else
      next_data := p_next;
    end if;
  else
    if p_next is null or p_next = 'null'::jsonb then
      next_data := next_data #- path_parts;
    else
      next_data := jsonb_set(next_data, path_parts, p_next, true);
    end if;
  end if;

  update public.rtdb_state
  set data = next_data,
      version = version + 1,
      updated_at = timezone('utc', now())
  where id = 1;

  return true;
end;
$$;

-- Restrict direct table access; use RPC functions instead.
revoke all on table public.rtdb_state from public;
revoke all on table public.rtdb_state from anon;
revoke all on table public.rtdb_state from authenticated;

-- Allow clients and server to execute RPC functions.
grant execute on function public.rtdb_read(text) to anon, authenticated, service_role;
grant execute on function public.rtdb_read_all() to anon, authenticated, service_role;
grant execute on function public.rtdb_version() to anon, authenticated, service_role;
grant execute on function public.rtdb_set(text, jsonb) to anon, authenticated, service_role;
grant execute on function public.rtdb_patch(jsonb) to anon, authenticated, service_role;
grant execute on function public.rtdb_compare_and_set(text, jsonb, jsonb) to anon, authenticated, service_role;
