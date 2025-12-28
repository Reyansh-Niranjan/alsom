import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper for delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function sendMessageToGroq(message, context = '', rawMessages = null) {
  let messagesPayload;

  if (rawMessages) {
    messagesPayload = rawMessages;
  } else {
    const fullMessage = context ? `${context}\nUser: ${message}` : message;
    messagesPayload = [{ role: 'user', content: fullMessage }];
  }

  const MAX_RETRIES = 3;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_GROQ_KEY}`,
        },
        body: JSON.stringify({
          model: 'qwen/qwen3-32b',
          messages: messagesPayload,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle Rate Limit specifically
        if (response.status === 429) {
          const retryAfter = data.error?.message?.match(/try again in ([\d\.]+)s/)?.[1] ||
            data.error?.message?.match(/try again in ([\d\.]+)ms/)?.[1] / 1000 ||
            2; // Default 2s

          console.warn(`Rate limit hit (Attempt ${attempt + 1}). Retrying in ${retryAfter}s...`);
          await delay(Math.ceil(retryAfter * 1000) + 100); // Wait + buffer
          attempt++;
          continue; // Retry
        }

        console.error('Groq API Error:', data);
        return {
          content: `Error: ${data.error?.message || 'Failed to get response from AI.'}`,
          thinking: null
        };
      }

      let content = data.choices?.[0]?.message?.content || 'No response';

      const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/);
      const thinking = thinkMatch ? thinkMatch[1].trim() : null;
      const cleanContent = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

      return {
        content: cleanContent,
        thinking: thinking
      };

    } catch (error) {
      console.error('Network Error:', error);
      if (attempt === MAX_RETRIES - 1) {
        return { content: "Network error: Unable to reach AI service.", thinking: null };
      }
      attempt++;
      await delay(1000);
    }
  }
}

// Conversation Management Functions
export async function createConversation(userId, title = 'New Chat') {
  const { data, error } = await supabase
    .from('conversations')
    .insert([{ user_id: userId, title }])
    .select()
    .single();

  if (error) {
    console.error('Error creating conversation:', error);
    return null;
  }
  return data;
}

export async function getConversations(userId) {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching conversations:', error);
    return [];
  }
  return data || [];
}

export async function updateConversation(conversationId, updates) {
  const { error } = await supabase
    .from('conversations')
    .update(updates)
    .eq('id', conversationId);

  if (error) console.error('Error updating conversation:', error);
  return !error;
}

export async function deleteConversation(conversationId) {
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId);

  if (error) console.error('Error deleting conversation:', error);
  return !error;
}

export async function getMessagesByConversation(conversationId) {
  const { data, error } = await supabase
    .from('chat_history')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error loading messages:', error);
    return [];
  }
  return data || [];
}

// User Memory Functions
export async function getUserMemory(userId) {
  // Only allow if userId is present and matches current session
  const session = supabase.auth.getSession ? (await supabase.auth.getSession()).data.session : null;
  if (!session || !session.user || session.user.id !== userId) {
    console.warn('User not authenticated or mismatched user_id');
    return "";
  }
  const { data, error } = await supabase
    .from('user_memory')
    .select('content')
    .eq('user_id', userId)
    .eq('key', 'general_notes')
    .order('id', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching memory:', error);
    return "";
  }
  return data && data.length > 0 ? data[0].content : "";
}

export async function updateUserMemory(userId, newContent) {
  // Only allow if userId is present and matches current session
  const session = supabase.auth.getSession ? (await supabase.auth.getSession()).data.session : null;
  if (!session || !session.user || session.user.id !== userId) {
    console.warn('User not authenticated or mismatched user_id');
    return false;
  }
  const { error } = await supabase
    .from('user_memory')
    .upsert(
      { user_id: userId, key: 'general_notes', content: newContent },
      { onConflict: 'user_id, key' }
    );

  if (error) console.error('Error updating memory:', error);
  return !error;
}
