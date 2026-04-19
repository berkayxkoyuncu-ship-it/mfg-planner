-- Manufacturing Planning Tool — Supabase Schema
-- Run this in your Supabase SQL Editor

-- Lines table
create table if not exists lines (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('internal', 'external')),
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Orders table
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  style text not null,
  quantity int not null check (quantity > 0),
  daily_capacity int not null check (daily_capacity > 0),
  days_needed int generated always as (ceil(quantity::numeric / daily_capacity::numeric)::int) stored,
  target_ship_date date,
  line_id uuid references lines(id) on delete set null,
  start_date date,
  end_date date generated always as (
    case when start_date is not null
    then start_date + (ceil(quantity::numeric / daily_capacity::numeric)::int - 1)
    else null end
  ) stored,
  status text not null default 'planned' check (status in ('planned', 'in_progress', 'completed')),
  color text not null default '#6366f1',
  created_at timestamptz not null default now()
);

-- Daily actuals table
create table if not exists daily_actuals (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  line_id uuid not null references lines(id) on delete cascade,
  date date not null,
  actual_qty int not null default 0 check (actual_qty >= 0),
  created_at timestamptz not null default now(),
  unique (order_id, line_id, date)
);

-- Enable Row Level Security (open access since no auth)
alter table lines enable row level security;
alter table orders enable row level security;
alter table daily_actuals enable row level security;

create policy "Public access" on lines for all using (true) with check (true);
create policy "Public access" on orders for all using (true) with check (true);
create policy "Public access" on daily_actuals for all using (true) with check (true);

-- Seed 3 internal lines
insert into lines (name, type, sort_order) values
  ('Line 1', 'internal', 1),
  ('Line 2', 'internal', 2),
  ('Line 3', 'internal', 3)
on conflict do nothing;

-- Brands table
create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Enable Row Level Security for brands
alter table brands enable row level security;
create policy "Public access" on brands for all using (true) with check (true);

-- Seed default brands
insert into brands (name, sort_order) values
  ('Mavi', 1),
  ('Opus', 2),
  ('RAG AND BONE', 3),
  ('REISS', 4),
  ('Bamigo', 5)
on conflict do nothing;

-- Add ana_marka column to orders (nullable so existing orders aren't broken)
alter table orders add column if not exists ana_marka text;
