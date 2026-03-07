-- Schema v1: SOP execution tracking
-- Jalankan di Supabase SQL Editor

create table if not exists public.manual_runs (
  id uuid primary key default gen_random_uuid(),
  manual_id text not null,
  manual_title text,
  manual_version text,
  operator_id uuid,
  operator_name text,
  device_label text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'aborted')),
  source text,
  created_at timestamptz not null default now()
);

create table if not exists public.manual_run_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.manual_runs(id) on delete cascade,
  step_index int not null,
  step_title text,
  is_checked boolean not null default false,
  check_time timestamptz,
  input_number numeric,
  result_status text not null default 'na' check (result_status in ('pass', 'fail', 'na')),
  note_text text,
  evidence_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_id, step_index)
);

create index if not exists idx_manual_runs_operator_started
  on public.manual_runs(operator_id, started_at desc);

create index if not exists idx_manual_runs_started
  on public.manual_runs(started_at desc);

create index if not exists idx_manual_run_steps_run_step
  on public.manual_run_steps(run_id, step_index);

create or replace function public.touch_manual_run_steps_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_manual_run_steps_updated_at on public.manual_run_steps;
create trigger trg_touch_manual_run_steps_updated_at
before update on public.manual_run_steps
for each row execute function public.touch_manual_run_steps_updated_at();
