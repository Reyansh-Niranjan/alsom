# Multi-Chat System Setup

## 🎨 New Features
- **Multiple Conversations**: Create and manage separate chat threads
- **Modern UI**: Inspired by Gemini, ChatGPT, and Claude
- **Dark/Light Themes**: Toggle between beautiful themes
- **Responsive Sidebar**: Collapsible conversation list
- **Inline Editing**: Rename conversations on the fly
- **Auto-generated Titles**: Conversations automatically titled from first message
- **📎 RAG File Uploads**: Upload PDFs, text files for context-aware responses
- **🧠 Thinking Mode**: See the AI's reasoning process (collapsible)
- **🎤 Voice Mode**: Speak to chat, hear responses read aloud

---

## ⚙️ Environment Setup

Create a `.env.local` file in the project root with these variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Groq API Key (Free tier available)
VITE_GROQ_KEY=your_groq_api_key

# Google Custom Search (Optional - for Web Search tool)
VITE_GOOGLE_API_KEY=your_google_api_key
VITE_GOOGLE_CX=your_search_engine_id

## ElevenLabs (Voice)

This project supports optional ElevenLabs voice features:

- Text-to-Speech via serverless route `/api/tts`
- Realtime Speech-to-Text (Scribe v2 Realtime) via `/api/scribe-token`

### Required (server-side)

Add these to your Vercel project env vars (or local `.env` used by your deployment runtime):

- `ELEVENLABS_API_KEY` – ElevenLabs API key (never expose to the browser)
- `ELEVENLABS_DEFAULT_VOICE_ID` – default voice id to use for `/api/tts`

Optional:

- `ELEVENLABS_TTS_MODEL_ID` (default: `eleven_flash_v2_5`)
- `ELEVENLABS_OUTPUT_FORMAT` (default: `mp3_44100_128`)

### Optional (client-side toggles)

Set these in your local `.env` for Vite (or Vercel build-time env vars prefixed with `VITE_`):

- `VITE_TTS_PROVIDER=elevenlabs` (otherwise defaults to browser Web Speech)
- `VITE_STT_PROVIDER=elevenlabs` (otherwise defaults to browser SpeechRecognition)

Note: If you set `VITE_STT_PROVIDER=elevenlabs`, the app will call `/api/scribe-token` to mint a single-use token.
```

### Getting Your Keys:

**Supabase (Free tier):**
1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to Settings > API
4. Copy the **Project URL** → `VITE_SUPABASE_URL`
5. Copy the **anon/public key** → `VITE_SUPABASE_ANON_KEY`

**Groq API (Free tier - very generous!):**
1. Go to [console.groq.com](https://console.groq.com)
2. Create a free account
3. Go to API Keys and create a new key
4. Copy the key → `VITE_GROQ_KEY`

**Google Custom Search (for Web Capabilities):**
1. Get API Key: [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Enable "Custom Search API"
   - Create API Key → `VITE_GOOGLE_API_KEY`
2. Get Search Engine ID (CX): [Programmable Search Engine](https://programmablesearchengine.google.com/)
   - Create a search engine (select "Search the entire web")
   - Copy CX ID → `VITE_GOOGLE_CX`


### Supabase Storage Setup (for RAG file uploads):
1. In Supabase, go to Storage
2. Create a new bucket called `documents`
3. Set bucket to **Public** or configure RLS policies

---

## 📋 Database Migration Required

Before running the app, you **must** run the database migrations.

### Steps:
1. Open your Supabase project dashboard
2. Go to the SQL Editor
3. Run `database_migration.sql` (for multi-chat support)
4. Run `rag_migration.sql` (for file uploads/RAG)
5. Run `fix_schema.sql` (for Agent Memory & History fix)

---

## 🚀 Running the Application

```bash
npm install
npm run dev
```

Open your browser to the URL shown in the terminal (usually `http://localhost:5173`)

---

## 🎯 Features Guide

### 📎 Uploading Files (RAG)
- Click "Add files" above the input bar
- Upload PDFs, TXT, or MD files
- The AI will use file content to answer your questions

### 🧠 Viewing AI Thinking
- AI responses may show a "Show reasoning" button
- Click to expand and see how the AI reasoned through the answer

### 🎤 Voice Mode
- **Microphone button**: Click to speak your message
- **Speaker button**: Toggle text-to-speech for AI responses
- Works best in Chrome/Edge browsers

### Creating a New Chat
- Click the "+ New Chat" button in the sidebar
- Start typing your message

### Switching Conversations
- Click on any conversation in the sidebar
- The chat history will load automatically

### Renaming Conversations
- Hover over the conversation title in the header
- Click the edit icon (✎)
- Type the new name and press Enter

### Deleting Conversations
- Hover over a conversation in the sidebar
- Click the delete icon (🗑)
- Confirm deletion

### Changing Themes
- Click the theme toggle button (🌙/☀️)
- Your preference is saved automatically

---

## 🎨 Design Highlights

- **Gradient accents** inspired by Google Gemini
- **Sidebar layout** similar to ChatGPT
- **Clean typography** like Claude
- **Smooth animations** throughout
- **Glassmorphic effects** on auth screen
- **Responsive design** for all screen sizes

---

## 📱 Mobile Support

On mobile devices:
- Sidebar toggles from the hamburger menu
- Optimized touch targets
- Responsive chat bubbles
- Full-screen chat experience
