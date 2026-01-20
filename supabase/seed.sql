-- ============================================
-- Local Development Seed Data
-- ============================================
-- This file is run automatically by `supabase db reset`
-- Creates test users and sample data for local development

-- ============================================
-- TEST USERS
-- ============================================
-- Fixed UUIDs for reproducible testing
-- Login via magic link, check Inbucket at http://localhost:54324

INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud,
  confirmation_token
) VALUES
  -- Admin user
  (
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'admin@test.local',
    crypt('password123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "Alex Admin"}',
    false,
    'authenticated',
    'authenticated',
    ''
  ),
  -- Reader user
  (
    '22222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'reader@test.local',
    crypt('password123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "Riley Reader"}',
    false,
    'authenticated',
    'authenticated',
    ''
  )
ON CONFLICT (id) DO NOTHING;

-- Create identities for the users (required for auth to work)
INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'admin@test.local',
    '{"sub": "11111111-1111-1111-1111-111111111111", "email": "admin@test.local"}',
    'email',
    now(),
    now(),
    now()
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    'reader@test.local',
    '{"sub": "22222222-2222-2222-2222-222222222222", "email": "reader@test.local"}',
    'email',
    now(),
    now(),
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- USER PROFILES
-- ============================================

INSERT INTO public.profiles (id, display_name)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Alex Admin'),
  ('22222222-2222-2222-2222-222222222222', 'Riley Reader')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- GLOBAL ADMIN
-- ============================================

INSERT INTO public.global_admins (user_email, user_id)
VALUES ('admin@test.local', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (user_email) DO NOTHING;

-- ============================================
-- BOOK ACCESS
-- ============================================
-- Grant reader access to demo-book (admin gets access via global_admins)

INSERT INTO public.book_access (book_id, user_email, user_id, role)
SELECT
  b.id,
  'reader@test.local',
  '22222222-2222-2222-2222-222222222222',
  'reader'
FROM public.books b
WHERE b.slug = 'demo-book'
ON CONFLICT (book_id, user_email) DO NOTHING;

-- ============================================
-- SAMPLE COMMENTS
-- ============================================
-- Comments on Chapter 1 (01-introduction) from both users

-- Admin's comment on the opening paragraph
INSERT INTO public.comments (book_id, chapter_slug, user_id, anchor_text, anchor_paragraph, content)
SELECT
  b.id,
  '01-introduction',
  '11111111-1111-1111-1111-111111111111',
  'comprehensive guide designed to help aspiring authors',
  'Welcome to "The Art of Writing," a comprehensive guide designed to help aspiring authors develop their craft.',
  'I think we should emphasize that this is for both fiction and non-fiction writers. The current phrasing feels limiting.'
FROM public.books b
WHERE b.slug = 'demo-book';

-- Reader's comment on the same chapter
INSERT INTO public.comments (book_id, chapter_slug, user_id, anchor_text, anchor_paragraph, content)
SELECT
  b.id,
  '01-introduction',
  '22222222-2222-2222-2222-222222222222',
  'Writing is both an art and a discipline',
  'Writing is both an art and a discipline. It requires creativity, persistence, and a willingness to revise and improve.',
  'Love this framing! Could we add a brief example here of how discipline manifests in a typical writing routine?'
FROM public.books b
WHERE b.slug = 'demo-book';

-- Admin reply to reader's comment (threaded)
INSERT INTO public.comments (book_id, chapter_slug, user_id, anchor_text, anchor_paragraph, content, parent_id)
SELECT
  b.id,
  '01-introduction',
  '11111111-1111-1111-1111-111111111111',
  'Writing is both an art and a discipline',
  'Writing is both an art and a discipline. It requires creativity, persistence, and a willingness to revise and improve.',
  'Good idea. Maybe mention the "write every day" practice that many authors follow?',
  c.id
FROM public.books b
CROSS JOIN public.comments c
WHERE b.slug = 'demo-book'
  AND c.chapter_slug = '01-introduction'
  AND c.user_id = '22222222-2222-2222-2222-222222222222'
  AND c.parent_id IS NULL
LIMIT 1;

-- Comment on Chapter 2
INSERT INTO public.comments (book_id, chapter_slug, user_id, anchor_text, anchor_paragraph, content)
SELECT
  b.id,
  '02-getting-started',
  '22222222-2222-2222-2222-222222222222',
  'blank page',
  NULL,
  'The section on overcoming writer''s block is really helpful. Consider adding the "start in the middle" technique.'
FROM public.books b
WHERE b.slug = 'demo-book';

-- Resolved comment example
INSERT INTO public.comments (book_id, chapter_slug, user_id, anchor_text, anchor_paragraph, content, is_resolved)
SELECT
  b.id,
  '01-introduction',
  '11111111-1111-1111-1111-111111111111',
  'Take notes as you read',
  'Take notes as you read. The best way to improve your writing is through practice.',
  'Typo: "your" should be "you''re" - wait, actually it''s correct. Never mind!',
  true
FROM public.books b
WHERE b.slug = 'demo-book';

-- ============================================
-- TEST DATA SUMMARY
-- ============================================
-- Users:
--   admin@test.local (password: password123) - Global admin
--   reader@test.local (password: password123) - Reader for demo-book
--
-- To login:
--   1. Use magic link (check Inbucket at http://localhost:54324)
--   2. Or use password login if you've enabled it
--
-- Sample data includes:
--   - 5 comments across 2 chapters
--   - 1 threaded reply
--   - 1 resolved comment
