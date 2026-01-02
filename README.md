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
  "session_id": "unique-session-identifier",
  "messages": [
    { "role": "user", "content": "Hello, how are you?" }
  ],
  "tools": ["time", "websearch"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `site` | string | Yes | Identifier for the calling site |
| `session_id` | string | Yes | Unique session ID for threading conversations |
| `messages` | array | Yes | Array of message objects with `role` and `content` |
| `tools` | array | No | List of tools to enable. Available: `time`, `websearch` |

**Response Body:**
```json
{
  "reply": "I'm doing well, thank you for asking!",
  "tool_calls": [],
  "usage": {
    "prompt_tokens": 150,
    "completion_tokens": 25,
    "total_tokens": 175
  },
  "debug": {
    "site": "myblog",
    "session_id": "unique-session-identifier",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `reply` | string | The AI model's text response |
| `tool_calls` | array | Array of tool calls made (if any), each with `tool`, `input`, `output` |
| `usage` | object | Token usage information |
| `debug` | object | Debug information including site, session_id, and timestamp |

**Example Usage:**
```javascript
const response = await fetch("https://your-app.vercel.app/api/chat", {
  method: "POST",
  body: JSON.stringify({
    site: "myblog",
    session_id: "user-123-session-456",
    messages: [
      { role: "user", content: "What time is it?" }
    ],
    tools: ["time"]
  }),
  headers: { "Content-Type": "application/json" }
});

const data = await response.json();
console.log(data.reply);
```

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
