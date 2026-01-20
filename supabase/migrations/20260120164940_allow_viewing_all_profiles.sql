-- Allow authenticated users to view all profiles
-- Needed for displaying comment authors

CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);
