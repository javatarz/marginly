-- Allow global admins to update any comment (resolve/reopen)
CREATE POLICY "Global admins can update comments"
  ON public.comments FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.global_admins WHERE user_id = auth.uid())
  );
