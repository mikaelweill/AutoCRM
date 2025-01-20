-- Enable realtime for tickets table
alter publication supabase_realtime add table tickets;

-- Enable replication on tickets table
alter table tickets replica identity full; 