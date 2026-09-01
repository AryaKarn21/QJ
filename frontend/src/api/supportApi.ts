import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Reads the token fresh on every call (rather than once at module load)
// so it reflects the current logged-in user, including after login/logout
// without a full page reload.
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

export interface TicketPayload {
  name?: string;
  email?: string;
  subject: string;
  message: string;
  category?: string;
}

export interface SupportTicket {
  _id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  category: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  adminReply?: string;
  repliedAt?: string;
  createdAt: string;
}

// Submits a new support ticket. Works whether or not the person is
// logged in — if a token exists, the backend attaches their account;
// otherwise name/email from the form are used directly.
export const submitTicket = async (payload: TicketPayload) => {
  const res = await axios.post(`${API_BASE_URL}/api/support/tickets`, payload, getAuthHeader());
  return res.data;
};

// Logged-in user's own ticket history
export const fetchMyTickets = async (): Promise<SupportTicket[]> => {
  const res = await axios.get(`${API_BASE_URL}/api/support/my-tickets`, getAuthHeader());
  return res.data;
};