-- Business Intelligence foundation.
-- Namespaced tables deliberately avoid touching pre-existing tables in the shared Supabase project.
create extension if not exists pgcrypto;

create table if not exists public.bi_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  platform_role text not null default 'user' check (platform_role in ('user','admin','super_admin')),
  created_at timestamptz not null default now()
);
create table if not exists public.bi_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  currency text not null default 'NGN' check (currency in ('NGN','USD','GBP','EUR','GHS','KES','ZAR')),
  plan text not null default 'Free' check (plan in ('Free','Professional','Business','Enterprise')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table if not exists public.bi_organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.bi_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','manager','staff','analyst')),
  created_at timestamptz not null default now(),
  unique (organization_id,user_id)
);
create table if not exists public.bi_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.bi_organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  transaction_date date not null default current_date,
  description text not null check (char_length(description) between 1 and 240),
  kind text not null check (kind in ('income','expense')),
  amount numeric(14,2) not null check (amount >= 0),
  currency text not null default 'NGN' check (currency in ('NGN','USD','GBP','EUR','GHS','KES','ZAR')),
  category text not null default 'Uncategorized',
  status text not null default 'recorded' check (status in ('pending','recorded','cancelled')),
  counterparty text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.bi_audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.bi_organizations(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists bi_members_user_idx on public.bi_organization_members(user_id);
create index if not exists bi_transactions_org_date_idx on public.bi_transactions(organization_id,transaction_date desc);
create index if not exists bi_audit_org_created_idx on public.bi_audit_logs(organization_id,created_at desc);

alter table public.bi_profiles enable row level security;
alter table public.bi_organizations enable row level security;
alter table public.bi_organization_members enable row level security;
alter table public.bi_transactions enable row level security;
alter table public.bi_audit_logs enable row level security;

drop policy if exists bi_profiles_select_self on public.bi_profiles;
create policy bi_profiles_select_self on public.bi_profiles for select to authenticated using (id = auth.uid());
drop policy if exists bi_profiles_insert_self on public.bi_profiles;
create policy bi_profiles_insert_self on public.bi_profiles for insert to authenticated with check (id = auth.uid() and platform_role = 'user');

drop policy if exists bi_org_select_member on public.bi_organizations;
create policy bi_org_select_member on public.bi_organizations for select to authenticated using (exists (select 1 from public.bi_organization_members m where m.organization_id = id and m.user_id = auth.uid()));
drop policy if exists bi_org_create_owner on public.bi_organizations;
create policy bi_org_create_owner on public.bi_organizations for insert to authenticated with check (created_by = auth.uid());
drop policy if exists bi_org_update_owner on public.bi_organizations;
create policy bi_org_update_owner on public.bi_organizations for update to authenticated using (exists (select 1 from public.bi_organization_members m where m.organization_id = id and m.user_id = auth.uid() and m.role = 'owner')) with check (exists (select 1 from public.bi_organization_members m where m.organization_id = id and m.user_id = auth.uid() and m.role = 'owner'));

drop policy if exists bi_members_select_self_or_org_owner on public.bi_organization_members;
create policy bi_members_select_self_or_org_owner on public.bi_organization_members for select to authenticated using (user_id = auth.uid() or exists (select 1 from public.bi_organization_members m where m.organization_id = bi_organization_members.organization_id and m.user_id = auth.uid() and m.role = 'owner'));
drop policy if exists bi_members_insert_owner on public.bi_organization_members;
create policy bi_members_insert_owner on public.bi_organization_members for insert to authenticated with check (user_id = auth.uid() and role = 'owner' and exists (select 1 from public.bi_organizations o where o.id = organization_id and o.created_by = auth.uid()));
drop policy if exists bi_members_update_owner on public.bi_organization_members;
create policy bi_members_update_owner on public.bi_organization_members for update to authenticated using (exists (select 1 from public.bi_organization_members m where m.organization_id = bi_organization_members.organization_id and m.user_id = auth.uid() and m.role = 'owner')) with check (exists (select 1 from public.bi_organization_members m where m.organization_id = bi_organization_members.organization_id and m.user_id = auth.uid() and m.role = 'owner'));
drop policy if exists bi_members_delete_owner on public.bi_organization_members;
create policy bi_members_delete_owner on public.bi_organization_members for delete to authenticated using (exists (select 1 from public.bi_organization_members m where m.organization_id = bi_organization_members.organization_id and m.user_id = auth.uid() and m.role = 'owner' and m.user_id <> bi_organization_members.user_id));

drop policy if exists bi_transactions_select_member on public.bi_transactions;
create policy bi_transactions_select_member on public.bi_transactions for select to authenticated using (exists (select 1 from public.bi_organization_members m where m.organization_id = bi_transactions.organization_id and m.user_id = auth.uid()));
drop policy if exists bi_transactions_insert_member on public.bi_transactions;
create policy bi_transactions_insert_member on public.bi_transactions for insert to authenticated with check (created_by = auth.uid() and exists (select 1 from public.bi_organization_members m where m.organization_id = bi_transactions.organization_id and m.user_id = auth.uid() and m.role in ('owner','manager','staff')));
drop policy if exists bi_transactions_update_member on public.bi_transactions;
create policy bi_transactions_update_member on public.bi_transactions for update to authenticated using (exists (select 1 from public.bi_organization_members m where m.organization_id = bi_transactions.organization_id and m.user_id = auth.uid() and m.role in ('owner','manager','staff'))) with check (exists (select 1 from public.bi_organization_members m where m.organization_id = bi_transactions.organization_id and m.user_id = auth.uid() and m.role in ('owner','manager','staff')));
drop policy if exists bi_transactions_delete_owner_manager on public.bi_transactions;
create policy bi_transactions_delete_owner_manager on public.bi_transactions for delete to authenticated using (exists (select 1 from public.bi_organization_members m where m.organization_id = bi_transactions.organization_id and m.user_id = auth.uid() and m.role in ('owner','manager')));

drop policy if exists bi_audit_select_org_member on public.bi_audit_logs;
create policy bi_audit_select_org_member on public.bi_audit_logs for select to authenticated using (organization_id is not null and exists (select 1 from public.bi_organization_members m where m.organization_id = bi_audit_logs.organization_id and m.user_id = auth.uid()));
drop policy if exists bi_audit_insert_actor on public.bi_audit_logs;
create policy bi_audit_insert_actor on public.bi_audit_logs for insert to authenticated with check (actor_id = auth.uid() and (organization_id is null or exists (select 1 from public.bi_organization_members m where m.organization_id = bi_audit_logs.organization_id and m.user_id = auth.uid())));

create or replace function public.bi_handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.bi_profiles(id,full_name,platform_role)
  values (new.id,nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name','')),'') ,'user')
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists bi_on_auth_user_created on auth.users;
create trigger bi_on_auth_user_created after insert on auth.users for each row execute procedure public.bi_handle_new_user();
revoke all on function public.bi_handle_new_user() from public,anon,authenticated;

create or replace function public.bi_create_workspace(p_name text,p_currency text default 'NGN')
returns uuid language plpgsql security definer set search_path = public as $$
declare v_org_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_name is null or char_length(trim(p_name)) < 1 or char_length(trim(p_name)) > 120 then raise exception 'Workspace name must be between 1 and 120 characters'; end if;
  if p_currency not in ('NGN','USD','GBP','EUR','GHS','KES','ZAR') then raise exception 'Unsupported currency'; end if;
  insert into public.bi_profiles(id,full_name) values (auth.uid(),null) on conflict (id) do nothing;
  insert into public.bi_organizations(name,currency,created_by) values (trim(p_name),p_currency,auth.uid()) returning id into v_org_id;
  insert into public.bi_organization_members(organization_id,user_id,role) values (v_org_id,auth.uid(),'owner');
  insert into public.bi_audit_logs(organization_id,actor_id,action,entity,detail) values (v_org_id,auth.uid(),'workspace.created','organization',jsonb_build_object('name',trim(p_name),'currency',p_currency));
  return v_org_id;
end;
$$;
revoke all on function public.bi_create_workspace(text,text) from public;
grant execute on function public.bi_create_workspace(text,text) to authenticated;
