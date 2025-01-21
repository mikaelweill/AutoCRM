-- Create the auth hook function
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  claims jsonb;
  user_role text;
begin
  -- Fetch the user role from our users table
  select role into user_role from public.users where id = (event->>'user_id')::uuid;

  claims := event->'claims';
  
  if user_role is not null then
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  else
    claims := jsonb_set(claims, '{user_role}', 'null');
  end if;

  -- Update the 'claims' object in the original event
  event := jsonb_set(event, '{claims}', claims);

  -- Return the modified or original event
  return event;
end;
$$;

-- Ensure proper permissions
grant usage on schema public to supabase_auth_admin;

grant execute
  on function public.custom_access_token_hook
  to supabase_auth_admin;

revoke execute
  on function public.custom_access_token_hook
  from authenticated, anon, public;

-- The auth hook needs to be able to read the users table directly
grant select
  on table public.users
  to supabase_auth_admin;

-- But we don't want regular users to have direct access
alter table public.users enable row level security; 