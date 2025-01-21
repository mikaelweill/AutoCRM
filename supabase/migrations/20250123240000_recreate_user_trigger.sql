-- Drop existing trigger and function if they exist
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- Create a function to handle new user creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, role)
  values (new.id, new.email, 'client');
  return new;
end;
$$;

-- Create a trigger to call this function after an insert on auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Insert existing auth users into public.users if they don't exist
insert into public.users (id, email, role)
select id, email, 'client'
from auth.users
where not exists (
  select 1 from public.users where users.id = auth.users.id
); 