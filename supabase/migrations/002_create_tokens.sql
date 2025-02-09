-- Token rewards table
create table if not exists tokens (
  id uuid default uuid_generate_v4() primary key,
  video_id uuid references videos(id),
  issuer_id text not null,
  recipient_id text not null,
  eth_token_id text, -- Simulated Ethereum token ID
  eth_contract_addr text default '0x1234567890123456789012345678901234567890', -- Stub contract address
  token_uri text, -- IPFS metadata URI (stubbed)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table tokens enable row level security;

-- Drop existing policies if they exist
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Anyone can create tokens" ON tokens;
    DROP POLICY IF EXISTS "Users can read their own tokens" ON tokens;
END $$;

-- Create policies
create policy "Anyone can create tokens"
  on tokens for insert
  with check (true);

create policy "Users can read their own tokens"
  on tokens for select
  using (recipient_id = auth.uid()::text or issuer_id = auth.uid()::text); 