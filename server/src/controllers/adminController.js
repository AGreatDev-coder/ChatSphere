const mongoose = require('mongoose');
const User = require('../models/User');
const Room = require('../models/Room');
const Message = require('../models/Message');
const { appEvents, getEventLogs } = require('../events/appEvents');

// @desc    Admin deletes any room and its associated messages
// @route   DELETE /api/admin/rooms/:id
// @access  Private (Admin only)
const deleteRoom = async (req, res, next) => {
  try {
    const roomId = req.params.id;

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

    const roomName = room.name;

    // Delete all messages in the room
    const messageDeleteResult = await Message.deleteMany({ room: roomId });

    // Delete the room
    await Room.findByIdAndDelete(roomId);

    // Emit event via Node.js EventEmitter
    appEvents.emit('room.deleted', {
      roomId: roomId.toString(),
      roomName,
      deletedBy: req.user.username,
    });

    res.status(200).json({
      success: true,
      message: `Room "${roomName}" and its ${messageDeleteResult.deletedCount} messages deleted successfully by Admin.`,
      roomId,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin removes a user from a room
// @route   POST /api/admin/rooms/:roomId/remove-user
// @access  Private (Admin only)
const removeUserFromRoom = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(roomId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid roomId and userId are required.',
      });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found.',
      });
    }

    const userToRemove = await User.findById(userId);
    if (!userToRemove) {
      return res.status(404).json({
        success: false,
        message: 'User to remove not found.',
      });
    }

    const initialLength = room.members.length;
    room.members = room.members.filter(
      (m) => m.toString() !== userId.toString()
    );

    if (room.members.length === initialLength) {
      return res.status(400).json({
        success: false,
        message: 'User is not a member of this room.',
      });
    }

    await room.save();

    // Emit event via Node.js EventEmitter
    appEvents.emit('user.removed', {
      roomId: roomId.toString(),
      userId: userId.toString(),
      removedBy: req.user.username,
    });

    const updatedRoom = await Room.findById(roomId)
      .populate('members', 'username email avatar role isOnline lastSeen')
      .populate('creator', 'username email avatar role');

    res.status(200).json({
      success: true,
      message: `User ${userToRemove.username} removed from room "${room.name}" by Admin.`,
      room: updatedRoom,
      removedUserId: userId,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin lists all users with their stats
// @route   GET /api/admin/users
// @access  Private (Admin only)
const getAllUsersAdmin = async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin lists all rooms with detailed info
// @route   GET /api/admin/rooms
// @access  Private (Admin only)
const getAllRoomsAdmin = async (req, res, next) => {
  try {
    const rooms = await Room.find()
      .populate('creator', 'username email')
      .populate('members', 'username email role isOnline')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: rooms.length,
      rooms,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin updates user role (user <-> admin)
// @route   PUT /api/admin/users/:userId/role
// @access  Private (Admin only)
const updateUserRole = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be either "user" or "admin".',
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: `User role updated to ${role}.`,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin deletes a user
// @route   DELETE /api/admin/users/:userId
// @access  Private (Admin only)
const deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (userId.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Admins cannot delete their own account.',
      });
    }

    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Remove user from all room memberships
    await Room.updateMany(
      { members: userId },
      { $pull: { members: userId } }
    );

    res.status(200).json({
      success: true,
      message: `User ${user.username} deleted successfully.`,
      userId,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin dashboard overview & system event logs
// @route   GET /api/admin/stats
// @access  Private (Admin only)
const getAdminStats = async (req, res, next) => {
  try {
    const [totalUsers, totalRooms, totalMessages, onlineUsers] = await Promise.all([
      User.countDocuments(),
      Room.countDocuments(),
      Message.countDocuments(),
      User.countDocuments({ isOnline: true }),
    ]);

    const recentEvents = getEventLogs();

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalRooms,
        totalMessages,
        onlineUsers,
      },
      recentEvents,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  deleteRoom,
  removeUserFromRoom,
  getAllUsersAdmin,
  getAllRoomsAdmin,
  updateUserRole,
  deleteUser,
  getAdminStats,
};
