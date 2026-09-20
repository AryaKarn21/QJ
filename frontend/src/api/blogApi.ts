import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://qj.onrender.com';

export const uploadBlogImage = async (file: File): Promise<{ url: string }> => {
  const token = localStorage.getItem('token');
  const fd = new FormData();
  fd.append('image', file);

  const res = await axios.post(`${API_BASE_URL}/api/blogs/upload-image`, fd, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  return res.data;
};
