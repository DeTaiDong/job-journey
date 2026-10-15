-- 在 Supabase SQL Editor 中执行。每条记录始终绑定登录用户。
create extension if not exists pgcrypto;

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company text not null check (char_length(company) between 1 and 100),
  role text not null check (char_length(role) between 1 and 150),
  status text not null default '已投递' check (status in ('已投递','笔试','面试','Offer','已结束')),
  applied_at date not null default current_date,
  job_url text,
  platform text,
  notes text,
  password_ciphertext text,
  password_iv text,
  password_salt text,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  type text not null check (type in ('笔试','技术面','HR面','综合面','其他')),
  starts_at timestamptz not null,
  location text,
  notes text,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists applications_user_date_idx on public.applications(user_id, applied_at desc);
create index if not exists events_user_start_idx on public.events(user_id, starts_at);

alter table public.applications enable row level security;
alter table public.events enable row level security;

revoke all on public.applications, public.events from anon, authenticated;
grant select, insert, update, delete on public.applications, public.events to authenticated;

create policy "applications_select_own" on public.applications for select to authenticated using (auth.uid() = user_id);
create policy "applications_insert_own" on public.applications for insert to authenticated with check (auth.uid() = user_id);
create policy "applications_update_own" on public.applications for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "applications_delete_own" on public.applications for delete to authenticated using (auth.uid() = user_id);

create policy "events_select_own" on public.events for select to authenticated using (auth.uid() = user_id);
create policy "events_insert_own" on public.events for insert to authenticated with check (auth.uid() = user_id and exists (select 1 from public.applications a where a.id = application_id and a.user_id = auth.uid()));
create policy "events_update_own" on public.events for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id and exists (select 1 from public.applications a where a.id = application_id and a.user_id = auth.uid()));
create policy "events_delete_own" on public.events for delete to authenticated using (auth.uid() = user_id);
