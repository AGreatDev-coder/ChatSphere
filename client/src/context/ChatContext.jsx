import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();

  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Fetch all user rooms and unread counts using MongoDB Aggregation
  const fetchRooms = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingRooms(true);
      const res = await api.rooms.getMyRooms();
      if (res.success) {
        setRooms(res.rooms);
        // Build initial unread map
        const unreads = {};
        res.rooms.forEach((r) => {
          unreads[r._id] = r.unreadCount || 0;
        });
        setUnreadCounts(unreads);
      }
    } catch (err) {
      console.error('Failed to load user rooms:', err);
    } finally {
      setLoadingRooms(false);
    }
  }, [user]);

  // Fetch unread aggregation explicitly
  const refreshUnreadCounts = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.messages.getUnreadCounts();
      if (res.success) {
        setUnreadCounts(res.unreadCounts || {});
      }
    } catch (err) {
      console.error('Failed to refresh unread aggregation:', err);
    }
  }, [user]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Open / Select a room and load message history saved in MongoDB
  const selectRoom = async (room) => {
    if (!room) {
      setActiveRoom(null);
      setMessages([]);
      return;
    }

    // Leave previous room socket if any
    if (activeRoom && socket) {
      socket.emit('leave_room', { roomId: activeRoom._id });
    }

    setActiveRoom(room);
    setLoadingMessages(true);

    try {
      // 1. Fetch message history saved in MongoDB
      const res = await api.messages.getRoomMessages(room._id);
      if (res.success) {
        setMessages(res.messages);
      }

      // 2. Mark messages as read and clear unread count for this room
      setUnreadCounts((prev) => ({ ...prev, [room._id]: 0 }));
      setRooms((prev) =>
        prev.map((r) => (r._id === room._id ? { ...r, unreadCount: 0 } : r))
      );

      // 3. Emit socket join_room & mark_read
      if (socket && isConnected) {
        socket.emit('join_room', { roomId: room._id });
        socket.emit('mark_read', { roomId: room._id });
      }
    } catch (err) {
      console.error('Failed to load room messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Send message instantly via socket
  const sendMessage = async (content) => {
    if (!activeRoom || !content.trim()) return;

    if (socket && isConnected) {
      socket.emit(
        'send_message',
        { roomId: activeRoom._id, content: content.trim() },
        (response) => {
          if (!response?.success) {
            console.error('Socket message error:', response?.error);
          }
        }
      );
    } else {
      // HTTP fallback
      try {
        const res = await api.messages.sendMessage(activeRoom._id, content.trim());
        if (res.success) {
          setMessages((prev) => [...prev, res.message]);
        }
      } catch (err) {
        console.error('Failed to send message via HTTP fallback:', err);
      }
    }
  };

  // Socket event listeners for real-time messages & room updates
  useEffect(() => {
    if (!socket) return;

    // Incoming real-time message in current or other room
    const handleReceiveMessage = (newMessage) => {
      if (activeRoom && activeRoom._id === newMessage.room) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === newMessage._id)) return prev;
          return [...prev, newMessage];
        });
        // Auto mark read if we are looking at this room
        socket.emit('mark_read', { roomId: activeRoom._id });
      }

      // Update lastMessage on rooms list
      setRooms((prev) =>
        prev.map((r) => {
          if (r._id === newMessage.room) {
            const isCurrent = activeRoom && activeRoom._id === newMessage.room;
            return {
              ...r,
              lastMessage: newMessage,
              unreadCount: isCurrent ? 0 : (r.unreadCount || 0) + 1,
            };
          }
          return r;
        })
      );
    };

    // User background notification for unread counter
    const handleRoomMessageNotify = ({ roomId, message }) => {
      if (!activeRoom || activeRoom._id !== roomId) {
        setUnreadCounts((prev) => ({
          ...prev,
          [roomId]: (prev[roomId] || 0) + 1,
        }));
        setRooms((prev) =>
          prev.map((r) =>
            r._id === roomId
              ? { ...r, lastMessage: message, unreadCount: (r.unreadCount || 0) + 1 }
              : r
          )
        );
      }
    };

    // Messages read update
    const handleMessagesRead = ({ roomId, userId }) => {
      if (activeRoom && activeRoom._id === roomId) {
        setMessages((prev) =>
          prev.map((m) => {
            const isAlreadyRead = m.readBy?.some(
              (u) => (typeof u === 'string' ? u : u._id) === userId
            );
            if (!isAlreadyRead) {
              return { ...m, readBy: [...(m.readBy || []), { _id: userId }] };
            }
            return m;
          })
        );
      }
    };

    // Admin deleted a room
    const handleRoomDeleted = ({ roomId }) => {
      setRooms((prev) => prev.filter((r) => r._id !== roomId));
      if (activeRoom && activeRoom._id === roomId) {
        setActiveRoom(null);
        setMessages([]);
      }
    };

    // Admin removed user from room
    const handleUserRemoved = ({ roomId, userId: removedId }) => {
      if (user && user._id === removedId) {
        setRooms((prev) => prev.filter((r) => r._id !== roomId));
        if (activeRoom && activeRoom._id === roomId) {
          setActiveRoom(null);
          setMessages([]);
        }
      } else {
        // Update member list in activeRoom if open
        if (activeRoom && activeRoom._id === roomId) {
          setActiveRoom((prev) => ({
            ...prev,
            members: prev.members.filter(
              (m) => (typeof m === 'string' ? m : m._id) !== removedId
            ),
          }));
        }
      }
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('room_message_notify', handleRoomMessageNotify);
    socket.on('messages_read', handleMessagesRead);
    socket.on('room_deleted', handleRoomDeleted);
    socket.on('user_removed_from_room', handleUserRemoved);
    socket.on('you_were_removed', handleRoomDeleted);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('room_message_notify', handleRoomMessageNotify);
      socket.off('messages_read', handleMessagesRead);
      socket.off('room_deleted', handleRoomDeleted);
      socket.off('user_removed_from_room', handleUserRemoved);
      socket.off('you_were_removed', handleRoomDeleted);
    };
  }, [socket, activeRoom, user]);

  // Create Group Room
  const createGroupRoom = async (roomData) => {
    const res = await api.rooms.createGroup(roomData);
    if (res.success) {
      setRooms((prev) => [res.room, ...prev]);
      selectRoom(res.room);
      return res.room;
    }
  };

  // Start or open 1-to-1 Direct Chat
  const startDirectChat = async (recipientId) => {
    const res = await api.rooms.createDirect(recipientId);
    if (res.success) {
      setRooms((prev) => {
        const exists = prev.find((r) => r._id === res.room._id);
        if (!exists) return [res.room, ...prev];
        return prev;
      });
      selectRoom(res.room);
      return res.room;
    }
  };

  // Join public group room
  const joinGroupRoom = async (roomId) => {
    const res = await api.rooms.join(roomId);
    if (res.success) {
      setRooms((prev) => [res.room, ...prev]);
      selectRoom(res.room);
      return res.room;
    }
  };

  // Leave group room
  const leaveGroupRoom = async (roomId) => {
    const res = await api.rooms.leave(roomId);
    if (res.success) {
      setRooms((prev) => prev.filter((r) => r._id !== roomId));
      if (activeRoom && activeRoom._id === roomId) {
        setActiveRoom(null);
        setMessages([]);
      }
    }
  };

  // Admin delete room
  const adminDeleteRoom = async (roomId) => {
    const res = await api.admin.deleteRoom(roomId);
    if (res.success) {
      if (socket) {
        socket.emit('admin_delete_room', { roomId });
      }
      setRooms((prev) => prev.filter((r) => r._id !== roomId));
      if (activeRoom && activeRoom._id === roomId) {
        setActiveRoom(null);
        setMessages([]);
      }
      return res;
    }
  };

  // Admin remove user from room
  const adminRemoveUser = async (roomId, targetUserId) => {
    const res = await api.admin.removeUserFromRoom(roomId, targetUserId);
    if (res.success) {
      if (socket) {
        socket.emit('admin_remove_user', { roomId, targetUserId });
      }
      if (activeRoom && activeRoom._id === roomId) {
        setActiveRoom((prev) => ({
          ...prev,
          members: prev.members.filter(
            (m) => (typeof m === 'string' ? m : m._id) !== targetUserId
          ),
        }));
      }
      return res;
    }
  };

  return (
    <ChatContext.Provider
      value={{
        rooms,
        activeRoom,
        messages,
        unreadCounts,
        loadingRooms,
        loadingMessages,
        selectRoom,
        sendMessage,
        fetchRooms,
        refreshUnreadCounts,
        createGroupRoom,
        startDirectChat,
        joinGroupRoom,
        leaveGroupRoom,
        adminDeleteRoom,
        adminRemoveUser,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
