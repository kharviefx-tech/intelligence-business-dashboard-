-- BusinessIQ public API rate limiting.
-- One row per credential; atomic upsert keeps the limit consistent across serverless instances.
create table if not exists public.bi_api_rate_limits (
  credential_id text primary key,
  window_started_at timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now()
);
create index if not exists bi_api_rate_limits_updated_idx
  on public.bi_api_rate_limits(updated_at);
