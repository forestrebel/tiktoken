-- Create videos table
create table videos (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  file_path text not null,
  storage_path text not null,
  type text not null default 'video/mp4',
  size bigint,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table videos enable row level security;

-- Create policies
create policy "Videos are viewable by everyone" 
  on videos for select 
  using (true);

create policy "Anyone can upload videos" 
  on videos for insert 
  with check (true); 