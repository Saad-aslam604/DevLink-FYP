import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

// Attach Authorization header from localStorage token for all requests
api.interceptors.request.use((config: any) => {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('devlink_token') : null;
    if (token) {
      config.headers = config.headers || {};
      // Don't overwrite if header explicitly provided
      if (!config.headers.Authorization && !config.headers.authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch (e) {
    // ignore localStorage errors
  }
  return config;
}, (error) => Promise.reject(error));

// Log 401 responses for easier debugging
api.interceptors.response.use((res) => res, (err) => {
  try {
    if (err && err.response && err.response.status === 401) {
      console.warn('[api] 401 Unauthorized for', err.config && err.config.url, err.response && err.response.data);
    }
  } catch (e) {}
  return Promise.reject(err);
});

export default api;

export async function likePost(postId: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('devlink_token') : null;
  const headers: Record<string,string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await api.post(`/posts/${postId}/like`, {}, { headers });
  return res.data;
}

export async function getComments(postId: string) {
  const res = await api.get(`/posts/${postId}/comments`);
  return res.data;
}

export async function addComment(postId: string, content: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('devlink_token') : null;
  const headers: Record<string,string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await api.post(`/posts/${postId}/comments`, { content }, { headers });
  return res.data;
}

export async function createPost(formData: FormData) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('devlink_token') : null;
  const headers: Record<string,string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  // let axios set multipart boundary automatically; do not set Content-Type
  const res = await api.post(`/posts`, formData, { headers });
  return res.data;
}
