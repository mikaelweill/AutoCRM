-- Create a bucket for ticket attachments
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false);

-- Enable RLS for the bucket
create policy "Authenticated users can upload attachments"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'attachments'
);

create policy "Users can view attachments of their tickets"
on storage.objects for select
to authenticated
using (
  bucket_id = 'attachments' and
  exists (
    select 1 from attachments
    join tickets on tickets.id = attachments.ticket_id
    where 
      attachments.storage_path = storage.objects.name and
      (
        tickets.client_id = auth.uid() or
        tickets.agent_id = auth.uid() or
        exists (
          select 1 from users
          where users.id = auth.uid()
          and users.role in ('agent', 'admin')
        )
      )
  )
); 