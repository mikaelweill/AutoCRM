# Agent Portal Implementation Battle Plan (2024-01-21)

## Phase 1: Core Structure & Authentication ✅
- ✅ Set up agent app layout with AuthProvider
- ✅ Create agent login page
- ✅ Set up role-based protection

## Phase 2: Dashboard & Navigation 🚧
1. Create agent dashboard with:
   - Quick stats
     - Unassigned tickets count
     - Active tickets count
     - Urgent tickets count
     - Resolved tickets today
   - Recent activity section
   - Navigation layout:
     - Dashboard
     - Ticket Queue (unassigned)
     - My Tickets (assigned to me)
     - All Tickets

### Component Strategy
1. **Reusable Components from Shared**:
   - `Navigation.tsx` - Will reuse with agent-specific nav items
   - `TicketList.tsx` - Will extend with agent actions
   - `TicketDetails.tsx` - Will add status update capabilities
   - Portal layout components for consistent structure
   - UI components for stats and metrics display

2. **New Components Needed**:
   - `AgentDashboard.tsx` - Quick stats and activity overview
   - `TicketQueue.tsx` - Unassigned tickets management
   - `AgentTicketActions.tsx` - Agent-specific actions
   - `TicketStatusUpdate.tsx` - Status management interface
   - `AgentStats.tsx` - Performance metrics display

## Phase 3: Ticket Management ⏳
1. View assigned tickets:
   - List view with sorting (priority, status, date)
   - Ticket details modal/page
2. View ticket queue:
   - List of unassigned tickets
   - Self-assign functionality
3. Ticket actions:
   - Update ticket status
   - Add internal notes
   - Respond to client
   - Mark as resolved

## Phase 4: Advanced Features ⏳
1. Filtering and search:
   - By status, priority, date
   - Search by ticket number or content
2. Performance metrics:
   - Response time
   - Resolution rate
   - Active tickets count

---

# AutoCRM MVP Specification

## Core Features

### Authentication & Authorization ✅
- [x] User registration and login
- [x] Role-based access (client, agent, admin)
- [x] Protected routes and API endpoints
- [x] Session management

### Ticket Management
- [x] Create new support tickets
- [x] View list of tickets
- [x] View ticket details
- [x] Cancel tickets
- [x] Multiple file attachments
- [x] Real-time ticket updates
- [x] Add comments/replies to tickets
- [ ] Update ticket status
- [ ] Assign tickets to agents
- [ ] Filter and search tickets

### File Management ✅
- [x] Upload attachments
- [x] Store files securely
- [x] Download/view attachments
- [x] Handle multiple attachments per ticket

### Real-time Features ✅
- [x] Live updates for ticket changes
- [x] Real-time comment notifications
- [x] Subscription management
- [x] Optimistic UI updates

## Progress Update

### Completed Features
1. Basic authentication flow with Supabase Auth ✅
2. Database schema and migrations ✅
3. File upload and storage with Supabase Storage ✅
4. Ticket creation with attachments ✅
5. Ticket listing and details view ✅
6. Real-time updates for tickets and comments ✅
7. Comment/reply functionality on tickets ✅
8. Ticket cancellation ✅
9. Multiple file attachments support ✅
10. Role-based routing structure ✅
11. Client portal implementation ✅

### In Progress 🚧
1. Agent portal implementation
2. Ticket status management
3. Agent assignment
4. Search and filtering

### Not Started Yet ⏳
1. Admin portal
2. Email notifications
3. Ticket templates
4. Advanced filtering and search
5. Analytics and reporting

### Development Process Notes
1. Using Next.js App Router for routing ✅
2. Supabase for backend (Auth, Database, Storage, Real-time) ✅
3. TypeScript for type safety ✅
4. Tailwind CSS for styling ✅
5. Real-time subscriptions for live updates ✅
6. Optimistic UI updates for better UX ✅
7. Role-based navigation with reusable components ✅

## Next Steps Priority List
1. Complete agent portal implementation
2. Implement ticket status updates
3. Add agent assignment functionality
4. Add search and filtering
5. Add pagination for tickets list
6. Improve error handling and loading states
7. Add email notifications
8. Add ticket templates

## Technical Notes

### Database Schema
- See `schema.md` for current database structure ✅
- Using RLS policies for security ✅
- Real-time enabled for ticket activities ✅

### API Design
- RESTful endpoints through Supabase ✅
- Real-time subscriptions for live updates ✅
- File upload through presigned URLs ✅

### UI/UX Patterns
- Consistent form layouts ✅
- Loading states and error handling ✅
- Real-time updates ✅
- Mobile-responsive design ✅
- Accessible components ✅

### Security Considerations
- Row Level Security (RLS) policies ✅
- Secure file storage ✅
- Protected API routes ✅
- Type-safe database queries ✅

## Progress Update (Last Updated: Jan 20)
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
     ✅ View full ticket details in modal
     🚧 Sort by date, status, priority
   ✅ Ticket Actions
     ✅ Cancel tickets
     ✅ View attachments
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

## Development Process Notes
1. Build & Development
   - Use `yarn dev` for development with HMR
   - Run `yarn build` regularly in parallel to catch type/lint errors
   - Clear `.next` cache when encountering build issues
   - Monitor realtime subscriptions for proper cleanup

2. Code Organization
   - Components structured by feature (tickets/, auth/)
   - Shared UI components in ui/
   - Services layer for API calls
   - Context providers for state management

3. UI/UX Patterns
   - Modal dialogs for forms and detailed views
   - Consistent error handling and loading states
   - Real-time updates for ticket changes
   - Responsive layout with fixed navigation

## Next Steps Priority List
1. Add sorting and filtering to ticket list
2. Implement commenting system
3. Build out agent dashboard and ticket assignment
4. Add pagination for better performance
5. Implement ticket activity logging

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