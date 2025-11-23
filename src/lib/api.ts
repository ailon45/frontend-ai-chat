import axios from 'axios';

// ⚙️ CONFIGURE YOUR BACKEND URL HERE
// Change this to match your Python backend URL
const API_BASE_URL = 'https://ai-chatbot-4fvq.onrender.com';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface UploadResponse {
  pdf_id: string;
  number_of_chunks: number;
}

export interface ChatSession {
  id: string;
  name: string;
  mode: 'chat' | 'pdf';
  pdf_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface GeneralChatRequest {
  query: string;
  session_id: string;
}

export interface GeneralChatResponse {
  response: string;
  message_id: string;
}

/**
 * Upload a PDF file to the backend
 */
export async function uploadPDF(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post<UploadResponse>(
    `${API_BASE_URL}/upload-pdf`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data;
}

/**
 * Retrieve RAG chunks from the backend (PDF mode)
 */
export async function retrieveChunks(query: string, pdfId: string): Promise<string[]> {
  const response = await apiClient.post<{ chunks: string[] }>('/retrieve', {
    query,
    pdf_id: pdfId,
  });

  return response.data.chunks;
}

/**
 * Send a general chat message (no PDF)
 */
export async function sendGeneralChat(query: string, sessionId: string): Promise<GeneralChatResponse> {
  const response = await apiClient.post<GeneralChatResponse>('/chat', {
    query,
    session_id: sessionId,
  });

  return response.data;
}

/**
 * Create a new chat session
 */
export async function createSession(name: string, mode: 'chat' | 'pdf', pdfId?: string): Promise<ChatSession> {
  const response = await apiClient.post<ChatSession>('/sessions', {
    name,
    mode,
    pdf_id: pdfId,
  });

  return response.data;
}

/**
 * Get all chat sessions
 */
export async function getSessions(): Promise<ChatSession[]> {
  const response = await apiClient.get<{ sessions: ChatSession[] }>('/sessions');
  return response.data.sessions;
}

/**
 * Get chat history for a session
 */
export async function getChatHistory(sessionId: string): Promise<ChatMessage[]> {
  const response = await apiClient.get<{ messages: ChatMessage[] }>(`/sessions/${sessionId}/messages`);
  return response.data.messages;
}

/**
 * Save a message to the backend
 */
export async function saveMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<ChatMessage> {
  const response = await apiClient.post<ChatMessage>('/messages', {
    session_id: sessionId,
    role,
    content,
  });

  return response.data;
}

/**
 * Delete a session
 */
export async function deleteSession(sessionId: string): Promise<void> {
  await apiClient.delete(`/sessions/${sessionId}`);
}