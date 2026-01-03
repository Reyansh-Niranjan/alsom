import { useState, useEffect, useCallback } from 'react';
import { Analytics } from '@vercel/analytics/react';
import './App.css';
import './components/ToolStyles.css';
import {
  sendMessageToGroq,
  supabase,
  createConversation,
  getConversations,
  updateConversation,
  deleteConversation,
  getMessagesByConversation
} from './chatbot';
import { getDocuments, buildFullContext } from './rag';
import AuthComponent from './Auth';
import Sidebar from './components/Sidebar';
import ChatHeader from './components/ChatHeader';
import FileUpload from './components/FileUpload';
import ThinkingBlock from './components/ThinkingBlock';
import VoiceMode, { speakText, stopSpeaking } from './components/VoiceMode';
import { ChatBubbleIcon, UserIcon, RobotIcon, SendIcon } from './components/Icons';
import AnimatedLogo from './components/AnimatedLogo';

import LiveAudioInterface from './components/LiveAudioInterface';
import { runAgent } from './agentLoop';


function App() {
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(window.innerWidth < 768);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  const [isTransitioning, setIsTransitioning] = useState(false);

  // New states for RAG, Thinking, and Voice
  const [documents, setDocuments] = useState([]);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  // Live Voice Mode States
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [isSpeechSpeaking, setIsSpeechSpeaking] = useState(false);
  const [lastAIResponse, setLastAIResponse] = useState('');

  // Load conversations when user logs in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch conversations when session is available
  useEffect(() => {
    if (session) {
      loadConversations();
    }
  }, [session]);

  // Load messages and documents when conversation changes
  useEffect(() => {
    if (currentConversationId) {
      loadMessages(currentConversationId);
      loadDocuments(currentConversationId);
    } else {
      setMessages([]);
      setDocuments([]);
    }
  }, [currentConversationId]);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Cleanup TTS on unmount
  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  const loadConversations = async () => {
    if (!session) return;
    const convs = await getConversations(session.user.id);
    setConversations(convs);

    // If no conversations exist, create a new one
    if (convs.length === 0) {
      await handleNewChat();
    } else if (!currentConversationId) {
      // Select the most recent conversation
      setCurrentConversationId(convs[0].id);
    }
  };

  const loadMessages = async (conversationId) => {
    const msgs = await getMessagesByConversation(conversationId);
    setMessages(msgs);
  };

  const loadDocuments = async (conversationId) => {
    if (!session) return;
    const docs = await getDocuments(session.user.id, conversationId);
    setDocuments(docs);
  };

  const saveMessage = useCallback(async (role, content, conversationId, thinking = null) => {
    if (!session || !conversationId) return;
    const messageData = {
      user_id: session.user.id,
      role,
      content,
      conversation_id: conversationId
    };

    // Store thinking in metadata if present
    if (thinking) {
      messageData.metadata = { thinking };
    }

    const { error } = await supabase
      .from('chat_history')
      .insert([messageData]);

    if (error) console.error('Error saving message:', error);
  }, [session]);

  const handleNewChat = async () => {
    if (!session) return;
    const newConv = await createConversation(session.user.id, 'New Chat');
    if (newConv) {
      setConversations([newConv, ...conversations]);
      setCurrentConversationId(newConv.id);
      setMessages([]);
      setDocuments([]);
    }
  };

  const handleSelectChat = (conversationId) => {
    setCurrentConversationId(conversationId);
    stopSpeaking(); // Stop TTS when switching chats
  };

  const handleDeleteChat = async (conversationId) => {
    const success = await deleteConversation(conversationId);
    if (success) {
      const updatedConvs = conversations.filter(c => c.id !== conversationId);
      setConversations(updatedConvs);

      // If deleted chat was current, switch to another or create new
      if (conversationId === currentConversationId) {
        if (updatedConvs.length > 0) {
          setCurrentConversationId(updatedConvs[0].id);
        } else {
          await handleNewChat();
        }
      }
    }
  };

  const handleRenameChat = async (conversationId, newTitle) => {
    const success = await updateConversation(conversationId, { title: newTitle });
    if (success) {
      setConversations(conversations.map(c =>
        c.id === conversationId ? { ...c, title: newTitle } : c
      ));
    }
  };

  const autoGenerateTitle = async (conversationId, firstMessage) => {
    // Generate title from first user message (take first 30 chars)
    const title = firstMessage.length > 30
      ? firstMessage.substring(0, 30) + '...'
      : firstMessage;

    await handleRenameChat(conversationId, title);
  };

  const handleSend = async (messageOverride = null) => {
    // If messageOverride is provided (from voice auto-send), use it. Otherwise use input state.
    const textToSend = typeof messageOverride === 'string' ? messageOverride : input;

    if (!textToSend.trim() || !currentConversationId) return;
    setLoading(true);
    setIsThinking(true);

    const userMessage = { role: 'user', content: textToSend };
    setMessages((prev) => [...prev, userMessage]);
    await saveMessage('user', textToSend, currentConversationId);

    // Auto-generate title if this is the first message
    if (messages.length === 0) {
      await autoGenerateTitle(currentConversationId, textToSend);
    }

    // Agentic Mode: Run the agent loop
    let finalResponseContent = '';
    let finalThinking = '';

    // Function to handle tool call visualization
    const handleToolCall = async (toolName, toolParams) => {
      const toolMsg = `Tool Call: ${toolName}\nParams: ${toolParams}`;
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Using tool: ${toolName}...`,
          toolName: toolName,
          toolParams: toolParams,
          isTool: true
        }
      ]);
    };

    try {
      const agentResult = await runAgent(
        session.user.id,
        currentConversationId,
        textToSend,
        documents.length > 0,
        handleToolCall
      );

      finalResponseContent = agentResult.content;
      finalThinking = agentResult.thinking;

    } catch (err) {
      console.error("Agent Error:", err);
      finalResponseContent = "Sorry, I encountered an error while processing your request.";
    }

    setIsThinking(false);

    const aiMessage = {
      role: 'assistant',
      content: finalResponseContent,
      thinking: finalThinking
    };

    setMessages((msgs) => [...msgs, aiMessage]);
    await saveMessage('assistant', finalResponseContent, currentConversationId, finalThinking);
    setLastAIResponse(finalResponseContent);

    // Auto-speak if live mode is on or TTS is enabled
    if ((ttsEnabled || isLiveMode) && finalResponseContent) {
      speakText(
        finalResponseContent,
        () => setIsSpeechSpeaking(true),
        () => setIsSpeechSpeaking(false)
      );
    }

    // Refresh conversations to update timestamp
    loadConversations();

    setInput('');
    setLoading(false);
  };

  const handleVoiceTranscript = (transcript) => {
    setInput(transcript);
  };

  const toggleTheme = () => {
    setIsTransitioning(true);
    setTheme(theme === 'light' ? 'dark' : 'light');
    setTimeout(() => setIsTransitioning(false), 400);
  };

  const toggleLiveMode = (isRecording) => {
    setIsLiveMode(isRecording);
    // If turning on live mode, ensure TTS is enabled? 
    // Actually we logic-ed it above: (ttsEnabled || isLiveMode)
  };

  const getCurrentConversation = () => {
    return conversations.find(c => c.id === currentConversationId);
  };

  if (!session) {
    return <AuthComponent theme={theme} onToggleTheme={toggleTheme} />;
  }

  const currentConv = getCurrentConversation();

  return (
    <div className={`app-container ${theme} ${isTransitioning ? 'theme-transition' : ''}`}>
      <Analytics />
      {/* Full Screen Live Audio Overlay */}
      {isLiveMode && (
        <LiveAudioInterface
          isRecording={true}
          isSpeaking={isSpeechSpeaking}
          isThinking={isThinking}
          transcript={input}
          lastResponse={lastAIResponse}
          onExit={() => {
            // Programmatically click the recording button to stop
            const btn = document.querySelector('.voice-btn.recording');
            if (btn) btn.click();
            setIsLiveMode(false);
          }}
        />
      )}

      {/* When Overlay is active, we might want to hide the Exit button inside it and instead have VoiceMode accept a 'recording' prop. 
          But I already wrote VoiceMode to be controlled by its own button.
          Let's just update `onExit` to `document.querySelector('.voice-btn.recording').click()` hack? 
          No, let's pass `isLiveMode` to VoiceMode and make it respect that?
          
          Actually, the VoiceMode button sets `isRecording`.
          `onStateChange` updates `isLiveMode`.
          If I want to stop from Overlay, I need to update `isRecording` in VoiceMode.
          Since VoiceMode state is local, I can't easily.
          
          I will change `onExit` to just set `isLiveMode(false)` AND I will mount VoiceMode such that it stops?
          This is tricky without lifting state fully.
          
          QUICK FIX: Make `session` check happen first (done).
          
          I will pass a Ref to VoiceMode so I can call `toggleRecording`? 
          Or just accept that Exit button in Overlay is only creating a visual change?
          NO, user wants to properly exit.
          
          Let's assume for now the user clicks the Mic button to start, and can click "Exit" in overlay which simply hides overlay 
          BUT VoiceMode is still recording? No that's confusing.
          
          REAL FIX: Lift `isRecording` state to App entirely.
          Pass `isRecording` and `onToggleRecording` to VoiceMode.
      */}

      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        onRenameChat={handleRenameChat}
        onSignOut={() => supabase.auth.signOut()}
        userEmail={session.user.email}
        isCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        theme={theme}
      />

      <div className="chat-main">
        {currentConv && (
          <ChatHeader
            title={currentConv.title}
            onRename={(newTitle) => handleRenameChat(currentConv.id, newTitle)}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
        )}

        <div className={`chat-window-modern ${theme}`}>
          {messages.length === 0 && !loading && (
            <div className="chat-empty">
              <div className="empty-icon"><ChatBubbleIcon size={64} /></div>
              <h2>Start a conversation</h2>
              <p>Ask me anything! Upload files for context-aware responses.</p>
            </div>
          )}
          {messages.map((msg, idx) => {
            // Render Tool Calls as subtle status lines
            if (msg.isTool) {
              return (
                <div key={idx} className="tool-status-line">
                  <AnimatedLogo size={24} variant="tool" />
                  <span className="tool-name">{msg.toolName}</span>
                  <span className="tool-params">({msg.toolParams})</span>
                </div>
              );
            }

            return (
              <div key={idx} className={`chat-bubble-row ${msg.role === 'user' ? 'user-row' : 'ai-row'}`}>
                <div className={`chat-avatar ${msg.role}`}>
                  {msg.role === 'user' ? <UserIcon size={28} /> : <RobotIcon size={28} />}
                </div>
                <div className="message-content">
                  <div className={`chat-bubble ${msg.role}`}>{msg.content}</div>
                  {msg.role === 'assistant' && msg.thinking && (
                    <ThinkingBlock thinking={msg.thinking} />
                  )}
                </div>
              </div>
            );
          })}
          {loading && (
            <div className={`chat-bubble-row ai-row`}>
              <div className="chat-avatar assistant"><RobotIcon size={28} /></div>
              <div className="message-content">
                {isThinking && <ThinkingBlock isLoading={true} />}
                <div className="chat-bubble assistant typing">
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* File Upload Section */}
        {currentConversationId && (
          <div className="file-upload-section">
            <FileUpload
              userId={session.user.id}
              conversationId={currentConversationId}
              documents={documents}
              onDocumentsChange={setDocuments}
              theme={theme}
            />
          </div>
        )}

        <form className={`chat-input-bar ${theme}`} onSubmit={e => { e.preventDefault(); handleSend(); }}>
          <VoiceMode
            onTranscript={handleVoiceTranscript}
            onSendMessage={(text) => handleSend(text)}
            ttsEnabled={ttsEnabled}
            onToggleTTS={() => setTtsEnabled(!ttsEnabled)}
            disabled={loading}
            theme={theme}
            onStateChange={toggleLiveMode}
          />
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Message..."
            disabled={loading}
            autoFocus
          />
          <button type="submit" disabled={loading || !input.trim()}>
            <SendIcon size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
