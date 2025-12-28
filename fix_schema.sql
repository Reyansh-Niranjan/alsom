-- 1. Create User Memory Table (if not exists)
create table if not exists user_memory (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    key text not null,
    value text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    content text, -- Older migration might have used 'value', code uses 'content'? check code.
    unique(user_id, key)
);
-- Note: code in chatbot.js uses 'content' column. 
-- "upsert({ ..., content: newContent })"
-- So we need 'content' column.
-- Let's ensure 'content' exists.
do $$ 
begin
    if not exists (select 1 from information_schema.columns where table_name = 'user_memory' and column_name = 'content') then
        alter table user_memory add column content text;
    end if;
end $$;


-- Enable RLS for User Memory
alter table user_memory enable row level security;

-- Policies for User Memory
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


-- 2. Fix Chat History Columns
-- App is resolving to send 'metadata' and 'thinking'. We need these columns.

do $$ 
begin
    -- Add 'thinking' column if missing
    if not exists (select 1 from information_schema.columns where table_name = 'chat_history' and column_name = 'thinking') then
        alter table chat_history add column thinking text;
    end if;

    -- Add 'metadata' column if missing
    if not exists (select 1 from information_schema.columns where table_name = 'chat_history' and column_name = 'metadata') then
        alter table chat_history add column metadata jsonb;
    end if;
end $$;

-- 3. Verify Constraints
-- Ensure conversation_id is optional or correct? No, it's usually required.
-- Ensure user_id is required.

