// ============================================================
// NovaChat - Axios API Service
// Central HTTP client with interceptors
// ============================================================
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ============================================================
// Request Interceptor - attach access token
// ============================================================
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================================
// Response Interceptor - handle token refresh
// ============================================================
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post(`${API_URL}/auth/refresh-token`, {}, { withCredentials: true });
        const { accessToken } = response.data;
        localStorage.setItem("accessToken", accessToken);
        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        processQueue(null, accessToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem("accessToken");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ============================================================
// API Service Methods
// ============================================================

// Auth
export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  verifyEmail: (data) => api.post("/auth/verify-email", data),
  resendOTP: (data) => api.post("/auth/resend-otp", data),
  login: (data) => api.post("/auth/login", data),
  logout: () => api.post("/auth/logout"),
  refreshToken: () => api.post("/auth/refresh-token"),
  forgotPassword: (data) => api.post("/auth/forgot-password", data),
  resetPassword: (data) => api.post("/auth/reset-password", data),
  me: () => api.get("/auth/me"),
  sendPhoneOTP: (data) => api.post("/auth/send-phone-otp", data),
  verifyPhone: (data) => api.post("/auth/verify-phone", data),
};

// Users
export const userAPI = {
  search: (q, params) => api.get("/users/search", { params: { q, ...params } }),
  getProfile: (identifier) => api.get(`/users/${identifier}`),
  updateProfile: (data) => api.put("/users/profile", data),
  uploadAvatar: (formData) => api.post("/users/avatar", formData, { headers: { "Content-Type": "multipart/form-data" } }),
  uploadCover: (formData) => api.post("/users/cover", formData, { headers: { "Content-Type": "multipart/form-data" } }),
  updatePrivacy: (data) => api.put("/users/privacy", data),
  updateNotifications: (data) => api.put("/users/notifications", data),
  updateSettings: (data) => api.put("/users/settings", data),
  changePassword: (data) => api.put("/users/change-password", data),
  blockUser: (userId) => api.post(`/users/block/${userId}`),
  unblockUser: (userId) => api.delete(`/users/block/${userId}`),
  addContact: (userId) => api.post(`/users/contacts/${userId}`),
  removeContact: (userId) => api.delete(`/users/contacts/${userId}`),
  getContacts: () => api.get("/users/contacts"),
};

// Conversations
export const conversationAPI = {
  getAll: () => api.get("/conversations"),
  getOrCreate: (targetUserId) => api.get(`/conversations/${targetUserId}`),
  archive: (id) => api.patch(`/conversations/${id}/archive`),
  mute: (id, data) => api.patch(`/conversations/${id}/mute`, data),
  delete: (id) => api.delete(`/conversations/${id}`),
};

// Messages
export const messageAPI = {
  getPrivate: (conversationId, params) => api.get(`/messages/private/${conversationId}`, { params }),
  sendPrivate: (conversationId, data) => api.post(`/messages/private/${conversationId}`, data),
  sendGroup: (groupId, data) => api.post(`/messages/group/${groupId}`, data),
  sendMedia: (conversationId, formData) =>
    api.post(`/messages/private/${conversationId}`, formData, { headers: { "Content-Type": "multipart/form-data" } }),
  edit: (messageId, data) => api.patch(`/messages/${messageId}/edit`, data),
  delete: (messageId, data) => api.delete(`/messages/${messageId}`, { data }),
  react: (messageId, data) => api.post(`/messages/${messageId}/react`, data),
  pin: (messageId) => api.patch(`/messages/${messageId}/pin`),
  star: (messageId) => api.patch(`/messages/${messageId}/star`),
  forward: (messageId, data) => api.post(`/messages/${messageId}/forward`, data),
  search: (params) => api.get("/messages/search", { params }),
};

// Groups
export const groupAPI = {
  create: (formData) => api.post("/groups", formData, { headers: { "Content-Type": "multipart/form-data" } }),
  getAll: () => api.get("/groups"),
  getById: (id) => api.get(`/groups/${id}`),
  getMessages: (id, params) => api.get(`/groups/${id}/messages`, { params }),
  update: (id, data) => api.put(`/groups/${id}`, data),
  addMembers: (id, data) => api.post(`/groups/${id}/members`, data),
  leave: (id) => api.post(`/groups/${id}/leave`),
};

// Channels
export const channelAPI = {
  create: (formData) => api.post("/channels", formData, { headers: { "Content-Type": "multipart/form-data" } }),
  getAll: () => api.get("/channels"),
  getById: (id) => api.get(`/channels/${id}`),
  subscribe: (id) => api.post(`/channels/${id}/subscribe`),
  unsubscribe: (id) => api.delete(`/channels/${id}/unsubscribe`),
};

// Stories
export const storyAPI = {
  getFeed: () => api.get("/stories/feed"),
  getMine: () => api.get("/stories/mine"),
  create: (formData) => api.post("/stories", formData, { headers: { "Content-Type": "multipart/form-data" } }),
  view: (id) => api.post(`/stories/${id}/view`),
  react: (id, data) => api.post(`/stories/${id}/react`, data),
  reply: (id, data) => api.post(`/stories/${id}/reply`, data),
  delete: (id) => api.delete(`/stories/${id}`),
};

// Calls
export const callAPI = {
  getHistory: (params) => api.get("/calls", { params }),
  getById: (id) => api.get(`/calls/${id}`),
};

// Notifications
export const notificationAPI = {
  getAll: (params) => api.get("/notifications", { params }),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch("/notifications/read-all"),
  delete: (id) => api.delete(`/notifications/${id}`),
};

// AI
export const aiAPI = {
  chat: (data) => api.post("/ai/chat", data),
  translate: (data) => api.post("/ai/translate", data),
  summarize: (data) => api.post("/ai/summarize", data),
  suggestReply: (data) => api.post("/ai/suggest-reply", data),
};

// Admin
export const adminAPI = {
  getDashboard: () => api.get("/admin/dashboard"),
  getUsers: (params) => api.get("/admin/users", { params }),
  banUser: (id, data) => api.patch(`/admin/users/${id}/ban`, data),
  verifyUser: (id, data) => api.patch(`/admin/users/${id}/verify`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getReports: (params) => api.get("/admin/reports", { params }),
  resolveReport: (id, data) => api.patch(`/admin/reports/${id}`, data),
  broadcast: (data) => api.post("/admin/broadcast", data),
};

// Upload
export const uploadAPI = {
  media: (formData) => api.post("/upload/media", formData, { headers: { "Content-Type": "multipart/form-data" } }),
  report: (data) => api.post("/upload/report", data),
};

export default api;
