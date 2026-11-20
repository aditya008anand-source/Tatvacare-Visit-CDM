-- Run this once in the Supabase SQL editor for your project.

-- Profile table: one row per registered person, linked to Supabase Auth.
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null default 'pending' check (role in ('pending', 'admin', 'rm', 'dispatch')),
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

-- Everyone who is logged in can see their own row (to check their own role/status).
create policy "users can read own row"
  on public.users for select
  using (auth.uid() = id);

-- Admins can read every row (to show the approvals list).
create policy "admins can read all users"
  on public.users for select
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

-- Admins can update any row (to approve / change role).
create policy "admins can update users"
  on public.users for update
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

-- A new row is created by the signup flow itself for that same user only.
create policy "a user can insert their own row once"
  on public.users for insert
  with check (auth.uid() = id);
