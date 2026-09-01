import axios from 'axios';
import type { CommunityNotification } from '../types/community';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

export const fetchMyNotifications = async (page = 1) => {
  const res = await axios.get(`${API_BASE_URL}/api/notification/me`, { ...getAuthHeader(), params: { page } });
  return res.data as { notifications: CommunityNotification[]; unreadCount: number; hasMore: boolean };
};

export const markNotificationRead = async (id: string) => {
  const res = await axios.patch(`${API_BASE_URL}/api/notification/${id}/read`, {}, getAuthHeader());
  return res.data;
};

export const markAllNotificationsRead = async () => {
  const res = await axios.patch(`${API_BASE_URL}/api/notification/read-all`, {}, getAuthHeader());
  return res.data;
};

export const deleteNotification = async (id: string) => {
  const res = await axios.delete(`${API_BASE_URL}/api/notification/${id}`, getAuthHeader());
  return res.data;
};
