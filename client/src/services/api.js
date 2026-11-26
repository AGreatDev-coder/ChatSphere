// Standard Fetch API wrapper with Authorization headers and error handling
const API_BASE = '/api';

const getHeaders = () => {
  const token = localStorage.getItem('chatsphere_token');
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.message || `HTTP Error ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
};

export const api = {
  // Authentication Endpoints
  auth: {
    login: (credentials) =>
      fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      }).then(handleResponse),

    register: (userData) =>
      fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      }).then(handleResponse),

    getMe: () =>
      fetch(`${API_BASE}/auth/me`, {
        method: 'GET',
        headers: getHeaders(),
      }).then(handleResponse),
  },

  // Rooms Endpoints
  rooms: {
    getMyRooms: () =>
      fetch(`${API_BASE}/rooms/my`, {
        method: 'GET',
        headers: getHeaders(),
      }).then(handleResponse),

    getAvailableRooms: () =>
      fetch(`${API_BASE}/rooms/available`, {
        method: 'GET',
        headers: getHeaders(),
      }).then(handleResponse),

    createGroup: (data) =>
      fetch(`${API_BASE}/rooms/group`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }).then(handleResponse),

    createDirect: (recipientId) =>
      fetch(`${API_BASE}/rooms/direct`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ recipientId }),
      }).then(handleResponse),

    join: (roomId) =>
      fetch(`${API_BASE}/rooms/${roomId}/join`, {
        method: 'POST',
        headers: getHeaders(),
      }).then(handleResponse),

    leave: (roomId) =>
      fetch(`${API_BASE}/rooms/${roomId}/leave`, {
        method: 'POST',
        headers: getHeaders(),
      }).then(handleResponse),

    getById: (roomId) =>
      fetch(`${API_BASE}/rooms/${roomId}`, {
        method: 'GET',
        headers: getHeaders(),
      }).then(handleResponse),
  },

  // Messages Endpoints
  messages: {
    getRoomMessages: (roomId) =>
      fetch(`${API_BASE}/rooms/${roomId}/messages`, {
        method: 'GET',
        headers: getHeaders(),
      }).then(handleResponse),

    sendMessage: (roomId, content) =>
      fetch(`${API_BASE}/rooms/${roomId}/messages`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ content }),
      }).then(handleResponse),

    markAsRead: (roomId) =>
      fetch(`${API_BASE}/rooms/${roomId}/read`, {
        method: 'PUT',
        headers: getHeaders(),
      }).then(handleResponse),

    // MongoDB Aggregation endpoint
    getUnreadCounts: () =>
      fetch(`${API_BASE}/messages/unread`, {
        method: 'GET',
        headers: getHeaders(),
      }).then(handleResponse),
  },

  // Users Directory Endpoints
  users: {
    getAllUsers: () =>
      fetch(`${API_BASE}/users`, {
        method: 'GET',
        headers: getHeaders(),
      }).then(handleResponse),

    getUserById: (id) =>
      fetch(`${API_BASE}/users/${id}`, {
        method: 'GET',
        headers: getHeaders(),
      }).then(handleResponse),
  },

  // Admin Management Endpoints (RBAC)
  admin: {
    getStats: () =>
      fetch(`${API_BASE}/admin/stats`, {
        method: 'GET',
        headers: getHeaders(),
      }).then(handleResponse),

    getAllRooms: () =>
      fetch(`${API_BASE}/admin/rooms`, {
        method: 'GET',
        headers: getHeaders(),
      }).then(handleResponse),

    getAllUsers: () =>
      fetch(`${API_BASE}/admin/users`, {
        method: 'GET',
        headers: getHeaders(),
      }).then(handleResponse),

    deleteRoom: (roomId) =>
      fetch(`${API_BASE}/admin/rooms/${roomId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      }).then(handleResponse),

    removeUserFromRoom: (roomId, userId) =>
      fetch(`${API_BASE}/admin/rooms/${roomId}/remove-user`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ userId }),
      }).then(handleResponse),

    updateUserRole: (userId, role) =>
      fetch(`${API_BASE}/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ role }),
      }).then(handleResponse),

    deleteUser: (userId) =>
      fetch(`${API_BASE}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      }).then(handleResponse),
  },
};
