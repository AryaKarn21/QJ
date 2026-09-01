import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// Deliberately no auth header — GET /api/chatbot/suggestions and
// POST /api/chatbot/ask are public on the backend (see
// backend/routes/chatbotRoutes.js) so logged-out visitors can use the
// help assistant too.

export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface ChatbotReply {
  reply: string;
  source: 'ai' | 'faq' | 'fallback';
  matchedQuestion?: string;
}

export const askChatbot = async (message: string, history: ChatTurn[]): Promise<ChatbotReply> => {
  const res = await axios.post(`${API_BASE_URL}/api/chatbot/ask`, { message, history });
  return res.data as ChatbotReply;
};

export const getSuggestedQuestions = async (): Promise<string[]> => {
  const res = await axios.get(`${API_BASE_URL}/api/chatbot/suggestions`);
  return res.data.suggestions as string[];
};
