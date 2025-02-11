-- Create tokens table
create table tokens (
  id uuid default uuid_generate_v4() primary key,
  amount integer not null,
  video_id uuid references videos(id),
  type text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table tokens enable row level security;

-- Create policies
create policy "Tokens are viewable by everyone" 
  on tokens for select 
  using (true);

create policy "Anyone can create tokens" 
  on tokens for insert 
  with check (true);

-- Create token balance function
create or replace function get_token_balance()
returns integer
language sql
security definer
as $$
  select coalesce(sum(amount), 0)::integer from tokens;
$$; 