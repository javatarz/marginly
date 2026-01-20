-- Allow global admins to manage user profiles
-- Needed for setting display names when inviting users or editing existing users

-- Allow admins to insert profiles (for pre-creating profiles when inviting)
CREATE POLICY "Global admins can insert profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.global_admins WHERE user_id = auth.uid())
  );

-- Allow admins to update any profile
CREATE POLICY "Global admins can update profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.global_admins WHERE user_id = auth.uid())
  );
