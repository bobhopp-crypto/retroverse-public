-- Lightweight workflow tables for /ops (triage + operational memory)
-- This repo does not run migrations automatically; apply manually to your Postgres/Supabase DB.

create table if not exists public.workflow_items (
  id uuid primary key default gen_random_uuid(),
  workflow_type text not null,
  entity_type text not null,
  entity_id text not null,
  status text not null default 'open',
  priority int not null default 100,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workflow_items_workflow_type_idx
  on public.workflow_items (workflow_type);

create index if not exists workflow_items_status_priority_idx
  on public.workflow_items (status, priority, updated_at desc);

create table if not exists public.workflow_events (
  id uuid primary key default gen_random_uuid(),
  workflow_item_id uuid not null references public.workflow_items(id) on delete cascade,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists workflow_events_item_created_idx
  on public.workflow_events (workflow_item_id, created_at desc);

