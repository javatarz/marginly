-- Add last_synced_at column to track when book content was last synced
-- This enables "new content" indicators by comparing with user's last read time

ALTER TABLE public.books
ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

-- Set initial value for existing books to their updated_at
UPDATE public.books
SET last_synced_at = updated_at
WHERE last_synced_at IS NULL;
