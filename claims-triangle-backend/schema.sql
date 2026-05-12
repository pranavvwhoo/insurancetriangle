-- Claims Triangle Analytics Platform — Supabase Schema
-- Paste into Supabase SQL Editor and run

create extension if not exists "uuid-ossp";

create table if not exists projects (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  parameters  jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists column_mappings (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid not null references projects(id) on delete cascade,
  mapping     jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  unique(project_id)
);

create table if not exists uploaded_data (
  id          bigserial primary key,
  project_id  uuid not null references projects(id) on delete cascade,
  row_data    jsonb not null
);
create index if not exists idx_uploaded_data_project_id on uploaded_data(project_id);

create table if not exists view_states (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid not null references projects(id) on delete cascade,
  granularity text not null default 'monthly',
  metric      text not null default 'paid',
  filters     jsonb not null default '{}'::jsonb,
  scale       text not null default 'units',
  decimals    int  not null default 0,
  updated_at  timestamptz not null default now(),
  unique(project_id)
);

-- Single-user app: RLS disabled
alter table projects        disable row level security;
alter table column_mappings disable row level security;
alter table uploaded_data   disable row level security;
alter table view_states     disable row level security;
