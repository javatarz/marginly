-- Migration RPC function for moving data when chapter slug changes
-- This enables atomic migration of comments, reading_progress, and reading_sessions
-- from an orphaned chapter (old slug) to the new chapter (new slug)

CREATE OR REPLACE FUNCTION public.migrate_chapter_slug(
  p_book_id uuid,
  p_source_slug text,
  p_target_slug text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_comments_count int := 0;
  v_progress_count int := 0;
  v_sessions_count int := 0;
  v_source_chapter_id uuid;
  v_target_chapter_id uuid;
BEGIN
  -- Verify caller is a global admin
  IF NOT EXISTS (
    SELECT 1 FROM global_admins
    WHERE user_id = auth.uid() OR lower(user_email) = lower(auth.email())
  ) THEN
    RAISE EXCEPTION 'Permission denied: only global admins can migrate chapters';
  END IF;

  -- Verify source chapter exists
  SELECT id INTO v_source_chapter_id
  FROM chapters
  WHERE book_id = p_book_id AND slug = p_source_slug;

  IF v_source_chapter_id IS NULL THEN
    RAISE EXCEPTION 'Source chapter not found: %', p_source_slug;
  END IF;

  -- Verify target chapter exists
  SELECT id INTO v_target_chapter_id
  FROM chapters
  WHERE book_id = p_book_id AND slug = p_target_slug;

  IF v_target_chapter_id IS NULL THEN
    RAISE EXCEPTION 'Target chapter not found: %', p_target_slug;
  END IF;

  -- Migrate comments
  UPDATE comments
  SET chapter_slug = p_target_slug, updated_at = now()
  WHERE book_id = p_book_id AND chapter_slug = p_source_slug;

  GET DIAGNOSTICS v_comments_count = ROW_COUNT;

  -- Migrate reading_progress with merge logic:
  -- If user has progress on both slugs, keep higher scroll_pct and sum time_spent
  WITH source_progress AS (
    DELETE FROM reading_progress
    WHERE book_id = p_book_id AND chapter_slug = p_source_slug
    RETURNING *
  ),
  merged AS (
    INSERT INTO reading_progress (
      book_id, chapter_slug, user_id, scroll_pct, time_spent_seconds,
      started_at, last_read_at, completed_at
    )
    SELECT
      sp.book_id,
      p_target_slug,
      sp.user_id,
      GREATEST(sp.scroll_pct, COALESCE(tp.scroll_pct, 0)),
      sp.time_spent_seconds + COALESCE(tp.time_spent_seconds, 0),
      LEAST(sp.started_at, tp.started_at),
      GREATEST(sp.last_read_at, tp.last_read_at),
      COALESCE(tp.completed_at, sp.completed_at)
    FROM source_progress sp
    LEFT JOIN reading_progress tp
      ON tp.book_id = p_book_id
      AND tp.chapter_slug = p_target_slug
      AND tp.user_id = sp.user_id
    ON CONFLICT (book_id, chapter_slug, user_id)
    DO UPDATE SET
      scroll_pct = GREATEST(EXCLUDED.scroll_pct, reading_progress.scroll_pct),
      time_spent_seconds = EXCLUDED.time_spent_seconds,
      started_at = LEAST(EXCLUDED.started_at, reading_progress.started_at),
      last_read_at = GREATEST(EXCLUDED.last_read_at, reading_progress.last_read_at),
      completed_at = COALESCE(reading_progress.completed_at, EXCLUDED.completed_at)
    RETURNING 1
  )
  SELECT count(*) INTO v_progress_count FROM merged;

  -- Migrate reading_sessions
  UPDATE reading_sessions
  SET chapter_slug = p_target_slug
  WHERE book_id = p_book_id AND chapter_slug = p_source_slug;

  GET DIAGNOSTICS v_sessions_count = ROW_COUNT;

  -- Delete the orphaned chapter
  DELETE FROM chapters
  WHERE id = v_source_chapter_id;

  RETURN jsonb_build_object(
    'success', true,
    'migrated', jsonb_build_object(
      'comments', v_comments_count,
      'progress', v_progress_count,
      'sessions', v_sessions_count
    ),
    'source_slug', p_source_slug,
    'target_slug', p_target_slug
  );
END;
$$;

-- Grant execute permission to authenticated users (RLS handled inside function)
GRANT EXECUTE ON FUNCTION public.migrate_chapter_slug(uuid, text, text) TO authenticated;

COMMENT ON FUNCTION public.migrate_chapter_slug IS
  'Migrates comments, reading_progress, and reading_sessions from source chapter slug to target chapter slug, then deletes the orphaned source chapter. Only global admins can execute.';

-- ============================================
-- Function to detect duplicate chapter numbers within books
-- Returns one row per book that has duplicate chapter numbers
-- ============================================

CREATE OR REPLACE FUNCTION public.get_duplicate_chapters()
RETURNS TABLE (
  book_id uuid,
  book_title text,
  chapter_number int,
  slugs text[]
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.book_id,
    b.title as book_title,
    c.number as chapter_number,
    array_agg(c.slug ORDER BY c.created_at) as slugs
  FROM chapters c
  JOIN books b ON b.id = c.book_id
  WHERE EXISTS (
    -- Only return if caller is a global admin
    SELECT 1 FROM global_admins
    WHERE user_id = auth.uid() OR lower(user_email) = lower(auth.email())
  )
  GROUP BY c.book_id, b.title, c.number
  HAVING count(*) > 1
  ORDER BY b.title, c.number;
$$;

GRANT EXECUTE ON FUNCTION public.get_duplicate_chapters() TO authenticated;

COMMENT ON FUNCTION public.get_duplicate_chapters IS
  'Returns books with duplicate chapter numbers, indicating orphaned chapters from slug changes. Only global admins can execute.';
