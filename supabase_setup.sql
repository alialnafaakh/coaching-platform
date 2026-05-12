-- 1. Create the site_content table
create table public.site_content (
  id uuid primary key default gen_random_uuid(),
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- Insert a default row (we will only ever use the first row)
insert into public.site_content (content) values ('{}'::jsonb);

-- 2. Create the storage bucket for images
insert into storage.buckets (id, name, public) values ('images', 'images', true);

-- 3. Set up Storage Policies to allow public read
create policy "Public Access"
on storage.objects for select
to public
using ( bucket_id = 'images' );

-- Allow service role to insert (our API will use the service role key)
create policy "Service Role Insert"
on storage.objects for insert
to service_role
with check ( bucket_id = 'images' );

create policy "Service Role Update"
on storage.objects for update
to service_role
using ( bucket_id = 'images' );

create policy "Service Role Delete"
on storage.objects for delete
to service_role
using ( bucket_id = 'images' );
