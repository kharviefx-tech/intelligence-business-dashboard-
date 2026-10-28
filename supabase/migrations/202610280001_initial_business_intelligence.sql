-- Business intelligence platform foundation
-- Apply in Supabase SQL Editor or via Supabase migrations.
-- Tenant-owned records are isolated with Row Level Security.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  platform_role text not null default 'user' check (platform_role in ('user','support','admin','super_admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  base_currency char(3) not null default 'NGN',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','analyst','member','viewer')),
  joined_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  transaction_date date not null,
  description text not null check (char_length(trim(description)) between 1 and 500),
  category text not null default 'Uncategorised' check (char_length(trim(category)) <= 120),
  transaction_type text not null check (transaction_type in ('income','expense')),
  amount numeric(18,2) not null check (amount > 0),
  currency char(3) not null default 'NGN',
  reference text,
  notes text,
  source text not null default 'manual' check (source in ('manual','csv_import','integration')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transactions_org_date_idx on public.transactions (organization_id, transaction_date desc);
create index if not exists organization_members_user_idx on public.organization_members (user_id, organization_id);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_org_created_idx on public.audit_logs (organization_id, created_at desc);

-- Profiles are created by a trusted database trigger. Client-supplied metadata
-- cannot assign platform privileges.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute procedure public.set_updated_at();
drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at before update on public.organizations
for each row execute procedure public.set_updated_at();
drop trigger if exists transactions_set_updated_at on public.transactions;
create trigger transactions_set_updated_at before update on public.transactions
for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.transactions enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles: users may read/update only their own profile. Platform role is
-- intentionally not client-updatable; a trusted operator must grant it.
drop policy if exists "profile_select_self" on public.profiles;
create policy "profile_select_self" on public.profiles for select to authenticated using (id = (select auth.uid()));
drop policy if exists "profile_update_self" on public.profiles;
create policy "profile_update_self" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Organization visibility is membership-based.
drop policy if exists "organization_select_members" on public.organizations;
create policy "organization_select_members" on public.organizations for select to authenticated
using (exists (select 1 from public.organization_members m where m.organization_id = id and m.user_id = (select auth.uid())));

drop policy if exists "membership_select_self_or_org_admin" on public.organization_members;
create policy "membership_select_self_or_org_admin" on public.organization_members for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.organization_members own
    where own.organization_id = organization_members.organization_id
      and own.user_id = (select auth.uid())
      and own.role in ('owner','admin')
  )
);

drop policy if exists "transactions_select_members" on public.transactions;
create policy "transactions_select_members" on public.transactions for select to authenticated
using (exists (select 1 from public.organization_members m where m.organization_id = transactions.organization_id and m.user_id = (select auth.uid())));

drop policy if exists "transactions_insert_editors" on public.transactions;
create policy "transactions_insert_editors" on public.transactions for insert to authenticated
with check (
  created_by = (select auth.uid())
  and exists (select 1 from public.organization_members m where m.organization_id = transactions.organization_id and m.user_id = (select auth.uid()) and m.role in ('owner','admin','analyst','member'))
);

drop policy if exists "transactions_update_editors" on public.transactions;
create policy "transactions_update_editors" on public.transactions for update to authenticated
using (exists (select 1 from public.organization_members m where m.organization_id = transactions.organization_id and m.user_id = (select auth.uid()) and m.role in ('owner','admin','analyst','member')))
with check (exists (select 1 from public.organization_members m where m.organization_id = transactions.organization_id and m.user_id = (select auth.uid()) and m.role in ('owner','admin','analyst','member')));

drop policy if exists "transactions_delete_org_admins" on public.transactions;
create policy "transactions_delete_org_admins" on public.transactions for delete to authenticated
using (exists (select 1 from public.organization_members m where m.organization_id = transactions.organization_id and m.user_id = (select auth.uid()) and m.role in ('owner','admin')));

-- Audit logs are append-only from application clients; only members can read
-- their own organization's events. A trusted server should write authoritative logs.
drop policy if exists "audit_select_org_members" on public.audit_logs;
create policy "audit_select_org_members" on public.audit_logs for select to authenticated
using (organization_id is not null and exists (select 1 from public.organization_members m where m.organization_id = audit_logs.organization_id and m.user_id = (select auth.uid())));

revoke all on public.profiles, public.organizations, public.organization_members, public.transactions, public.audit_logs from anon;
grant select, update on public.profiles to authenticated;
grant select on public.organizations to authenticated;
grant select on public.organization_members to authenticated;
grant select, insert, update, delete on public.transactions to authenticated;
grant select on public.audit_logs to authenticated;

-- Workspace creation must be atomic and must never allow callers to add
-- themselves to an existing organization or assign platform-level privileges.
create or replace function public.create_workspace(workspace_name text, workspace_slug text, currency_code text default 'NGN')
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if char_length(trim(workspace_name)) not between 2 and 120 then
    raise exception 'Workspace name must be between 2 and 120 characters';
  end if;
  if workspace_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Workspace slug format is invalid';
  end if;
  if currency_code !~ '^[A-Z]{3}$' then
    raise exception 'Currency must be a 3-letter uppercase code';
  end if;

  insert into public.organizations (name, slug, base_currency, created_by)
  values (trim(workspace_name), workspace_slug, currency_code, auth.uid())
  returning id into new_org_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (new_org_id, auth.uid(), 'owner');

  return new_org_id;
end;
$$;
revoke all on function public.create_workspace(text,text,text) from public, anon;
grant execute on function public.create_workspace(text,text,text) to authenticated;
