-- Create public videos bucket
insert into storage.buckets (id, name, public)
values ('videos', 'videos', true);

-- Storage policies
create policy "Videos are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'videos');

create policy "Anyone can upload videos"
  on storage.objects for insert
  with check (
    bucket_id = 'videos' and
    (storage.foldername(name))[1] = 'videos' and
    length(name) < 104857600 and -- 100MB max
    storage.extension(name) in ('mp4', 'mov', 'm4v', 'quicktime')
  ); 