const express = require('express');
const router = express.Router();
const {
  createGroupRoom,
  getOrCreateDirectRoom,
  getUserRooms,
  getAvailableRooms,
  joinRoom,
  leaveRoom,
  getRoomById,
} = require('../controllers/roomController');
const {
  getRoomMessages,
  sendMessage,
  markMessagesAsRead,
} = require('../controllers/messageController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/group', createGroupRoom);
router.post('/direct', getOrCreateDirectRoom);
router.get('/my', getUserRooms);
router.get('/available', getAvailableRooms);
router.get('/:id', getRoomById);
router.post('/:id/join', joinRoom);
router.post('/:id/leave', leaveRoom);

// Message nested routes under room
router.get('/:roomId/messages', getRoomMessages);
router.post('/:roomId/messages', sendMessage);
router.put('/:roomId/read', markMessagesAsRead);

module.exports = router;
