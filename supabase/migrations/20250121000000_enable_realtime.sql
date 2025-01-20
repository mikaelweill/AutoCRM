-- Enable realtime for tickets table if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'tickets'
  ) THEN
    alter publication supabase_realtime add table tickets;
  END IF;
END
$$;

-- Enable replication on tickets table
alter table tickets replica identity full; 