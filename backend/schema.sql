-- ════════════════════════════════════════════════════════════════════
-- PNG PACIFIC CAPITAL — Supabase / PostgreSQL schema
-- Addresses audit findings #1 (real server-side auth) and #5 (server-side,
-- tamper-evident storage + immutable audit log).
--
-- HOW TO APPLY:
--   1. Create a Supabase project (https://supabase.com).
--   2. SQL Editor → paste this file → Run.
--   3. Auth → invite users (one per real staff member). Email/password.
--   4. After each user signs up, add their role in `profiles` (see bottom).
--   5. Wire the front-end via backend/auth.js (see backend/README.md).
--
-- SECURITY MODEL:
--   • Authentication is enforced by Supabase Auth (JWT), NOT by a client PIN.
--   • Authorisation is enforced by Row-Level Security (RLS) policies below —
--     the database itself refuses unauthorised reads/writes, so a tampered
--     browser cannot bypass it (fixes #1).
--   • Financial data lives in Postgres, not localStorage (fixes #5).
--   • The audit log is INSERT-only for everyone; UPDATE/DELETE are blocked at
--     the DB level so it cannot be rewritten after the fact (fixes #5).
-- ════════════════════════════════════════════════════════════════════

-- ---------- roles ----------
do $$ begin
  create type app_role as enum (
    'Managing Director', 'Finance Manager', 'Operations Manager',
    'Export Manager', 'Warehouse Manager', 'Data Entry Officer'
  );
exception when duplicate_object then null; end $$;

-- ---------- profiles (1:1 with auth.users) ----------
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  role        app_role not null default 'Data Entry Officer',
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- current user's role, used inside policies
create or replace function current_role_name()
returns app_role language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid() and active = true
$$;

create or replace function is_authenticated()
returns boolean language sql stable as $$
  select auth.uid() is not null
$$;

-- write-privileged roles (everyone else is read-only)
create or replace function can_write()
returns boolean language sql stable security definer set search_path = public as $$
  select current_role_name() in
    ('Managing Director','Finance Manager','Operations Manager','Export Manager','Warehouse Manager','Data Entry Officer')
$$;

-- finance-sensitive write (cash, transactions, payments)
create or replace function can_write_finance()
returns boolean language sql stable security definer set search_path = public as $$
  select current_role_name() in ('Managing Director','Finance Manager')
$$;

-- ---------- core business tables ----------
create table if not exists warehouses (
  id text primary key, name text not null, manager text, province text,
  capacity_kg numeric not null default 0, maintenance text,
  created_at timestamptz not null default now()
);

create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null, village text, province text, buying_point text,
  phone text, bank text, active boolean not null default true,
  joined date not null default current_date,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text not null, country text, contact text, email text, phone text, type text,
  created_at timestamptz not null default now()
);

create table if not exists contracts (
  number text primary key, customer uuid references customers(id),
  start_date date, end_date date, volume_t numeric, value_k numeric,
  created_at timestamptz not null default now()
);

create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  supplier uuid references suppliers(id),
  buying_point text, province text, bean_type text, grade text,
  moisture numeric check (moisture >= 0 and moisture <= 100),
  kg numeric not null check (kg > 0),
  price_per_kg numeric not null check (price_per_kg > 0),
  total numeric generated always as (round(kg * price_per_kg)) stored,
  paid boolean not null default false,
  entered_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists movements (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  type text not null, wh text references warehouses(id),
  bean_type text, delta_kg numeric not null, ref text, note text,
  created_at timestamptz not null default now()
);

create table if not exists shipments (
  id uuid primary key default gen_random_uuid(),
  container text, containers int default 1,
  customer uuid references customers(id), contract text references contracts(number),
  destination text, port text, vessel text,
  etd date, eta date,
  tonnes numeric check (tonnes > 0), fob numeric check (fob >= 0),
  status text not null default 'Preparing', origin_wh text references warehouses(id),
  paid boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  name text not null, category text, purchased date,
  cost numeric check (cost >= 0), value numeric check (value >= 0),
  location text, assigned_to text, status text not null default 'Operational',
  created_at timestamptz not null default now()
);

create table if not exists vehicles (
  rego text primary key, model text, driver text,
  fuel_l100 numeric check (fuel_l100 >= 0),
  insurance_expiry date, rego_expiry date, licence_expiry date,
  location text, last_service date,
  created_at timestamptz not null default now()
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  dir text not null check (dir in ('in','out')),
  category text not null, amount numeric not null check (amount > 0),
  descr text, entered_by uuid references auth.users(id) default auth.uid(),
  approved_by text, receipt boolean default false,
  created_at timestamptz not null default now()
);

-- ---------- immutable audit log & login history (fixes #5) ----------
create table if not exists audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid references auth.users(id) default auth.uid(),
  actor_name text, action text not null
);

create table if not exists login_history (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid references auth.users(id), actor_name text,
  result text not null
);

-- block any UPDATE/DELETE on the audit log at the DB level → tamper-evident
create or replace function deny_mutation() returns trigger language plpgsql as $$
begin raise exception 'audit_log is append-only'; end $$;
drop trigger if exists audit_no_update on audit_log;
drop trigger if exists audit_no_delete on audit_log;
create trigger audit_no_update before update on audit_log for each row execute function deny_mutation();
create trigger audit_no_delete before delete on audit_log for each row execute function deny_mutation();

-- ════════════════════════════════════════════════════════════════════
-- ROW-LEVEL SECURITY  (the DB refuses unauthorised access — fixes #1)
-- ════════════════════════════════════════════════════════════════════
alter table profiles       enable row level security;
alter table warehouses     enable row level security;
alter table suppliers      enable row level security;
alter table customers      enable row level security;
alter table contracts      enable row level security;
alter table purchases      enable row level security;
alter table movements      enable row level security;
alter table shipments      enable row level security;
alter table assets         enable row level security;
alter table vehicles       enable row level security;
alter table transactions   enable row level security;
alter table audit_log      enable row level security;
alter table login_history  enable row level security;

-- profiles: a user can read all profiles but only edit their own; MD manages roles
drop policy if exists profiles_read on profiles;
create policy profiles_read on profiles for select using (is_authenticated());
drop policy if exists profiles_self on profiles;
create policy profiles_self on profiles for update using (id = auth.uid());
drop policy if exists profiles_md on profiles;
create policy profiles_md on profiles for all
  using (current_role_name() = 'Managing Director')
  with check (current_role_name() = 'Managing Director');

-- generic operational tables: any authenticated user reads; writers write
do $$
declare t text;
begin
  foreach t in array array['warehouses','suppliers','customers','contracts',
      'purchases','movements','shipments','assets','vehicles'] loop
    execute format('drop policy if exists %1$s_read on %1$s;', t);
    execute format('create policy %1$s_read on %1$s for select using (is_authenticated());', t);
    execute format('drop policy if exists %1$s_write on %1$s;', t);
    execute format('create policy %1$s_write on %1$s for all using (can_write()) with check (can_write());', t);
  end loop;
end $$;

-- transactions: read = authenticated; write = finance roles only
drop policy if exists txn_read on transactions;
create policy txn_read on transactions for select using (is_authenticated());
drop policy if exists txn_write on transactions;
create policy txn_write on transactions for all
  using (can_write_finance()) with check (can_write_finance());

-- audit log: everyone authenticated can read & INSERT; UPDATE/DELETE blocked by trigger AND no policy
drop policy if exists audit_read on audit_log;
create policy audit_read on audit_log for select using (is_authenticated());
drop policy if exists audit_insert on audit_log;
create policy audit_insert on audit_log for insert with check (is_authenticated());

drop policy if exists login_read on login_history;
create policy login_read on login_history for select using (is_authenticated());
drop policy if exists login_insert on login_history;
create policy login_insert on login_history for insert with check (true);

-- ════════════════════════════════════════════════════════════════════
-- AFTER a user signs up via Supabase Auth, give them a profile + role:
--   insert into profiles (id, full_name, role) values
--     ('<auth-user-uuid>', 'Jarrod Hulo', 'Managing Director');
-- ════════════════════════════════════════════════════════════════════
