-- Run this once in the Supabase SQL editor for your project.

alter table public.leads add column if not exists order_id text;
alter table public.leads add column if not exists awb text;

create policy "rms can update own leads"
  on public.leads for update
  using (rm_id = auth.uid());
