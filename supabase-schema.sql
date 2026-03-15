-- Run this in your Supabase dashboard → SQL Editor
-- Creates the table and security policy for Stillpoint

create table if not exists wellness_data (
  user_id uuid references auth.users(id) on delete cascade primary key,
  log jsonb default '{}'::jsonb,
  journal jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- Enable Row Level Security so each user can only access their own data
alter table wellness_data enable row level security;

-- Policy: users can read their own row
create policy "Users can read own data"
  on wellness_data for select
  using (auth.uid() = user_id);

-- Policy: users can insert their own row
create policy "Users can insert own data"
  on wellness_data for insert
  with check (auth.uid() = user_id);

-- Policy: users can update their own row
create policy "Users can update own data"
  on wellness_data for update
  using (auth.uid() = user_id);

-- Policy: users can delete their own row
create policy "Users can delete own data"
  on wellness_data for delete
  using (auth.uid() = user_id);
