import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://qj.onrender.com';

// Public footer newsletter signup — no auth required.
export const subscribeToNewsletter = async (email: string): Promise<{ message: string }> => {
  const res = await axios.post(`${API_BASE_URL}/api/newsletter/subscribe`, { email });
  return res.data;
};
