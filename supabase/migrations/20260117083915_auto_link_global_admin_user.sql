-- Auto-link user_id when adding a global admin (if user already exists)
CREATE OR REPLACE FUNCTION public.link_global_admin_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Link user_id if user already exists
  SELECT id INTO NEW.user_id
  FROM auth.users
  WHERE lower(email) = lower(NEW.user_email);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_global_admin_insert
  BEFORE INSERT ON public.global_admins
  FOR EACH ROW EXECUTE FUNCTION public.link_global_admin_user();

-- Fix RLS policies to use case-insensitive email matching

-- Books policy
DROP POLICY IF EXISTS "Users can view books they have access to" ON public.books;
CREATE POLICY "Users can view books they have access to"
  ON public.books FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.global_admins
      WHERE global_admins.user_id = auth.uid()
         OR lower(global_admins.user_email) = lower(auth.email())
    )
    OR EXISTS (
      SELECT 1 FROM public.book_access
      WHERE book_access.book_id = books.id
        AND (book_access.user_id = auth.uid()
             OR lower(book_access.user_email) = lower(auth.email()))
    )
  );

-- Chapters policy
DROP POLICY IF EXISTS "Users can view chapters of accessible books" ON public.chapters;
CREATE POLICY "Users can view chapters of accessible books"
  ON public.chapters FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.global_admins
      WHERE global_admins.user_id = auth.uid()
         OR lower(global_admins.user_email) = lower(auth.email())
    )
    OR EXISTS (
      SELECT 1 FROM public.book_access
      WHERE book_access.book_id = chapters.book_id
        AND (book_access.user_id = auth.uid()
             OR lower(book_access.user_email) = lower(auth.email()))
    )
  );

-- Comments policy
DROP POLICY IF EXISTS "Users can view comments on accessible books" ON public.comments;
CREATE POLICY "Users can view comments on accessible books"
  ON public.comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.global_admins
      WHERE global_admins.user_id = auth.uid()
         OR lower(global_admins.user_email) = lower(auth.email())
    )
    OR EXISTS (
      SELECT 1 FROM public.book_access
      WHERE book_access.book_id = comments.book_id
        AND (book_access.user_id = auth.uid()
             OR lower(book_access.user_email) = lower(auth.email()))
    )
  );
