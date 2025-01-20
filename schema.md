# Database Schema Documentation

## Enums

### user_role
- `client` - Default role for customers
- `agent` - Support staff role
- `admin` - Administrative role

### ticket_status
- `new` - Freshly created ticket
- `in_progress` - Being worked on
- `resolved` - Solution provided
- `closed` - Completed/archived
- `cancelled` - Cancelled by client or agent

### ticket_priority
- `low` - Low priority
- `medium` - Default priority
- `high` - High priority
- `urgent` - Urgent/critical priority

### activity_type
- `comment` - User/agent comments
- `status_change` - Ticket status updates
- `priority_change` - Priority modifications
- `agent_assignment` - When ticket is assigned
- `attachment_added` - New files added

## Tables

### users
| Column      | Type      | Description                    |
|-------------|-----------|--------------------------------|
| id          | uuid      | PK, links to auth.users        |
| email       | text      | Unique email address           |
| full_name   | text      | Optional display name          |
| role        | user_role | Default: 'client'              |
| created_at  | timestamp | Auto-set on creation           |
| updated_at  | timestamp | Auto-updated                   |
| last_seen   | timestamp | User's last activity           |
| metadata    | jsonb     | Extensible user data           |

### tickets
| Column      | Type           | Description                |
|-------------|----------------|----------------------------|
| id          | uuid          | PK, auto-generated         |
| number      | serial        | Human-readable ID          |
| client_id   | uuid          | FK to users                |
| agent_id    | uuid          | FK to users (optional)     |
| subject     | text          | Ticket title               |
| description | text          | Main ticket content        |
| status      | ticket_status | Default: 'new'             |
| priority    | ticket_priority| Default: 'medium'          |
| created_at  | timestamp     | Auto-set on creation       |
| updated_at  | timestamp     | Auto-updated               |
| resolved_at | timestamp     | When marked as resolved    |
| metadata    | jsonb         | Extensible ticket data     |

### ticket_activities
| Column        | Type          | Description               |
|---------------|---------------|---------------------------|
| id            | uuid          | PK, auto-generated        |
| ticket_id     | uuid          | FK to tickets            |
| user_id       | uuid          | FK to users              |
| activity_type | activity_type | Type of activity         |
| content       | text          | Activity details         |
| is_internal   | boolean       | Internal note flag       |
| created_at    | timestamp     | Auto-set on creation     |
| metadata      | jsonb         | Extensible activity data |

### attachments
| Column       | Type      | Description                |
|-------------|-----------|----------------------------|
| id          | uuid      | PK, auto-generated         |
| ticket_id   | uuid      | FK to tickets             |
| user_id     | uuid      | FK to users               |
| file_name   | text      | Original filename         |
| file_type   | text      | MIME type                 |
| file_size   | integer   | Size in bytes             |
| storage_path| text      | Path in storage bucket    |
| created_at  | timestamp | Auto-set on creation      |
| metadata    | jsonb     | Extensible attachment data|

## Key Relationships
- Tickets belong to a client (user)
- Tickets can be assigned to an agent (user)
- Activities and attachments belong to both a ticket and a user
- All tables have metadata for extensibility

## Indexes
- `idx_tickets_client_id` - Ticket lookup by client
- `idx_tickets_agent_id` - Ticket lookup by agent
- `idx_tickets_status` - Status filtering
- `idx_tickets_priority` - Priority filtering
- `idx_ticket_activities_ticket_id` - Activity lookup by ticket
- `idx_attachments_ticket_id` - Attachment lookup by ticket

## Row Level Security (RLS)
- Users can only view their own profile
- Clients can only view/create their own tickets
- Agents/admins can view all tickets
- Activities and attachments inherit ticket permissions 