-- Drop and recreate schema
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Drop the auth hook function if it exists in any schema
DROP FUNCTION IF EXISTS public.custom_access_token_hook(event jsonb);

-- Drop all policies
DROP POLICY IF EXISTS "Public users are viewable by everyone" ON users;
DROP POLICY IF EXISTS "Users can update own record" ON users;
DROP POLICY IF EXISTS "Users can insert own record" ON users;
DROP POLICY IF EXISTS "Users can delete own record" ON users;
DROP POLICY IF EXISTS "Ticket creation" ON tickets;
DROP POLICY IF EXISTS "Users can create tickets" ON tickets;
DROP POLICY IF EXISTS "Users can view tickets" ON tickets;
DROP POLICY IF EXISTS "Users can update tickets" ON tickets;
DROP POLICY IF EXISTS "Users can delete tickets" ON tickets;
DROP POLICY IF EXISTS "Users can create attachments" ON attachments;
DROP POLICY IF EXISTS "Users can view attachments" ON attachments;
DROP POLICY IF EXISTS "Users can update attachments" ON attachments;
DROP POLICY IF EXISTS "Users can delete attachments" ON attachments;

-- Drop all tables
DROP TABLE IF EXISTS attachments CASCADE;
DROP TABLE IF EXISTS ticket_activities CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop all types
DROP TYPE IF EXISTS activity_type CASCADE;
DROP TYPE IF EXISTS ticket_priority CASCADE;
DROP TYPE IF EXISTS ticket_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE; 