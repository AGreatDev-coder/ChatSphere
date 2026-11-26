import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import { connectSocket, disconnectSocket } from '../services/socket';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  // Room typing map: { [roomId]: { [userId]: username } }
  const [typingMap, setTypingMap] = useState({});
  const typingTimeoutRef = useRef({});

  useEffect(() => {
    if (!token || !user) {
      disconnectSocket();
      setSocket(null);
      setIsConnected(false);
      return;
    }

    const socketInstance = connectSocket(token);
    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      setIsConnected(true);
      // Mark current user online
      setOnlineUserIds((prev) => new Set([...prev, user._id]));
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    // Real-time online/offline status updates
    socketInstance.on('user_status', ({ userId, isOnline }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (isOnline) {
          next.add(userId);
        } else {
          next.delete(userId);
        }
        return next;
      });
    });

    // Real-time Typing indicator events
    socketInstance.on('typing', ({ roomId, userId: typerId, username }) => {
      if (typerId === user._id) return;
      setTypingMap((prev) => ({
        ...prev,
        [roomId]: {
          ...(prev[roomId] || {}),
          [typerId]: username,
        },
      }));

      // Auto clear after 4 seconds of inactivity
      const key = `${roomId}-${typerId}`;
      if (typingTimeoutRef.current[key]) {
        clearTimeout(typingTimeoutRef.current[key]);
      }
      typingTimeoutRef.current[key] = setTimeout(() => {
        setTypingMap((prev) => {
          const roomTypers = { ...(prev[roomId] || {}) };
          delete roomTypers[typerId];
          return { ...prev, [roomId]: roomTypers };
        });
      }, 4000);
    });

    socketInstance.on('stop_typing', ({ roomId, userId: typerId }) => {
      setTypingMap((prev) => {
        const roomTypers = { ...(prev[roomId] || {}) };
        delete roomTypers[typerId];
        return { ...prev, [roomId]: roomTypers };
      });
    });

    return () => {
      Object.values(typingTimeoutRef.current).forEach(clearTimeout);
      disconnectSocket();
    };
  }, [token, user?._id]);

  const emitTyping = (roomId) => {
    if (socket && isConnected) {
      socket.emit('typing', { roomId });
    }
  };

  const emitStopTyping = (roomId) => {
    if (socket && isConnected) {
      socket.emit('stop_typing', { roomId });
    }
  };

  const isUserOnline = (userId) => {
    return onlineUserIds.has(userId);
  };

  const getTypingUsersInRoom = (roomId) => {
    const typers = typingMap[roomId];
    if (!typers) return [];
    return Object.values(typers);
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        onlineUserIds,
        isUserOnline,
        emitTyping,
        emitStopTyping,
        getTypingUsersInRoom,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
