import axios from 'axios';
import type { AuthorSnapshot } from '../types/community';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

export type ConnectionStatus =
  | 'SELF'
  | 'NONE'
  | 'PENDING_SENT'
  | 'PENDING_RECEIVED'
  | 'CONNECTED'
  | 'BLOCKED_BY_ME'
  | 'BLOCKED_BY_THEM';

export interface ConnectionStatusResponse {
  status: ConnectionStatus;
  connectionId: string | null;
  mutualCount: number;
}

export interface ConnectionSuggestion extends AuthorSnapshot {
  mutualCount: number;
}

export interface PaginatedConnections {
  people: AuthorSnapshot[];
  page: number;
  totalPages: number;
  total: number;
}

// getPendingReceived/getPendingSent additionally attach each row's
// underlying Connection document id (getMyConnections does not — accepted
// connections don't need it inline, see MyConnectionsPage's lazy lookup
// on remove) so Accept/Reject/Cancel can act on a row directly.
export interface PendingPerson extends AuthorSnapshot {
  connectionId: string;
}

export interface PaginatedPendingConnections {
  people: PendingPerson[];
  page: number;
  totalPages: number;
  total: number;
}

export const getConnectionStatus = async (userId: string): Promise<ConnectionStatusResponse> => {
  const res = await axios.get(`${API_BASE_URL}/api/community/connections/${userId}/status`, getAuthHeader());
  return res.data;
};

export const sendConnectionRequest = async (
  userId: string
): Promise<{ status: 'pending' | 'accepted'; connectionId: string }> => {
  const res = await axios.post(`${API_BASE_URL}/api/community/connections/request/${userId}`, {}, getAuthHeader());
  return res.data;
};

export const acceptConnectionRequest = async (connectionId: string) => {
  const res = await axios.post(`${API_BASE_URL}/api/community/connections/${connectionId}/accept`, {}, getAuthHeader());
  return res.data;
};

export const rejectConnectionRequest = async (connectionId: string) => {
  const res = await axios.post(`${API_BASE_URL}/api/community/connections/${connectionId}/reject`, {}, getAuthHeader());
  return res.data;
};

export const cancelConnectionRequest = async (connectionId: string) => {
  const res = await axios.delete(`${API_BASE_URL}/api/community/connections/${connectionId}/cancel`, getAuthHeader());
  return res.data;
};

export const removeConnection = async (connectionId: string) => {
  const res = await axios.delete(`${API_BASE_URL}/api/community/connections/${connectionId}`, getAuthHeader());
  return res.data;
};

export const blockUser = async (userId: string) => {
  const res = await axios.post(`${API_BASE_URL}/api/community/connections/${userId}/block`, {}, getAuthHeader());
  return res.data;
};

export const unblockUser = async (userId: string) => {
  const res = await axios.delete(`${API_BASE_URL}/api/community/connections/${userId}/block`, getAuthHeader());
  return res.data;
};

export const getMyConnections = async (opts?: { page?: number; q?: string }): Promise<PaginatedConnections> => {
  const res = await axios.get(`${API_BASE_URL}/api/community/connections`, {
    ...getAuthHeader(),
    params: { page: opts?.page || 1, q: opts?.q || undefined },
  });
  return res.data;
};

export const getPendingReceived = async (page = 1): Promise<PaginatedPendingConnections> => {
  const res = await axios.get(`${API_BASE_URL}/api/community/connections/pending`, { ...getAuthHeader(), params: { page } });
  return res.data;
};

export const getPendingSent = async (page = 1): Promise<PaginatedPendingConnections> => {
  const res = await axios.get(`${API_BASE_URL}/api/community/connections/sent`, { ...getAuthHeader(), params: { page } });
  return res.data;
};

export const getConnectionSuggestions = async (limit = 8): Promise<ConnectionSuggestion[]> => {
  const res = await axios.get(`${API_BASE_URL}/api/community/connections/suggestions`, {
    ...getAuthHeader(),
    params: { limit },
  });
  return res.data.suggestions as ConnectionSuggestion[];
};
