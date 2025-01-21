-- Drop all existing policies
drop policy if exists "Public users are viewable by everyone" on users;
drop policy if exists "Users can update their own profile" on users;
drop policy if exists "Clients can view their own tickets" on tickets;
drop policy if exists "Clients can create tickets" on tickets;
drop policy if exists "Agents and admins can update tickets" on tickets;
drop policy if exists "Activities are viewable by ticket participants" on ticket_activities;
drop policy if exists "Users can create activities on accessible tickets" on ticket_activities;
drop policy if exists "Attachments are viewable by ticket participants" on attachments;
drop policy if exists "Users can add attachments to accessible tickets" on attachments;

-- Drop function if it exists
drop function if exists public.custom_access_token_hook;

-- Recreate initial policies
create policy "Public users are viewable by everyone"
on users for select
to authenticated
using (true);

create policy "Users can update their own profile"
on users for update
to authenticated
using (auth.uid() = id);

create policy "Clients can view their own tickets"
on tickets for select
to authenticated
using (
  client_id = auth.uid() or
  agent_id = auth.uid() or
  exists (
    select 1 from users
    where users.id = auth.uid()
    and users.role in ('agent', 'admin')
  )
);

create policy "Clients can create tickets"
on tickets for insert
to authenticated
with check (
  auth.uid() = client_id and
  exists (
    select 1 from users
    where users.id = auth.uid()
    and users.role = 'client'
  )
);

create policy "Agents and admins can update tickets"
on tickets for update
to authenticated
using (
  exists (
    select 1 from users
    where users.id = auth.uid()
    and users.role in ('agent', 'admin')
  )
);

create policy "Activities are viewable by ticket participants"
on ticket_activities for select
to authenticated
using (
  exists (
    select 1 from tickets
    where tickets.id = ticket_id
    and (
      tickets.client_id = auth.uid() or
      tickets.agent_id = auth.uid() or
      exists (
        select 1 from users
        where users.id = auth.uid()
        and users.role in ('agent', 'admin')
      )
    )
  )
);

create policy "Users can create activities on accessible tickets"
on ticket_activities for insert
to authenticated
with check (
  exists (
    select 1 from tickets
    where tickets.id = ticket_id
    and (
      tickets.client_id = auth.uid() or
      tickets.agent_id = auth.uid() or
      exists (
        select 1 from users
        where users.id = auth.uid()
        and users.role in ('agent', 'admin')
      )
    )
  )
);

create policy "Attachments are viewable by ticket participants"
on attachments for select
to authenticated
using (
  exists (
    select 1 from tickets
    where tickets.id = ticket_id
    and (
      tickets.client_id = auth.uid() or
      tickets.agent_id = auth.uid() or
      exists (
        select 1 from users
        where users.id = auth.uid()
        and users.role in ('agent', 'admin')
      )
    )
  )
);

create policy "Users can add attachments to accessible tickets"
on attachments for insert
to authenticated
with check (
  exists (
    select 1 from tickets
    where tickets.id = ticket_id
    and (
      tickets.client_id = auth.uid() or
      tickets.agent_id = auth.uid() or
      exists (
        select 1 from users
        where users.id = auth.uid()
        and users.role in ('agent', 'admin')
      )
    )
  )
); 