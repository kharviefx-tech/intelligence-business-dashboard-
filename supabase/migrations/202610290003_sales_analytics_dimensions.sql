-- BusinessIQ sales analytics dimensions.
-- Additive only: preserves existing transactions and access policies.
alter table public.bi_transactions
  add column if not exists sub_category text,
  add column if not exists customer_segment text;

alter table public.bi_transactions
  drop constraint if exists bi_transactions_sub_category_length,
  drop constraint if exists bi_transactions_customer_segment_length;

alter table public.bi_transactions
  add constraint bi_transactions_sub_category_length
    check (sub_category is null or char_length(sub_category) <= 120),
  add constraint bi_transactions_customer_segment_length
    check (customer_segment is null or char_length(customer_segment) <= 80);

create index if not exists bi_transactions_org_sales_category_idx
  on public.bi_transactions (organization_id, currency, kind, status, category, sub_category);

create index if not exists bi_transactions_org_customer_segment_idx
  on public.bi_transactions (organization_id, currency, customer_segment);

comment on column public.bi_transactions.sub_category is 'Optional product/service sub-category used for sales analytics.';
comment on column public.bi_transactions.customer_segment is 'Optional customer segment used for sales analytics.';
