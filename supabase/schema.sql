-- Invoice Tool — Supabase schema
-- Run this in the Supabase SQL Editor (or via the CLI: supabase db push).

-- Profiles: one row per auth user, tracks their billing plan.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  plan text not null default 'free',
  plan_updated_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Invoices: all invoice data. from/to/items stored as jsonb for flexibility.
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  invoice_number text not null,
  issue_date date,
  due_date date,
  currency text default 'USD',
  tax_rate numeric default 0,
  discount numeric default 0,
  discount_type text default 'flat',
  status text default 'draft',
  template text default '1',
  from_json jsonb,
  to_json jsonb,
  items jsonb,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists invoices_user_id_idx on public.invoices (user_id);
create index if not exists invoices_created_at_idx on public.invoices (created_at);

-- Row Level Security (defense in depth — the app uses the service role,
-- which bypasses RLS, but these policies keep direct client access safe).
alter table public.profiles enable row level security;
alter table public.invoices enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "invoices_select_own" on public.invoices;
create policy "invoices_select_own" on public.invoices
  for select using (auth.uid() = user_id);

drop policy if exists "invoices_insert_own" on public.invoices;
create policy "invoices_insert_own" on public.invoices
  for insert with check (auth.uid() = user_id);

drop policy if exists "invoices_update_own" on public.invoices;
create policy "invoices_update_own" on public.invoices
  for update using (auth.uid() = user_id);

drop policy if exists "invoices_delete_own" on public.invoices;
create policy "invoices_delete_own" on public.invoices
  for delete using (auth.uid() = user_id);
