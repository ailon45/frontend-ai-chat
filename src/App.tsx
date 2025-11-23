import { useState, useRef, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ChatContainer } from './components/ChatContainer';
import { MessageInputBar } from './components/MessageInputBar';
import { PDFUploadCard } from './components/PDFUploadCard';
import { EmptyState } from './components/EmptyState';
import { ThemeProvider } from './lib/theme-context';
import { toast, Toaster } from 'sonner';
import {
  uploadPDF,
  retrieveChunks,
  createSession,
  getSessions,
  getChatHistory,
  saveMessage,
  deleteSession,
  type ChatSession
} from './lib/api';
import { callLLM } from './lib/puter';
import { AI_MODELS } from './lib/constants';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface PDFInfo {
  id: string;
  name: string;
  numberOfChunks: number;
  status: 'uploading' | 'ready' | 'error';
}

// Available AI models from Puter.js
// Re-export for backward compatibility
export { AI_MODELS };

function AppContent() {
  const [mode, setMode] = useState<'chat' | 'pdf'>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [pdfInfo, setPdfInfo] = useState<PDFInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('gpt-5-nano'); // AI model selection
  const messagesEndRef = useRef<HTMLDivElement>(null);


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const loadedSessions = await getSessions();
      setSessions(loadedSessions);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const handleNewChat = async () => {
    if (mode === 'chat') {
      // Chat mode: Ephemeral, no backend session
      setCurrentSession(null);
      setMessages([]);
      toast.success('New chat started');
      return;
    }

    try {
      const sessionName = `PDF Chat ${new Date().toLocaleDateString()}`;

      const newSession = await createSession(
        sessionName,
        mode,
        pdfInfo?.id
      );

      setCurrentSession(newSession);
      setMessages([]);
      setSessions(prev => [newSession, ...prev]);
      toast.success('New PDF chat created!');
    } catch (error) {
      console.error('Failed to create session:', error);
      toast.error('Failed to create new chat');
    }
  };

  const handleSelectSession = async (session: ChatSession) => {
    try {
      setCurrentSession(session);
      const history = await getChatHistory(session.id);

      const loadedMessages: Message[] = history.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp)
      }));

      setMessages(loadedMessages);

      // Set mode based on session
      setMode(session.mode);

      // If it's a PDF session, restore PDF info so chat interface shows
      if (session.mode === 'pdf' && session.pdf_id) {
        setPdfInfo({
          id: session.pdf_id,
          name: session.name,
          numberOfChunks: 0, // optional, not needed for display
          status: 'ready'
        });
      } else {
        setPdfInfo(null);
      }

    } catch (error) {
      console.error('Failed to load session:', error);
      toast.error('Failed to load chat history');
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));

      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
        setMessages([]);
      }

      toast.success('Chat deleted');
    } catch (error) {
      console.error('Failed to delete session:', error);
      toast.error('Failed to delete chat');
    }
  };

  const handleModeChange = (newMode: 'chat' | 'pdf') => {
    setMode(newMode);
    // Clear session and messages to enforce separation
    setCurrentSession(null);
    setMessages([]);
  };

  const handlePDFUpload = async (file: File) => {
    setPdfInfo({
      id: '',
      name: file.name,
      numberOfChunks: 0,
      status: 'uploading'
    });

    try {
      const response = await uploadPDF(file);
      setPdfInfo({
        id: response.pdf_id,
        name: file.name,
        numberOfChunks: response.number_of_chunks,
        status: 'ready'
      });

      // Create a new session for this PDF
      const newSession = await createSession(
        file.name.replace('.pdf', ''),
        'pdf',
        response.pdf_id
      );

      setCurrentSession(newSession);
      setMessages([]);
      setSessions(prev => [newSession, ...prev]);

      toast.success('PDF uploaded successfully!');
    } catch (error) {
      setPdfInfo(null);
      toast.error('Failed to upload PDF. Please try again.');
      console.error('Upload error:', error);
    }
  };

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      let llmResponse: string;

      if (mode === 'pdf') {
        // PDF mode: Use backend for RAG
        if (!pdfInfo || pdfInfo.status !== 'ready') {
          toast.error('Please upload a PDF first');
          setIsLoading(false);
          return;
        }

        // Retrieve chunks from backend
        const chunks = await retrieveChunks(content, pdfInfo.id);
        const contextText = chunks.map((chunk, idx) =>
          `[Context ${idx + 1}]:\n${chunk}`
        ).join('\n\n');

        const prompt = `You are a helpful AI assistant. Answer the user's question based on the following context from their PDF document or if not related to document then also give answer according to the text.

Context:
${contextText}

User Question: ${content}

Please provide a clear, accurate answer based on the context above. If the answer cannot be found in the context, say so.`;

        llmResponse = await callLLM(prompt, { model: selectedModel });

        // Save to backend for PDF mode
        if (currentSession) {
          await saveMessage(currentSession.id, 'user', content);
          await saveMessage(currentSession.id, 'assistant', llmResponse);
        }
      } else {
        // Chat mode: Use Puter.js directly (no backend)
        llmResponse = await callLLM(content, { model: selectedModel });
        // No backend saving for chat mode - pure Puter.js
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: llmResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      toast.error('Failed to get response. Please try again.');
      console.error('Message error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Toaster position="top-right" />

      {/* Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <Sidebar
            pdfInfo={pdfInfo}
            sessions={sessions}
            currentSession={currentSession}
            onSelectSession={handleSelectSession}
            onNewChat={handleNewChat}
            onDeleteSession={handleDeleteSession}
            onClose={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <Header
          mode={mode}
          onModeChange={handleModeChange}
          onMenuClick={() => setIsSidebarOpen(true)}
          isSidebarOpen={isSidebarOpen}
          pdfReady={mode === 'pdf' && pdfInfo?.status === 'ready'}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
        />

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {mode === 'pdf' && !pdfInfo ? (
            <div className="flex-1 flex items-center justify-center p-4 md:p-8">
              <PDFUploadCard onUpload={handlePDFUpload} />
            </div>
          ) : (
            <>
              {messages.length === 0 && !isLoading ? (
                <EmptyState mode={mode} pdfName={pdfInfo?.name} />
              ) : (
                <ChatContainer
                  messages={messages}
                  isLoading={isLoading}
                  messagesEndRef={messagesEndRef}
                />
              )}

              <MessageInputBar
                onSend={handleSendMessage}
                disabled={isLoading || (mode === 'pdf' && pdfInfo?.status !== 'ready')}
                onPDFUpload={mode === 'pdf' ? handlePDFUpload : undefined}
                showUpload={mode === 'pdf' && pdfInfo?.status === 'ready'}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
