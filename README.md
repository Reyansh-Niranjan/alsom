# AI Chatbot with Vite.js, Groq, and Supabase

## Features
- React-based AI chatbot UI
- Groq API for AI responses
- Supabase for authentication and data storage
- Chat history persistence
- Ready for deployment on Vercel via GitHub

## Setup
1. Clone the repository from GitHub.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up Supabase:
   - Go to your Supabase dashboard: https://supabase.com/dashboard/project/uqyesvitzyneradoqwnu
   - In the SQL Editor, run the following to create the chat_history table:
     ```sql
     CREATE TABLE chat_history (
       id SERIAL PRIMARY KEY,
       user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
       role TEXT NOT NULL,
       content TEXT NOT NULL,
       created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
     );
     ```
   - Enable Row Level Security (RLS) on the table and create policies to allow users to read/write their own messages.
4. Environment variables are set in `.env.local` and `vercel.json`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY` (get from Supabase dashboard > Settings > API > Project API keys > anon public)
   - `VITE_GROQ_KEY`

## Development
```bash
npm run dev
```

## Deployment
- Push to GitHub and connect the repo to Vercel.
- Vercel will use `vercel.json` for build and environment variables.

## API Endpoint

The application exposes a `/api/chat` endpoint for external sites to integrate with the chatbot.

### POST `/api/chat`

**Request Body:**
```json
{
  "site": "myblog",
  "user_id": "unique-user-identifier",
  "session_id": "unique-session-identifier",
  "messages": [
    { "role": "system", "content": "You are a helpful assistant specialized in books" },
    { "role": "user", "content": "Hello, how are you?" }
  ],
  "tools": ["time", "websearch"],
  "add_tools": true,
  "additional_tools": [
    { "name": "book_search", "description": "Search for books by query" }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `site` | string | Yes | Identifier for the calling site |
| `user_id` | string | Yes | Unique user identifier for privacy and data isolation |
| `session_id` | string | Yes | Unique session ID for threading conversations |
| `messages` | array | Yes | Array of message objects with `role` and `content`. System messages are appended to the base system prompt. |
| `tools` | array | No | List of built-in tools to enable. Available: `time`, `websearch` |
| `add_tools` | boolean | No | If `true`, includes tool call details in response. Default: `false` |
| `additional_tools` | array | No | External tools for the AI to use. Each tool should have `name` and optional `description` |

**Response Body (when add_tools = false):**
```json
{
  "reply": "I'm doing well, thank you for asking!",
  "usage": {
    "prompt_tokens": 150,
    "completion_tokens": 25,
    "total_tokens": 175
  },
  "debug": {
    "site": "myblog",
    "user_id": "user-123",
    "session_id": "unique-session-identifier",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

**Response Body (when add_tools = true):**
```json
{
  "reply": "I found 3 books that match your interests!",
  "tool_calls": [
    {
      "tool": "websearch",
      "input": "popular science fiction books 2024",
      "output": "Found the following information..."
    }
  ],
  "external_tool_calls": [
    {
      "tool": "book_search",
      "input": "science fiction",
      "status": "pending"
    }
  ],
  "usage": {
    "prompt_tokens": 150,
    "completion_tokens": 25,
    "total_tokens": 175
  },
  "debug": {
    "site": "myblog",
    "user_id": "user-123",
    "session_id": "unique-session-identifier",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `reply` | string | The AI model's text response (only content from `<Response>` tag) |
| `tool_calls` | array | (Only if `add_tools=true`) Array of built-in tool calls executed by alsom, each with `tool`, `input`, `output` |
| `external_tool_calls` | array | (Only if `add_tools=true` and external tools used) Array of external tool calls to be executed by the calling application, each with `tool`, `input`, `status` |
| `usage` | object | Token usage information |
| `debug` | object | Debug information including site, user_id, session_id, and timestamp |

**Example Usage:**

Basic usage without tool calls:
```javascript
const response = await fetch("https://your-app.vercel.app/api/chat", {
  method: "POST",
  body: JSON.stringify({
    site: "myblog",
    user_id: "user-123",
    session_id: "session-456",
    messages: [
      { role: "user", content: "What time is it?" }
    ],
    tools: ["time"]
  }),
  headers: { "Content-Type": "application/json" }
});

const data = await response.json();
console.log(data.reply); // Only the response content
```

With custom system prompt and external tools:
```javascript
const response = await fetch("https://your-app.vercel.app/api/chat", {
  method: "POST",
  body: JSON.stringify({
    site: "bookstore",
    user_id: "user-123",
    session_id: "session-456",
    messages: [
      { 
        role: "system", 
        content: "You are a helpful AI assistant. You have an additional tool called book_search that returns books available in our database." 
      },
      { role: "user", content: "Can you find books about AI?" }
    ],
    tools: ["websearch"],
    add_tools: true,
    additional_tools: [
      { "name": "book_search", "description": "Search books in our catalog" }
    ]
  }),
  headers: { "Content-Type": "application/json" }
});

const data = await response.json();
console.log(data.reply); // AI response
console.log(data.tool_calls); // Built-in tools executed
console.log(data.external_tool_calls); // External tools to execute

// Handle external tool calls
if (data.external_tool_calls && data.external_tool_calls.length > 0) {
  for (const toolCall of data.external_tool_calls) {
    if (toolCall.tool === "book_search") {
      // Execute your book search with toolCall.input
      const books = await yourBookSearchFunction(toolCall.input);
      // Continue conversation with the results...
    }
  }
}
```

**Key Features:**

1. **Privacy**: `user_id` is required for proper data isolation between users
2. **System Messages**: Messages with `role: "system"` are appended to the base system prompt, not overwriting it
3. **Built-in Tools**: Tools like `time` and `websearch` are executed by the alsom server
4. **External Tools**: When `additional_tools` are provided and the AI calls them, they are returned as `external_tool_calls` for the calling application to execute
5. **Selective Tool Details**: By default (`add_tools=false`), only the final response is returned. Set `add_tools=true` to receive tool call details
6. **Tool Loop Support**: When external tools are called, the calling application should execute them and make a follow-up request with the results

**Environment Variables Required for API:**
- `GROQ_KEY` - Your Groq API key (required)
- `GOOGLE_API_KEY` - Google Custom Search API key (optional, for enhanced web search)
- `GOOGLE_CX` - Google Custom Search Engine ID (optional)

## Notes
- Keep your secret keys safe.
- Authentication is handled via Supabase Auth UI (email/password by default).
- To enable social providers (Google, GitHub, etc.), configure them in your Supabase dashboard under Authentication > Providers.
- Keep your secret keys safe.
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
