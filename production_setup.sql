-- Create videos table
create table if not exists public.videos (
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

-- Enable Row Level Security (RLS) for videos
alter table public.videos enable row level security;

-- Create video policies
create policy if not exists "Videos are viewable by everyone" 
  on public.videos for select 
  using (true);

create policy if not exists "Anyone can upload videos" 
  on public.videos for insert 
  with check (true);

-- Create tokens table
create table if not exists public.tokens (
  id uuid default uuid_generate_v4() primary key,
  video_id uuid references public.videos(id),
  issuer_id text not null,
  recipient_id text not null,
  eth_token_id text,
  eth_contract_addr text default '0x1234567890123456789012345678901234567890',
  token_uri text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for tokens
alter table public.tokens enable row level security;

-- Create token policies
create policy if not exists "Anyone can create tokens"
  on public.tokens for insert
  with check (true);

create policy if not exists "Users can read their own tokens"
  on public.tokens for select
  using (recipient_id = auth.uid()::text or issuer_id = auth.uid()::text);

-- Create videos storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('videos', 'videos', true, 104857600, ARRAY['video/mp4', 'video/quicktime', 'video/x-m4v', 'application/octet-stream'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create storage policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Anyone can upload" ON storage.objects;
  DROP POLICY IF EXISTS "Anyone can download" ON storage.objects;
  
  CREATE POLICY "Anyone can upload" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'videos');
  
  CREATE POLICY "Anyone can download" ON storage.objects
    FOR SELECT USING (bucket_id = 'videos');
END $$; 