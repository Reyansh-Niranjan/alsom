-- Multi-Chat System Database Migration
-- Run this in your Supabase SQL Editor

-- 1. Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT 'New Chat',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add conversation_id to chat_history
ALTER TABLE chat_history 
  ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE;

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_history_conversation_id ON chat_history(conversation_id, created_at ASC);

-- 4. Migrate existing messages to a default conversation per user
-- This creates a "Chat History" conversation for each user with existing messages
DO $$
DECLARE
  user_record RECORD;
  default_conversation_id UUID;
BEGIN
  FOR user_record IN 
    SELECT DISTINCT user_id FROM chat_history WHERE conversation_id IS NULL
  LOOP
    -- Create default conversation for this user
    INSERT INTO conversations (user_id, title, created_at)
    VALUES (user_record.user_id, 'Chat History', NOW())
    RETURNING id INTO default_conversation_id;
    
    -- Link all existing messages to this conversation
    UPDATE chat_history
    SET conversation_id = default_conversation_id
    WHERE user_id = user_record.user_id AND conversation_id IS NULL;
  END LOOP;
END $$;

-- 5. Make conversation_id NOT NULL after migration
ALTER TABLE chat_history 
  ALTER COLUMN conversation_id SET NOT NULL;

-- 6. Enable Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for conversations
CREATE POLICY "Users can view their own conversations" 
  ON conversations FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations" 
  ON conversations FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations" 
  ON conversations FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations" 
  ON conversations FOR DELETE 
  USING (auth.uid() = user_id);

-- 8. Update RLS policies for chat_history to work with conversations
DROP POLICY IF EXISTS "Users can view their own messages" ON chat_history;
DROP POLICY IF EXISTS "Users can insert their own messages" ON chat_history;
DROP POLICY IF EXISTS "Users can update their own messages" ON chat_history;
DROP POLICY IF EXISTS "Users can delete their own messages" ON chat_history;

CREATE POLICY "Users can view messages in their conversations" 
  ON chat_history FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = chat_history.conversation_id 
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages in their conversations" 
  ON chat_history FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = chat_history.conversation_id 
      AND conversations.user_id = auth.uid()
    )
  );

-- 9. Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations 
  SET updated_at = NOW() 
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Create trigger to update conversation timestamp when new message is added
DROP TRIGGER IF EXISTS update_conversation_on_message ON chat_history;
CREATE TRIGGER update_conversation_on_message
  AFTER INSERT ON chat_history
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();

COMMENT ON TABLE conversations IS 'Stores individual chat conversations for the multi-chat system';
COMMENT ON COLUMN conversations.title IS 'Auto-generated from first message or user-defined';
