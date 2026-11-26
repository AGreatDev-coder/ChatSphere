const mongoose = require('mongoose');
const Message = require('../models/Message');
const Room = require('../models/Room');
const { appEvents } = require('../events/appEvents');

// @desc    Get message history for a room
// @route   GET /api/rooms/:roomId/messages
// @access  Private
const getRoomMessages = async (req, res, next) => {
  try {
    const { roomId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid room ID.',
      });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found.',
      });
    }

    // Check if user is a member of the room
    const isMember = room.members.some(
      (m) => m.toString() === req.user._id.toString()
    );
    if (!isMember && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this room.',
      });
    }

    // Load messages sorted by creation time
    const messages = await Message.find({ room: roomId })
      .populate('sender', 'username email avatar role')
      .populate('readBy', 'username')
      .sort({ createdAt: 1 });

    // Mark messages as read by current user
    await Message.updateMany(
      { room: roomId, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );

    res.status(200).json({
      success: true,
      count: messages.length,
      messages,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send a message via HTTP endpoint (fallback / complement to socket)
// @route   POST /api/rooms/:roomId/messages
// @access  Private
const sendMessage = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { content } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Message content cannot be empty.',
      });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found.',
      });
    }

    const isMember = room.members.some(
      (m) => m.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You must be a member to send messages to this room.',
      });
    }

    const message = await Message.create({
      room: roomId,
      sender: req.user._id,
      content: content.trim(),
      readBy: [req.user._id],
    });

    room.lastMessage = message._id;
    await room.save();

    const populated = await Message.findById(message._id)
      .populate('sender', 'username email avatar role')
      .populate('readBy', 'username');

    // Emit server event via Node.js EventEmitter
    appEvents.emit('message.saved', {
      messageId: message._id.toString(),
      roomId: roomId.toString(),
      senderId: req.user._id.toString(),
      senderUsername: req.user.username,
      length: message.content.length,
    });

    res.status(201).json({
      success: true,
      message: populated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all messages in a room as read
// @route   PUT /api/rooms/:roomId/read
// @access  Private
const markMessagesAsRead = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;

    await Message.updateMany(
      { room: roomId, readBy: { $ne: userId } },
      { $addToSet: { readBy: userId } }
    );

    res.status(200).json({
      success: true,
      message: 'Messages marked as read.',
      roomId,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get unread counts for all rooms user belongs to using MongoDB Aggregation
// @route   GET /api/messages/unread
// @access  Private
const getUnreadCounts = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Find all rooms user is a member of
    const userRooms = await Room.find({ members: userId }).select('_id');
    const roomIds = userRooms.map((r) => r._id);

    // MongoDB Aggregation Pipeline:
    // 1. Match messages in user's rooms where sender != current user and readBy != current user
    // 2. Group by room ID and count total unread messages
    const aggregationResult = await Message.aggregate([
      {
        $match: {
          room: { $in: roomIds },
          sender: { $ne: userId },
          readBy: { $ne: userId },
        },
      },
      {
        $group: {
          _id: '$room',
          unreadCount: { $sum: 1 },
        },
      },
      {
        $project: {
          roomId: '$_id',
          unreadCount: 1,
          _id: 0,
        },
      },
    ]);

    const unreadMap = {};
    aggregationResult.forEach((item) => {
      unreadMap[item.roomId] = item.unreadCount;
    });

    res.status(200).json({
      success: true,
      unreadCounts: unreadMap,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRoomMessages,
  sendMessage,
  markMessagesAsRead,
  getUnreadCounts,
};
