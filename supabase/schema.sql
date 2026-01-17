-- ============================================
-- Book Review Platform - Database Schema
-- ============================================
-- Run this in your Supabase SQL Editor to set up the database

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Books table
create table if not exists public.books (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  title text not null,
  description text,
  version text not null default 'v0.1',
  version_name text,
  changelog jsonb default '[]'::jsonb,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Chapters metadata
create table if not exists public.chapters (
  id uuid primary key default uuid_generate_v4(),
  book_id uuid references public.books(id) on delete cascade not null,
  slug text not null,
  number int not null,
  title text not null,
  status text not null default 'draft',
  word_count int,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(book_id, slug)
);

-- Book access (who can read what)
-- Note: user_email is used for invite-only flow before user signs up
create table if not exists public.book_access (
  id uuid primary key default uuid_generate_v4(),
  book_id uuid references public.books(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade,
  user_email text not null,
  role text not null default 'reader',
  invited_at timestamptz default now(),
  invited_by uuid references auth.users(id),
  unique(book_id, user_email)
);

-- Comments (inline annotations)
create table if not exists public.comments (
  id uuid primary key default uuid_generate_v4(),
  book_id uuid references public.books(id) on delete cascade not null,
  chapter_slug text not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  anchor_text text not null,
  anchor_start int,
  anchor_end int,
  anchor_paragraph text,
  content text not null,
  parent_id uuid references public.comments(id) on delete cascade,
  is_resolved boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Reading progress
create table if not exists public.reading_progress (
  id uuid primary key default uuid_generate_v4(),
  book_id uuid references public.books(id) on delete cascade not null,
  chapter_slug text not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  scroll_pct int default 0,
  time_spent_seconds int default 0,
  started_at timestamptz default now(),
  last_read_at timestamptz default now(),
  completed_at timestamptz,
  unique(book_id, chapter_slug, user_id)
);

-- Reading sessions (for detailed analytics)
create table if not exists public.reading_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  book_id uuid references public.books(id) on delete cascade not null,
  chapter_slug text not null,
  started_at timestamptz default now(),
  ended_at timestamptz,
  max_scroll_pct int default 0,
  user_agent text,
  viewport_width int,
  viewport_height int
);

-- ============================================
-- INDEXES
-- ============================================

create index if not exists idx_chapters_book on public.chapters(book_id);
create index if not exists idx_comments_book_chapter on public.comments(book_id, chapter_slug);
create index if not exists idx_comments_user on public.comments(user_id);
create index if not exists idx_reading_progress_user on public.reading_progress(user_id);
create index if not exists idx_reading_progress_book on public.reading_progress(book_id);
create index if not exists idx_book_access_user on public.book_access(user_id);
create index if not exists idx_book_access_email on public.book_access(user_email);
create index if not exists idx_reading_sessions_user on public.reading_sessions(user_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

alter table public.books enable row level security;
alter table public.chapters enable row level security;
alter table public.book_access enable row level security;
alter table public.comments enable row level security;
alter table public.reading_progress enable row level security;
alter table public.reading_sessions enable row level security;

-- Books: readable if user has access
create policy "Users can view books they have access to"
  on public.books for select
  using (
    id in (
      select book_id from public.book_access
      where user_id = auth.uid() or user_email = auth.email()
    )
  );

-- Chapters: readable if user has access to the book
create policy "Users can view chapters of accessible books"
  on public.chapters for select
  using (
    book_id in (
      select book_id from public.book_access
      where user_id = auth.uid() or user_email = auth.email()
    )
  );

-- Book access: users can see their own access
create policy "Users can view their own access"
  on public.book_access for select
  using (user_id = auth.uid() or user_email = auth.email());

-- Comments: users can view comments on books they have access to
create policy "Users can view comments on accessible books"
  on public.comments for select
  using (
    book_id in (
      select book_id from public.book_access
      where user_id = auth.uid() or user_email = auth.email()
    )
  );

-- Comments: users can insert their own comments
create policy "Users can create comments"
  on public.comments for insert
  with check (
    user_id = auth.uid() and
    book_id in (
      select book_id from public.book_access
      where user_id = auth.uid() or user_email = auth.email()
    )
  );

-- Comments: users can update their own comments
create policy "Users can update own comments"
  on public.comments for update
  using (user_id = auth.uid());

-- Reading progress: users can manage their own progress
create policy "Users can view own reading progress"
  on public.reading_progress for select
  using (user_id = auth.uid());

create policy "Users can insert own reading progress"
  on public.reading_progress for insert
  with check (user_id = auth.uid());

create policy "Users can update own reading progress"
  on public.reading_progress for update
  using (user_id = auth.uid());

-- Reading sessions: users can manage their own sessions
create policy "Users can manage own sessions"
  on public.reading_sessions for all
  using (user_id = auth.uid());

-- ============================================
-- ADMIN POLICIES
-- ============================================

-- Admins can view all data for books they admin
create policy "Admins can view all comments"
  on public.comments for select
  using (
    book_id in (
      select book_id from public.book_access
      where user_id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can view all reading progress"
  on public.reading_progress for select
  using (
    book_id in (
      select book_id from public.book_access
      where user_id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can manage book access"
  on public.book_access for all
  using (
    book_id in (
      select book_id from public.book_access
      where user_id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can manage books"
  on public.books for all
  using (
    id in (
      select book_id from public.book_access
      where user_id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can manage chapters"
  on public.chapters for all
  using (
    book_id in (
      select book_id from public.book_access
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update user_id when user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- Update book_access records for this email to include user_id
  update public.book_access
  set user_id = new.id
  where user_email = new.email and user_id is null;

  return new;
end;
$$ language plpgsql security definer;

-- Trigger to run on new user signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- SEED DATA (Example)
-- ============================================

-- Uncomment and modify to add your first book:
/*
insert into public.books (slug, title, description, version, version_name, changelog)
values (
  'intelligent-engineering',
  'intelligent Engineering',
  'A book about AI-assisted software development',
  'v0.1',
  'Draft 1',
  '["Initial chapters 1-3 ready for review"]'::jsonb
);

-- Add yourself as admin (replace with your email)
insert into public.book_access (book_id, user_email, role)
select id, 'your-email@example.com', 'admin'
from public.books where slug = 'intelligent-engineering';

-- Add a beta reader
insert into public.book_access (book_id, user_email, role)
select id, 'reader@example.com', 'reader'
from public.books where slug = 'intelligent-engineering';
*/
