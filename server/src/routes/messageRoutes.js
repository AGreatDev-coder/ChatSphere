const express = require('express');
const router = express.Router();
const { getUnreadCounts } = require('../controllers/messageController');
const { protect } = require('../middleware/auth');

router.use(protect);

// GET /api/messages/unread - unread message count per room using aggregation
router.get('/unread', getUnreadCounts);

module.exports = router;
