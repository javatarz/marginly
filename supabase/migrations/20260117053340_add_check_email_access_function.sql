-- Add function to check if email has book access
-- This bypasses RLS so unauthenticated users can verify their email before login

create or replace function public.check_email_has_access(check_email text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.book_access
    where user_email = lower(check_email)
  );
$$;

grant execute on function public.check_email_has_access(text) to anon;
grant execute on function public.check_email_has_access(text) to authenticated;
