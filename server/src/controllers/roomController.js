const mongoose = require('mongoose');
const Room = require('../models/Room');
const Message = require('../models/Message');
const User = require('../models/User');
const { appEvents } = require('../events/appEvents');

// @desc    Create a new group room
// @route   POST /api/rooms/group
// @access  Private
const createGroupRoom = async (req, res, next) => {
  try {
    const { name, description, memberIds } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Group room name is required.',
      });
    }

    const members = [req.user._id];
    if (Array.isArray(memberIds)) {
      memberIds.forEach((id) => {
        if (mongoose.Types.ObjectId.isValid(id) && !members.some((m) => m.toString() === id.toString())) {
          members.push(id);
        }
      });
    }

    const room = await Room.create({
      name: name.trim(),
      description: description ? description.trim() : '',
      isGroup: true,
      creator: req.user._id,
      members,
    });

    const populatedRoom = await Room.findById(room._id)
      .populate('members', 'username email avatar role isOnline lastSeen')
      .populate('creator', 'username email avatar role');

    // Emit server event via Node.js EventEmitter
    appEvents.emit('room.created', {
      roomId: room._id.toString(),
      roomName: room.name,
      isGroup: true,
      creatorId: req.user._id.toString(),
    });

    res.status(201).json({
      success: true,
      room: populatedRoom,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get or create a 1-to-1 direct chat room
// @route   POST /api/rooms/direct
// @access  Private
const getOrCreateDirectRoom = async (req, res, next) => {
  try {
    const { recipientId } = req.body;

    if (!recipientId || !mongoose.Types.ObjectId.isValid(recipientId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid recipient ID is required.',
      });
    }

    if (recipientId.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create a direct chat room with yourself.',
      });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient user not found.',
      });
    }

    // Look for existing direct room containing both users
    let room = await Room.findOne({
      isGroup: false,
      members: { $all: [req.user._id, recipientId], $size: 2 },
    })
      .populate('members', 'username email avatar role isOnline lastSeen')
      .populate('lastMessage');

    if (!room) {
      room = await Room.create({
        name: `${req.user.username} & ${recipient.username}`,
        isGroup: false,
        creator: req.user._id,
        members: [req.user._id, recipientId],
      });

      room = await Room.findById(room._id)
        .populate('members', 'username email avatar role isOnline lastSeen')
        .populate('creator', 'username email avatar role');

      appEvents.emit('room.created', {
        roomId: room._id.toString(),
        roomName: room.name,
        isGroup: false,
        creatorId: req.user._id.toString(),
      });
    }

    res.status(200).json({
      success: true,
      room,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all rooms joined by current user with unread counts using aggregation
// @route   GET /api/rooms/my
// @access  Private
const getUserRooms = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Find rooms where user is a member
    const rooms = await Room.find({ members: userId })
      .populate('members', 'username email avatar role isOnline lastSeen')
      .populate('creator', 'username email avatar role')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'username avatar' },
      })
      .sort({ updatedAt: -1 });

    const roomIds = rooms.map((r) => r._id);

    // Unread message count per room using MongoDB Aggregation
    const unreadAgg = await Message.aggregate([
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
    ]);

    const unreadMap = {};
    unreadAgg.forEach((item) => {
      unreadMap[item._id.toString()] = item.unreadCount;
    });

    const roomsWithUnread = rooms.map((room) => {
      const roomObj = room.toObject();
      roomObj.unreadCount = unreadMap[room._id.toString()] || 0;
      return roomObj;
    });

    res.status(200).json({
      success: true,
      count: roomsWithUnread.length,
      rooms: roomsWithUnread,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all available public group rooms not yet joined by user
// @route   GET /api/rooms/available
// @access  Private
const getAvailableRooms = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const rooms = await Room.find({
      isGroup: true,
      members: { $ne: userId },
    })
      .populate('creator', 'username email avatar role')
      .populate('members', 'username avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      rooms,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Join a group room
// @route   POST /api/rooms/:id/join
// @access  Private
const joinRoom = async (req, res, next) => {
  try {
    const roomId = req.params.id;
    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found.',
      });
    }

    if (!room.isGroup) {
      return res.status(400).json({
        success: false,
        message: 'Direct 1-to-1 rooms cannot be joined publicly.',
      });
    }

    if (room.members.some((m) => m.toString() === req.user._id.toString())) {
      return res.status(400).json({
        success: false,
        message: 'You are already a member of this room.',
      });
    }

    room.members.push(req.user._id);
    await room.save();

    const populated = await Room.findById(room._id)
      .populate('members', 'username email avatar role isOnline lastSeen')
      .populate('creator', 'username email avatar role');

    res.status(200).json({
      success: true,
      message: 'Joined room successfully.',
      room: populated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Leave a group room
// @route   POST /api/rooms/:id/leave
// @access  Private
const leaveRoom = async (req, res, next) => {
  try {
    const roomId = req.params.id;
    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found.',
      });
    }

    if (!room.isGroup) {
      return res.status(400).json({
        success: false,
        message: 'Cannot leave a direct 1-to-1 conversation.',
      });
    }

    room.members = room.members.filter(
      (m) => m.toString() !== req.user._id.toString()
    );
    await room.save();

    res.status(200).json({
      success: true,
      message: 'Left room successfully.',
      roomId: room._id,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get room details by ID
// @route   GET /api/rooms/:id
// @access  Private
const getRoomById = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate('members', 'username email avatar role isOnline lastSeen')
      .populate('creator', 'username email avatar role');

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found.',
      });
    }

    res.status(200).json({
      success: true,
      room,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createGroupRoom,
  getOrCreateDirectRoom,
  getUserRooms,
  getAvailableRooms,
  joinRoom,
  leaveRoom,
  getRoomById,
};
