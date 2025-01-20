-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Create ENUMs
create type user_role as enum ('client', 'agent', 'admin');
create type ticket_status as enum ('new', 'in_progress', 'resolved', 'closed');
create type ticket_priority as enum ('low', 'medium', 'high', 'urgent');
create type activity_type as enum (
  'comment',
  'status_change',
  'priority_change',
  'agent_assignment',
  'attachment_added'
);

-- Create profiles table
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  role user_role not null default 'client',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_seen timestamp with time zone,
  metadata jsonb default '{}'::jsonb
);

-- Create tickets table
create table if not exists tickets (
  id uuid default uuid_generate_v4() primary key,
  number serial unique,
  client_id uuid references profiles(id) not null,
  agent_id uuid references profiles(id),
  subject text not null,
  description text not null,
  status ticket_status default 'new',
  priority ticket_priority default 'medium',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  resolved_at timestamp with time zone,
  metadata jsonb default '{}'::jsonb
);

-- Create ticket_activities table
create table if not exists ticket_activities (
  id uuid default uuid_generate_v4() primary key,
  ticket_id uuid references tickets(id) on delete cascade not null,
  user_id uuid references profiles(id) not null,
  activity_type activity_type not null,
  content text,
  is_internal boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  metadata jsonb default '{}'::jsonb
);

-- Create attachments table
create table if not exists attachments (
  id uuid default uuid_generate_v4() primary key,
  ticket_id uuid references tickets(id) on delete cascade not null,
  user_id uuid references profiles(id) not null,
  file_name text not null,
  file_type text not null,
  file_size integer not null,
  storage_path text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  metadata jsonb default '{}'::jsonb
);

-- Create indexes for better performance
create index if not exists idx_tickets_client_id on tickets(client_id);
create index if not exists idx_tickets_agent_id on tickets(agent_id);
create index if not exists idx_tickets_status on tickets(status);
create index if not exists idx_tickets_priority on tickets(priority);
create index if not exists idx_ticket_activities_ticket_id on ticket_activities(ticket_id);
create index if not exists idx_attachments_ticket_id on attachments(ticket_id);

-- Create RLS policies

-- Profiles policies
alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone"
on profiles for select
to authenticated
using (true);

create policy "Users can update their own profile"
on profiles for update
to authenticated
using (auth.uid() = id);

-- Tickets policies
alter table tickets enable row level security;

create policy "Clients can view their own tickets"
on tickets for select
to authenticated
using (
  client_id = auth.uid() or
  agent_id = auth.uid() or
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role in ('agent', 'admin')
  )
);

create policy "Clients can create tickets"
on tickets for insert
to authenticated
with check (
  auth.uid() = client_id and
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'client'
  )
);

create policy "Agents and admins can update tickets"
on tickets for update
to authenticated
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role in ('agent', 'admin')
  )
);

-- Activities policies
alter table ticket_activities enable row level security;

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
        select 1 from profiles
        where profiles.id = auth.uid()
        and profiles.role in ('agent', 'admin')
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
        select 1 from profiles
        where profiles.id = auth.uid()
        and profiles.role in ('agent', 'admin')
      )
    )
  )
);

-- Attachments policies
alter table attachments enable row level security;

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
        select 1 from profiles
        where profiles.id = auth.uid()
        and profiles.role in ('agent', 'admin')
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
        select 1 from profiles
        where profiles.id = auth.uid()
        and profiles.role in ('agent', 'admin')
      )
    )
  )
); 