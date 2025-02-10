-- Create metrics table
create table if not exists metrics (
  id uuid default uuid_generate_v4() primary key,
  type text not null,
  data jsonb not null default '{}'::jsonb,
  session_id text,
  user_agent text,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create errors table
create table if not exists errors (
  id uuid default uuid_generate_v4() primary key,
  type text not null,
  message text not null,
  stack text,
  context jsonb not null default '{}'::jsonb,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table metrics enable row level security;
alter table errors enable row level security;

-- Create policies
create policy "Anyone can insert metrics"
  on metrics for insert
  with check (true);

create policy "Anyone can read metrics"
  on metrics for select
  using (true);

create policy "Anyone can insert errors"
  on errors for insert
  with check (true);

create policy "Anyone can read errors"
  on errors for select
  using (true);

-- Create indexes
create index metrics_type_idx on metrics (type);
create index metrics_timestamp_idx on metrics (timestamp);
create index errors_type_idx on errors (type);
create index errors_timestamp_idx on errors (timestamp); 