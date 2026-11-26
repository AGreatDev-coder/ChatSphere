import { io } from 'socket.io-client';

let socket = null;

// Initialize socket connection verifying JWT during handshake
export const connectSocket = (token) => {
  if (socket) {
    socket.disconnect();
  }

  socket = io('/', {
    auth: {
      token,
    },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('[Socket.io] Connected successfully. Socket ID:', socket.id);
  });

  socket.on('connect_error', (err) => {
    console.error('[Socket.io] Connection error (JWT Handshake):', err.message);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
