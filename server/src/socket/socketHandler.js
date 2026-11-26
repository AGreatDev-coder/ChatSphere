const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Room = require('../models/Room');
const Message = require('../models/Message');
const { appEvents } = require('../events/appEvents');

// Map to track active sockets per user: userId -> Set of socketIds
const userSocketsMap = new Map();

const initializeSocket = (io) => {
  // Socket.io Handshake Authentication Middleware with JWT verification
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers?.authorization &&
          socket.handshake.headers.authorization.split(' ')[1]) ||
        socket.handshake.query?.token;

      if (!token) {
        return next(new Error('Authentication failed: Token not provided in handshake.'));
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'chatsphere_super_secret_jwt_key_2026_capstone'
      );

      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return next(new Error('Authentication failed: User no longer exists.'));
      }

      // Attach authenticated user to socket object
      socket.user = user;
      next();
    } catch (error) {
      console.error('[Socket Auth Error]', error.message);
      return next(new Error(`Authentication error: ${error.message}`));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString();
    const username = socket.user.username;

    // Track user socket connections
    if (!userSocketsMap.has(userId)) {
      userSocketsMap.set(userId, new Set());
    }
    userSocketsMap.get(userId).add(socket.id);

    // Join user's personal private room for direct notifications
    socket.join(`user:${userId}`);

    // Update user online status in database
    await User.findByIdAndUpdate(userId, { isOnline: true });

    // Emit server event via Node.js EventEmitter
    appEvents.emit('user.connected', {
      userId,
      username,
      socketId: socket.id,
    });

    // Broadcast online status to all connected clients
    io.emit('user_status', {
      userId,
      username,
      isOnline: true,
      lastSeen: new Date(),
    });

    // 1. Join room event
    socket.on('join_room', async ({ roomId }, callback) => {
      try {
        if (!roomId) return;
        socket.join(roomId);
        console.log(`[Socket] User ${username} joined socket room: ${roomId}`);

        socket.to(roomId).emit('user_joined_room', {
          roomId,
          user: {
            _id: socket.user._id,
            username: socket.user.username,
            avatar: socket.user.avatar,
            role: socket.user.role,
          },
        });
        if (callback) callback({ success: true, roomId });
      } catch (err) {
        console.error('[Socket join_room error]', err);
        if (callback) callback({ success: false, error: err.message });
      }
    });

    // 2. Leave room event
    socket.on('leave_room', ({ roomId }) => {
      try {
        if (!roomId) return;
        socket.leave(roomId);
        console.log(`[Socket] User ${username} left socket room: ${roomId}`);

        socket.to(roomId).emit('user_left_room', {
          roomId,
          userId,
          username,
        });
      } catch (err) {
        console.error('[Socket leave_room error]', err);
      }
    });

    // 3. Typing indicator
    socket.on('typing', ({ roomId }) => {
      if (!roomId) return;
      socket.to(roomId).emit('typing', {
        roomId,
        userId,
        username,
      });
    });

    // 4. Stop typing indicator
    socket.on('stop_typing', ({ roomId }) => {
      if (!roomId) return;
      socket.to(roomId).emit('stop_typing', {
        roomId,
        userId,
        username,
      });
    });

    // 5. Send message event
    socket.on('send_message', async ({ roomId, content }, callback) => {
      try {
        if (!roomId || !content || content.trim() === '') {
          if (callback) callback({ success: false, error: 'Content and roomId are required.' });
          return;
        }

        const room = await Room.findById(roomId);
        if (!room) {
          if (callback) callback({ success: false, error: 'Room not found.' });
          return;
        }

        // Verify membership
        const isMember = room.members.some((m) => m.toString() === userId);
        if (!isMember && socket.user.role !== 'admin') {
          if (callback) callback({ success: false, error: 'Not a member of this room.' });
          return;
        }

        // Persist message in MongoDB
        const message = await Message.create({
          room: roomId,
          sender: socket.user._id,
          content: content.trim(),
          readBy: [socket.user._id],
        });

        // Update room's lastMessage and touch updatedAt
        room.lastMessage = message._id;
        await room.save();

        const populatedMessage = await Message.findById(message._id)
          .populate('sender', 'username email avatar role')
          .populate('readBy', 'username');

        // Emit server event via Node.js EventEmitter
        appEvents.emit('message.saved', {
          messageId: message._id.toString(),
          roomId,
          senderId: userId,
          senderUsername: username,
          length: message.content.length,
        });

        // Broadcast message to everyone in the room
        io.to(roomId).emit('receive_message', populatedMessage);

        // Also notify room members through their user-specific channels for unread counter updates
        room.members.forEach((memberId) => {
          const mIdStr = memberId.toString();
          if (mIdStr !== userId) {
            io.to(`user:${mIdStr}`).emit('room_message_notify', {
              roomId,
              message: populatedMessage,
            });
          }
        });

        if (callback) callback({ success: true, message: populatedMessage });
      } catch (err) {
        console.error('[Socket send_message error]', err);
        if (callback) callback({ success: false, error: err.message });
      }
    });

    // 6. Mark messages as read event
    socket.on('mark_read', async ({ roomId }) => {
      try {
        if (!roomId) return;
        await Message.updateMany(
          { room: roomId, readBy: { $ne: socket.user._id } },
          { $addToSet: { readBy: socket.user._id } }
        );

        // Notify room members that messages were read
        io.to(roomId).emit('messages_read', {
          roomId,
          userId,
        });
      } catch (err) {
        console.error('[Socket mark_read error]', err);
      }
    });

    // 7. Admin actions notifications
    socket.on('admin_delete_room', async ({ roomId }) => {
      if (socket.user.role !== 'admin') return;
      io.emit('room_deleted', { roomId, deletedBy: username });
    });

    socket.on('admin_remove_user', async ({ roomId, targetUserId }) => {
      if (socket.user.role !== 'admin') return;
      io.to(roomId).emit('user_removed_from_room', { roomId, userId: targetUserId, removedBy: username });
      // Notify the removed user directly
      io.to(`user:${targetUserId}`).emit('you_were_removed', { roomId });
    });

    // Disconnect event
    socket.on('disconnect', async () => {
      const userSockets = userSocketsMap.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          userSocketsMap.delete(userId);
          const lastSeen = new Date();
          await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen });

          // Emit server event via Node.js EventEmitter
          appEvents.emit('user.disconnected', {
            userId,
            username,
            socketId: socket.id,
          });

          // Broadcast offline status to all clients
          io.emit('user_status', {
            userId,
            username,
            isOnline: false,
            lastSeen,
          });
        }
      }
      console.log(`[Socket] Disconnected: ${username} (${socket.id})`);
    });
  });
};

module.exports = { initializeSocket, userSocketsMap };
