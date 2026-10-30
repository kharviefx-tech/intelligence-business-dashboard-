-- BusinessIQ company profile fields for customer onboarding.
-- Additive only; existing workspaces remain valid.
alter table public.bi_organizations
  add column if not exists industry text,
  add column if not exists company_size text,
  add column if not exists website text,
  add column if not exists country text,
  add column if not exists fiscal_year_start_month integer not null default 1;

alter table public.bi_organizations
  drop constraint if exists bi_organizations_industry_length,
  drop constraint if exists bi_organizations_company_size_valid,
  drop constraint if exists bi_organizations_website_length,
  drop constraint if exists bi_organizations_country_length,
  drop constraint if exists bi_organizations_fiscal_month_valid;

alter table public.bi_organizations
  add constraint bi_organizations_industry_length check (industry is null or char_length(industry) <= 100),
  add constraint bi_organizations_company_size_valid check (company_size is null or company_size in ('1','2-10','11-50','51-200','201-500','501-1000','1000+')),
  add constraint bi_organizations_website_length check (website is null or char_length(website) <= 255),
  add constraint bi_organizations_country_length check (country is null or char_length(country) <= 100),
  add constraint bi_organizations_fiscal_month_valid check (fiscal_year_start_month between 1 and 12);

create or replace function public.bi_create_workspace(
  p_name text,
  p_currency text default 'NGN',
  p_industry text default null,
  p_company_size text default null,
  p_website text default null,
  p_country text default null,
  p_fiscal_year_start_month integer default 1
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_org_id uuid;
  v_website text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_name is null or char_length(trim(p_name)) < 2 or char_length(trim(p_name)) > 120 then
    raise exception 'Company name must be between 2 and 120 characters';
  end if;
  if p_currency not in ('NGN','USD','GBP','EUR','GHS','KES','ZAR') then raise exception 'Unsupported currency'; end if;
  if p_company_size is not null and p_company_size not in ('1','2-10','11-50','51-200','201-500','501-1000','1000+') then raise exception 'Choose a valid company size'; end if;
  if p_fiscal_year_start_month is null or p_fiscal_year_start_month < 1 or p_fiscal_year_start_month > 12 then raise exception 'Fiscal year start month must be between 1 and 12'; end if;
  v_website := nullif(trim(p_website), '');
  if v_website is not null and v_website !~* '^https?://' then v_website := 'https://' || v_website; end if;
  if v_website is not null and (char_length(v_website) > 255 or v_website !~* '^https?://[^[:space:]/]+([/:?#][^[:space:]]*)?$') then raise exception 'Enter a valid company website'; end if;
  insert into public.bi_profiles(id,full_name) values (auth.uid(),null) on conflict (id) do nothing;
  insert into public.bi_organizations(name,currency,created_by,industry,company_size,website,country,fiscal_year_start_month)
  values (trim(p_name),p_currency,auth.uid(),nullif(trim(p_industry),''),p_company_size,v_website,nullif(trim(p_country),''),p_fiscal_year_start_month)
  returning id into v_org_id;
  insert into public.bi_organization_members(organization_id,user_id,role) values (v_org_id,auth.uid(),'owner');
  insert into public.bi_audit_logs(organization_id,actor_id,action,entity,detail)
  values (v_org_id,auth.uid(),'workspace.created','organization',jsonb_build_object('name',trim(p_name),'currency',p_currency,'industry',nullif(trim(p_industry),''),'country',nullif(trim(p_country),'')));
  return v_org_id;
end;
$$;
revoke all on function public.bi_create_workspace(text,text,text,text,text,text,integer) from public, anon;
grant execute on function public.bi_create_workspace(text,text,text,text,text,text,integer) to authenticated;
comment on column public.bi_organizations.industry is 'Optional industry classification provided by the customer.';
comment on column public.bi_organizations.company_size is 'Optional employee-count band provided by the customer.';
comment on column public.bi_organizations.website is 'Optional public company website.';
comment on column public.bi_organizations.country is 'Country selected for the company profile; not inferred.';
comment on column public.bi_organizations.fiscal_year_start_month is 'First month of the company financial year (1=January).';
