-- Simple user policies
create policy "Anyone can read users"
  on users for select
  to authenticated
  using (true);

create policy "Users can update own record"
  on users for update
  to authenticated
  using (auth.uid() = id);

-- Simple ticket policies
create policy "Clients can view own tickets"
  on tickets for select
  to authenticated
  using (
    client_id = auth.uid() or  -- Client can see their own tickets
    agent_id = auth.uid() or   -- Agent assigned to ticket can see it
    exists (                   -- Any agent/admin can see all tickets
      select 1 from users
      where users.id = auth.uid()
      and users.role in ('agent', 'admin')
    )
  );

create policy "Clients can create tickets"
  on tickets for insert
  to authenticated
  with check (
    client_id = auth.uid()
  );

create policy "Agents can update tickets"
  on tickets for update
  to authenticated
  using (
    exists (
      select 1 from users
      where users.id = auth.uid()
      and users.role in ('agent', 'admin')
    )
  ); 