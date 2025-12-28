-- Create a table for user-specific memory/preferences
create table if not exists user_memory (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    key text not null,
    value text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, key)
);

-- Enable RLS
alter table user_memory enable row level security;

-- Policies
create policy "Users can view their own memory"
  on user_memory for select
  using (auth.uid() = user_id);

create policy "Users can insert their own memory"
  on user_memory for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own memory"
  on user_memory for update
  using (auth.uid() = user_id);

create policy "Users can delete their own memory"
  on user_memory for delete
  using (auth.uid() = user_id);
