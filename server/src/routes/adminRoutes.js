const express = require('express');
const router = express.Router();
const {
  deleteRoom,
  removeUserFromRoom,
  getAllUsersAdmin,
  getAllRoomsAdmin,
  updateUserRole,
  deleteUser,
  getAdminStats,
} = require('../controllers/adminController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// All admin routes require authentication and 'admin' role
router.use(protect);
router.use(authorize('admin'));

router.delete('/rooms/:id', deleteRoom);
router.post('/rooms/:roomId/remove-user', removeUserFromRoom);
router.get('/rooms', getAllRoomsAdmin);
router.get('/users', getAllUsersAdmin);
router.put('/users/:userId/role', updateUserRole);
router.delete('/users/:userId', deleteUser);
router.get('/stats', getAdminStats);

module.exports = router;
