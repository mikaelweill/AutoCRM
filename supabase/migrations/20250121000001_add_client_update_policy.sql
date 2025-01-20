-- Add policy for clients to update their own tickets
CREATE POLICY "Clients can update their own tickets"
ON tickets
FOR UPDATE
TO authenticated
USING (client_id = auth.uid())
WITH CHECK (client_id = auth.uid()); 