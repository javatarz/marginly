-- Fix global_admins support for login check and comments
-- Previously, check_email_has_access and comments insert only checked book_access

-- Fix check_email_has_access to also check global_admins
CREATE OR REPLACE FUNCTION public.check_email_has_access(check_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.book_access
    WHERE user_email = lower(check_email)
  ) OR EXISTS (
    SELECT 1 FROM public.global_admins
    WHERE user_email = lower(check_email)
  );
$$;

-- Fix comments insert policy to allow global admins
DROP POLICY IF EXISTS "Users can create comments" ON comments;

CREATE POLICY "Users can create comments" ON comments
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND (
      -- Check book_access
      book_id IN (
        SELECT book_id FROM book_access
        WHERE user_id = auth.uid() OR user_email = auth.email()
      )
      OR
      -- Or check global_admins
      EXISTS (
        SELECT 1 FROM global_admins
        WHERE user_id = auth.uid() OR lower(user_email) = lower(auth.email())
      )
    )
  );
