-- Rename the table
ALTER TABLE IF EXISTS profiles RENAME TO users;

-- Update foreign key references
ALTER TABLE tickets RENAME CONSTRAINT tickets_client_id_fkey TO tickets_client_id_fkey_new;
ALTER TABLE tickets RENAME CONSTRAINT tickets_agent_id_fkey TO tickets_agent_id_fkey_new;
ALTER TABLE ticket_activities RENAME CONSTRAINT ticket_activities_user_id_fkey TO ticket_activities_user_id_fkey_new;
ALTER TABLE attachments RENAME CONSTRAINT attachments_user_id_fkey TO attachments_user_id_fkey_new;

-- Drop old policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

-- Create new policies with updated names
CREATE POLICY "Public users are viewable by everyone"
ON users FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update their own profile"
ON users FOR UPDATE
TO authenticated
USING (auth.uid() = id);
