-- Separate table for global admins (explicit, can't be accidentally triggered)
create table if not exists public.global_admins (
  id uuid primary key default gen_random_uuid(),
  user_email text not null unique,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.global_admins enable row level security;

-- Only authenticated users can view (needed for RLS checks)
create policy "Authenticated users can check global admin status"
  on public.global_admins for select
  to authenticated
  using (true);

-- Update RLS policy to allow global admins to access all books
drop policy if exists "Users can view books they have access to" on public.books;
create policy "Users can view books they have access to"
  on public.books for select
  using (
    exists (
      select 1 from public.global_admins
      where global_admins.user_id = auth.uid() or global_admins.user_email = auth.email()
    )
    or exists (
      select 1 from public.book_access
      where book_access.book_id = books.id
        and (book_access.user_id = auth.uid() or book_access.user_email = auth.email())
    )
  );

-- Update chapters policy for global admins
drop policy if exists "Users can view chapters of accessible books" on public.chapters;
create policy "Users can view chapters of accessible books"
  on public.chapters for select
  using (
    exists (
      select 1 from public.global_admins
      where global_admins.user_id = auth.uid() or global_admins.user_email = auth.email()
    )
    or exists (
      select 1 from public.book_access
      where book_access.book_id = chapters.book_id
        and (book_access.user_id = auth.uid() or book_access.user_email = auth.email())
    )
  );

-- Update comments policy for global admins
drop policy if exists "Users can view comments on accessible books" on public.comments;
create policy "Users can view comments on accessible books"
  on public.comments for select
  using (
    exists (
      select 1 from public.global_admins
      where global_admins.user_id = auth.uid()
    )
    or exists (
      select 1 from public.book_access
      where book_access.book_id = comments.book_id
        and book_access.user_id = auth.uid()
    )
  );

drop policy if exists "Admins can view all comments" on public.comments;
create policy "Admins can view all comments"
  on public.comments for select
  using (
    exists (select 1 from public.global_admins where user_id = auth.uid())
  );

-- Update reading_progress policy for global admins
drop policy if exists "Admins can view all reading progress" on public.reading_progress;
create policy "Admins can view all reading progress"
  on public.reading_progress for select
  using (
    exists (select 1 from public.global_admins where user_id = auth.uid())
  );

-- Update book_access management for global admins
drop policy if exists "Admins can manage book access" on public.book_access;
create policy "Admins can manage book access"
  on public.book_access for all
  using (
    exists (select 1 from public.global_admins where user_id = auth.uid())
  );

-- Update books management for global admins
drop policy if exists "Admins can manage books" on public.books;
create policy "Admins can manage books"
  on public.books for all
  using (
    exists (select 1 from public.global_admins where user_id = auth.uid())
  );

-- Update chapters management for global admins
drop policy if exists "Admins can manage chapters" on public.chapters;
create policy "Admins can manage chapters"
  on public.chapters for all
  using (
    exists (select 1 from public.global_admins where user_id = auth.uid())
  );

-- Update check_email_has_access to include global admins
create or replace function public.check_email_has_access(check_email text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.book_access
    where user_email = lower(check_email)
  )
  or exists (
    select 1 from public.global_admins
    where user_email = lower(check_email)
  );
$$;

-- Link user_id when global admin signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Link book_access entries
  update public.book_access
  set user_id = new.id
  where lower(user_email) = lower(new.email)
    and user_id is null;

  -- Link global_admins entry
  update public.global_admins
  set user_id = new.id
  where lower(user_email) = lower(new.email)
    and user_id is null;

  return new;
end;
$$;
