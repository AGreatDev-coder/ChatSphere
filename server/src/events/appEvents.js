const EventEmitter = require('events');

class AppEventEmitter extends EventEmitter {}

const appEvents = new AppEventEmitter();

// Keep a bounded in-memory audit log of recent system events
const eventLog = [];
const MAX_LOG_SIZE = 100;

const logEvent = (type, payload) => {
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    type,
    payload,
    timestamp: new Date().toISOString(),
  };
  eventLog.unshift(entry);
  if (eventLog.length > MAX_LOG_SIZE) {
    eventLog.pop();
  }
  console.log(`[EventEmitter] [${entry.timestamp}] Event '${type}':`, JSON.stringify(payload));
  return entry;
};

// Event Listeners required by specification:
// 1. User Connected
appEvents.on('user.connected', ({ userId, username, socketId }) => {
  logEvent('user.connected', { userId, username, socketId });
});

// 2. User Disconnected
appEvents.on('user.disconnected', ({ userId, username, socketId }) => {
  logEvent('user.disconnected', { userId, username, socketId });
});

// 3. Message Saved
appEvents.on('message.saved', ({ messageId, roomId, senderId, senderUsername, length }) => {
  logEvent('message.saved', { messageId, roomId, senderId, senderUsername, length });
});

// 4. Room Created
appEvents.on('room.created', ({ roomId, roomName, isGroup, creatorId }) => {
  logEvent('room.created', { roomId, roomName, isGroup, creatorId });
});

// 5. Room Deleted (Admin RBAC)
appEvents.on('room.deleted', ({ roomId, roomName, deletedBy }) => {
  logEvent('room.deleted', { roomId, roomName, deletedBy });
});

// 6. User Removed from Room (Admin RBAC)
appEvents.on('user.removed', ({ roomId, userId, removedBy }) => {
  logEvent('user.removed', { roomId, userId, removedBy });
});

module.exports = {
  appEvents,
  getEventLogs: () => [...eventLog],
};
