-- Run this once in the Supabase SQL editor for your project.

alter table public.users add column if not exists rm_rank integer;
