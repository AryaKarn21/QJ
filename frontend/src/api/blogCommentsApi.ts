import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://qj.onrender.com';

const authConfig = () => {
  const token = localStorage.getItem('token');
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

export interface BlogCommentAuthor {
  _id: string;
  name: string;
  role?: string;
  profilePic?: string;
}

export interface BlogComment {
  _id: string;
  author: BlogCommentAuthor | null;
  content: string;
  isDeleted: boolean;
  editedAt: string | null;
  createdAt: string;
  likeCount: number;
  isLiked: boolean;
  replies: BlogComment[];
}

export interface BlogCommentsPage {
  success: boolean;
  comments: BlogComment[];
  total: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
}

export const getBlogComments = async (blogId: string, page = 1, limit = 10): Promise<BlogCommentsPage> => {
  const res = await axios.get(`${API_BASE_URL}/api/blogs/${blogId}/comments`, {
    ...authConfig(),
    params: { page, limit },
  });
  return res.data;
};

export const addBlogComment = async (blogId: string, content: string, parentId?: string) => {
  const res = await axios.post(
    `${API_BASE_URL}/api/blogs/${blogId}/comment`,
    { content, parentId },
    authConfig()
  );
  return res.data as { success: boolean; comment: BlogComment };
};

export const updateBlogComment = async (blogId: string, commentId: string, content: string) => {
  const res = await axios.patch(
    `${API_BASE_URL}/api/blogs/${blogId}/comment/${commentId}`,
    { content },
    authConfig()
  );
  return res.data as { success: boolean; comment: BlogComment };
};

export const deleteBlogComment = async (blogId: string, commentId: string) => {
  const res = await axios.delete(`${API_BASE_URL}/api/blogs/${blogId}/comment/${commentId}`, authConfig());
  return res.data as { success: boolean; message: string };
};

export const toggleBlogCommentLike = async (blogId: string, commentId: string) => {
  const res = await axios.post(
    `${API_BASE_URL}/api/blogs/${blogId}/comment/${commentId}/like`,
    {},
    authConfig()
  );
  return res.data as { success: boolean; likeCount: number; isLiked: boolean };
};
