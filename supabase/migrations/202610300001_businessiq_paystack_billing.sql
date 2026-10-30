-- BusinessIQ Paystack billing schema and atomic activation.
-- This migration is additive and only touches BusinessIQ's bi_* tables.

alter table public.bi_organizations
  drop constraint if exists bi_organizations_plan_check;
alter table public.bi_organizations
  add constraint bi_organizations_plan_check
  check (plan in ('Free','Starter','Professional','Business','Enterprise'));

create table if not exists public.bi_payment_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.bi_organizations(id) on delete cascade,
  provider text not null default 'paystack' check (provider = 'paystack'),
  reference text not null unique,
  plan text not null check (plan in ('Starter','Professional','Business')),
  billing_interval text not null check (billing_interval in ('month','year')),
  amount_kobo bigint not null check (amount_kobo > 0),
  currency text not null default 'NGN' check (currency = 'NGN'),
  status text not null default 'initialized' check (status in ('initialized','paid','failed','abandoned')),
  authorization_url text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bi_payment_attempts_user_created_idx
  on public.bi_payment_attempts(user_id, created_at desc);
create index if not exists bi_payment_attempts_org_created_idx
  on public.bi_payment_attempts(organization_id, created_at desc);

create table if not exists public.bi_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.bi_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  provider text not null default 'paystack' check (provider = 'paystack'),
  plan text not null check (plan in ('Starter','Professional','Business')),
  billing_interval text not null check (billing_interval in ('month','year')),
  status text not null default 'active' check (status in ('active','expired','cancelled','past_due')),
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  latest_payment_reference text not null unique references public.bi_payment_attempts(reference),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bi_payment_attempts enable row level security;
alter table public.bi_subscriptions enable row level security;

drop policy if exists bi_payment_attempts_select_own on public.bi_payment_attempts;
create policy bi_payment_attempts_select_own
  on public.bi_payment_attempts for select to authenticated
  using (user_id = auth.uid());

drop policy if exists bi_subscriptions_select_member on public.bi_subscriptions;
create policy bi_subscriptions_select_member
  on public.bi_subscriptions for select to authenticated
  using (public.bi_is_member(organization_id));

revoke all on public.bi_payment_attempts, public.bi_subscriptions from anon, authenticated;
grant select on public.bi_payment_attempts, public.bi_subscriptions to authenticated;
grant all on public.bi_payment_attempts, public.bi_subscriptions to service_role;

create or replace function public.bi_activate_subscription_from_verified_payment(p_reference text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.bi_payment_attempts%rowtype;
  v_start timestamptz := now();
  v_end timestamptz;
  v_subscription public.bi_subscriptions%rowtype;
begin
  select * into v_attempt
  from public.bi_payment_attempts
  where reference = p_reference
  for update;

  if not found then
    raise exception 'Payment reference not found';
  end if;

  if v_attempt.status = 'paid' then
    select * into v_subscription
    from public.bi_subscriptions
    where organization_id = v_attempt.organization_id;

    if not found then
      raise exception 'Paid payment has no subscription record; contact support';
    end if;

    return jsonb_build_object(
      'status', v_subscription.status,
      'plan', v_subscription.plan,
      'current_period_end', v_subscription.current_period_end,
      'already_processed', true
    );
  end if;

  if v_attempt.status <> 'initialized' then
    raise exception 'Payment attempt is not eligible for activation';
  end if;

  if v_attempt.billing_interval = 'year' then
    v_end := v_start + interval '1 year';
  else
    v_end := v_start + interval '1 month';
  end if;

  update public.bi_payment_attempts
  set status = 'paid', paid_at = v_start, updated_at = v_start
  where id = v_attempt.id;

  insert into public.bi_subscriptions (
    organization_id, user_id, provider, plan, billing_interval, status,
    current_period_start, current_period_end, latest_payment_reference
  ) values (
    v_attempt.organization_id, v_attempt.user_id, 'paystack', v_attempt.plan,
    v_attempt.billing_interval, 'active', v_start, v_end, v_attempt.reference
  )
  on conflict (organization_id) do update set
    user_id = excluded.user_id,
    provider = excluded.provider,
    plan = excluded.plan,
    billing_interval = excluded.billing_interval,
    status = 'active',
    current_period_start = excluded.current_period_start,
    current_period_end = excluded.current_period_end,
    latest_payment_reference = excluded.latest_payment_reference,
    updated_at = excluded.current_period_start
  returning * into v_subscription;

  update public.bi_organizations
  set plan = v_attempt.plan
  where id = v_attempt.organization_id;

  return jsonb_build_object(
    'status', v_subscription.status,
    'plan', v_subscription.plan,
    'current_period_end', v_subscription.current_period_end,
    'already_processed', false
  );
end;
$$;

revoke all on function public.bi_activate_subscription_from_verified_payment(text) from public, anon, authenticated;
grant execute on function public.bi_activate_subscription_from_verified_payment(text) to service_role;
