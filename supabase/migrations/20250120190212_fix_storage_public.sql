-- Update the bucket to be public
update storage.buckets
set public = true
where id = 'attachments';

-- Drop all existing policies
drop policy if exists "Authenticated users can use attachments bucket" on storage.buckets;
drop policy if exists "Authenticated users can upload attachments" on storage.objects;
drop policy if exists "Users can view attachments" on storage.objects;

-- Create simple upload policy
create policy "Allow uploads to attachments bucket"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'attachments'
);

-- Create simple download policy
create policy "Allow downloads from attachments bucket"
on storage.objects for select
to authenticated
using (
  bucket_id = 'attachments'
); 