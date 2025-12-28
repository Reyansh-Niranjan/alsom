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
