-- Run this once in the Supabase SQL editor for your project.

create table if not exists public.call_logs (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  created_by uuid references public.users(id),
  outcome text not null check (outcome in ('Connected', 'Not connected', 'Requested callback', 'Address provided')),
  comment text,
  created_at timestamptz not null default now()
);

alter table public.call_logs enable row level security;

grant select, insert on public.call_logs to authenticated;
grant select, insert, update, delete on public.call_logs to service_role;

create policy "admins can read all call logs"
  on public.call_logs for select
  using (public.is_admin());

create policy "admins can insert call logs"
  on public.call_logs for insert
  with check (public.is_admin());

create policy "rms can read call logs on their leads"
  on public.call_logs for select
  using (
    exists (
      select 1 from public.leads
      where leads.id = call_logs.lead_id
      and leads.rm_id = auth.uid()
    )
  );

create policy "rms can insert call logs on their leads"
  on public.call_logs for insert
  with check (
    exists (
      select 1 from public.leads
      where leads.id = call_logs.lead_id
      and leads.rm_id = auth.uid()
    )
  );
