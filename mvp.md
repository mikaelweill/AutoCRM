# AutoCRM MVP Specification

## Progress Update
✅ = Completed
🚧 = In Progress
⏳ = Not Started

## 1. User Flows

### Client Flow
1. Authentication
   ✅ Sign up/Sign in with email
   ✅ Redirected to client dashboard

2. Ticket Management
   ✅ Create new ticket
     ✅ Fill form with subject, description, priority
     ✅ Optional: attach files
   ✅ View own tickets
     ✅ List of all tickets with status
     🚧 Sort by date, status, priority
   🚧 View ticket details
     ⏳ See ticket history and updates
     ⏳ Add comments/replies
     ⏳ View agent responses

### Agent Flow
1. Authentication
   ⏳ Sign in (agent accounts created by admin)
   ⏳ Redirected to agent dashboard

2. Ticket Management
   ⏳ View assigned tickets
   ⏳ View ticket queue
   ⏳ Ticket Actions

### Admin Flow
⏳ All features not started

## 2. Database Schema (Supabase)
✅ profiles
✅ tickets
⏳ ticket_activities
✅ attachments

## 3. Key Design Decisions

### Extensibility Features
1. **Metadata Fields**
   ✅ Every table includes metadata JSONB field

2. **Activity Logging**
   ⏳ Comprehensive activity tracking
   ⏳ Future audit trails and analytics

3. **Attachment System**
   ✅ Separate table for attachments
   ✅ Supports file uploads
   ✅ Storage path implementation

### Security Considerations
1. **Row Level Security (RLS)**
   🚧 Clients can only view their own tickets
   ⏳ Agents can view assigned and unassigned tickets
   ⏳ Admins have full access

2. **Audit Trail**
   ⏳ All changes tracked in ticket_activities

### Performance Considerations
✅ Basic implementation complete
🚧 Need to implement sorting and filtering
⏳ Pagination support needed

## Next Steps Priority List
1. Implement ticket details view with comments/replies
2. Add sorting and filtering to ticket list
3. Build out agent dashboard and ticket assignment
4. Implement ticket activity logging
5. Add pagination for better performance

## 1. User Flows

### Client Flow
1. Authentication
   - Sign up/Sign in with email or OAuth (Google/GitHub)
   - Redirected to client dashboard

2. Ticket Management
   - Create new ticket
     - Fill form with subject, description, priority
     - Optional: attach files
   - View own tickets
     - List of all tickets with status
     - Sort by date, status, priority
   - View ticket details
     - See ticket history and updates
     - Add comments/replies
     - View agent responses

### Agent Flow
1. Authentication
   - Sign in (agent accounts created by admin)
   - Redirected to agent dashboard

2. Ticket Management
   - View assigned tickets
     - List of tickets assigned to them
     - Sort by priority, status, date
   - View ticket queue
     - List of unassigned tickets
     - Self-assign tickets from queue
   - Ticket Actions
     - Update ticket status
     - Add internal notes
     - Respond to client
     - Mark as resolved

### Admin Flow
1. Authentication
   - Sign in (super admin account created during setup)
   - Redirected to admin dashboard

2. Ticket Management
   - View all tickets
     - Complete overview of system
     - Advanced filtering options
   - Assignment Management
     - Assign/reassign tickets to agents
     - View agent workload
     - Override ticket priorities

3. Agent Management
   - Create agent accounts
   - Set agent permissions
   - View agent performance metrics

## 2. Database Schema (Supabase)

### profiles
```sql
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  role user_role not null default 'client',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_seen timestamp with time zone,
  metadata jsonb default '{}'::jsonb -- For future extensibility
);

-- Enum for user roles
create type user_role as enum ('client', 'agent', 'admin');

-- RLS Policies will be added for role-based access
```

### tickets
```sql
create table tickets (
  id uuid default uuid_generate_v4() primary key,
  number serial unique, -- For human-readable ticket numbers (#1001, etc.)
  client_id uuid references profiles(id) not null,
  agent_id uuid references profiles(id),
  subject text not null,
  description text not null,
  status ticket_status default 'new',
  priority ticket_priority default 'medium',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  resolved_at timestamp with time zone,
  metadata jsonb default '{}'::jsonb -- For future extensibility (tags, custom fields, etc.)
);

-- Enums for ticket properties
create type ticket_status as enum ('new', 'in_progress', 'resolved', 'closed');
create type ticket_priority as enum ('low', 'medium', 'high', 'urgent');

-- RLS Policies will be added for role-based access
```

### ticket_activities
```sql
create table ticket_activities (
  id uuid default uuid_generate_v4() primary key,
  ticket_id uuid references tickets(id) on delete cascade not null,
  user_id uuid references profiles(id) not null,
  activity_type activity_type not null,
  content text,
  is_internal boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  metadata jsonb default '{}'::jsonb -- For future extensibility
);

-- Enum for activity types
create type activity_type as enum (
  'comment',
  'status_change',
  'priority_change',
  'agent_assignment',
  'attachment_added'
);

-- RLS Policies will be added for role-based access
```

### attachments
```sql
create table attachments (
  id uuid default uuid_generate_v4() primary key,
  ticket_id uuid references tickets(id) on delete cascade not null,
  user_id uuid references profiles(id) not null,
  file_name text not null,
  file_type text not null,
  file_size integer not null,
  storage_path text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  metadata jsonb default '{}'::jsonb -- For future extensibility
);

-- RLS Policies will be added for role-based access
```

## 3. Key Design Decisions

### Extensibility Features
1. **Metadata Fields**
   - Every table includes a `metadata` JSONB field
   - Allows adding custom fields without schema changes
   - Future-proofs for features like custom ticket fields, user preferences, etc.

2. **Activity Logging**
   - Comprehensive activity tracking
   - Supports future audit trails and analytics
   - Enables future features like ticket timelines

3. **Attachment System**
   - Separate table for attachments
   - Supports future features like file previews, virus scanning
   - Flexible storage path for multiple storage providers

### Security Considerations
1. **Row Level Security (RLS)**
   - Clients can only view their own tickets
   - Agents can view assigned and unassigned tickets
   - Admins have full access
   - Activities and attachments inherit ticket permissions

2. **Audit Trail**
   - All changes tracked in ticket_activities
   - Supports future compliance requirements
   - Enables future features like change history

### Performance Considerations
1. **Indexing Strategy**
   - Index on ticket status and agent_id for queue views
   - Index on client_id for client ticket lists
   - Composite indexes for common query patterns

2. **Pagination Support**
   - Serial ticket numbers for efficient pagination
   - Timestamp ordering for activity feeds
   - Supports future infinite scroll implementations 