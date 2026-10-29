-- BusinessIQ geographic analytics extension.
-- Safe additive migration: existing transaction data and access policies remain unchanged.
alter table public.bi_transactions
  add column if not exists city text,
  add column if not exists region text,
  add column if not exists country text;

alter table public.bi_transactions
  drop constraint if exists bi_transactions_city_length,
  drop constraint if exists bi_transactions_region_length,
  drop constraint if exists bi_transactions_country_length;

alter table public.bi_transactions
  add constraint bi_transactions_city_length check (city is null or char_length(city) <= 100),
  add constraint bi_transactions_region_length check (region is null or char_length(region) <= 100),
  add constraint bi_transactions_country_length check (country is null or char_length(country) <= 100);

create index if not exists bi_transactions_org_country_region_city_idx
  on public.bi_transactions (organization_id, country, region, city);

comment on column public.bi_transactions.city is 'Optional transaction city for geographic analytics.';
comment on column public.bi_transactions.region is 'Optional state, province, or region for geographic analytics.';
comment on column public.bi_transactions.country is 'Optional country for geographic analytics.';
