create table public.companies (
  user_id uuid primary key default auth.uid(),
  name text not null default '',
  document text not null default '',
  phone text not null default '',
  email text not null default '',
  address text not null default '',
  pix text not null default '',
  website text not null default '',
  default_notes text not null default '',
  logo_url text,
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.companies to authenticated;
grant all on public.companies to service_role;
alter table public.companies enable row level security;
create policy "own company" on public.companies for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  number text not null,
  client_name text not null default '',
  total numeric not null default 0,
  status text not null default 'rascunho',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.quotes to authenticated;
grant all on public.quotes to service_role;
alter table public.quotes enable row level security;
create policy "own quotes" on public.quotes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create index quotes_user_idx on public.quotes(user_id, created_at desc);

create table public.quote_counters (
  user_id uuid not null,
  year int not null,
  last int not null default 0,
  primary key (user_id, year)
);
grant all on public.quote_counters to service_role;
alter table public.quote_counters enable row level security;

create or replace function public.next_quote_number()
returns text language plpgsql security definer set search_path = public as $$
declare y int := extract(year from now())::int; n int;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into quote_counters(user_id, year, last) values (auth.uid(), y, 1)
  on conflict (user_id, year) do update set last = quote_counters.last + 1
  returning last into n;
  return lpad(n::text, 4, '0') || '/' || y::text;
end $$;
revoke all on function public.next_quote_number() from public, anon;
grant execute on function public.next_quote_number() to authenticated;