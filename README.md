# ChatSphere – Real-Time Chat Application

> **MERN Capstone Project: Real-Time Chat Application with Private & Group Rooms**
> Messages delivered instantly via WebSockets and persisted to MongoDB for future retrieval.

---

## 🚀 Features

- **JWT Handshake Authentication**: Secure user registration and login with bcrypt password hashing. JSON Web Tokens (JWT) are verified directly during the Socket.io connection handshake (`socket.handshake.auth.token`). Connections without valid credentials are automatically rejected.
- **1-to-1 & Group Rooms**: Create, join, and leave group chat rooms with custom topics, or launch private one-on-one direct messages with team members.
- **Online/Offline Presence & Typing Indicator**: Real-time status indicators (green active dots) and live typing indicators with debounced broadcasts (`user is typing...`).
- **Persistent Message History in MongoDB**: All messages are validated and saved to MongoDB with indexed query sorting and loaded instantly when entering any room.
- **Unread Message Count per Room via MongoDB Aggregation**: High-performance aggregation pipeline computes unread counts per room dynamically per user (`$match` unread messages, `$group` by room ID).
- **Node.js EventEmitter for Server Events**: Decoupled event-driven architecture using native Node.js `EventEmitter` emitting custom system events (`user.connected`, `user.disconnected`, `message.saved`, `room.created`, `room.deleted`, `user.removed`) with an in-memory audit log viewable in the Admin Panel.
- **Admin Role-Based Access Control (RBAC)**: Distinct `user` and `admin` roles. Admins have access to the Admin Control Center, can view platform stats, delete any room (along with all its messages), remove/kick users from rooms, toggle roles, and delete user accounts.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend** | Node.js, Express, Mongoose, dotenv, bcryptjs, jsonwebtoken |
| **Real-Time** | Socket.io (Server) & Socket.io-client (Browser) |
| **Architecture** | Native Node.js `EventEmitter` for server events & audit logging |
| **Database** | MongoDB (Collections: `User`, `Room`, `Message`) |
| **Frontend** | React 19, React Router Dom, Fetch API, Context API, Lucide Icons |
| **Build Tool** | Vite |

---

## 📂 Project Structure

```
webdev_capstone/
├── package.json               # Root scripts for starting, testing, and seeding
├── server/
│   ├── .env                   # Server environment variables (PORT, MONGODB_URI, JWT_SECRET)
│   ├── server.js              # Express app, HTTP server, Socket.io initialization, static fallback
│   ├── package.json           # Server dependencies
│   └── src/
│       ├── config/
│       │   └── db.js          # MongoDB connection handler
│       ├── controllers/
│       │   ├── authController.js    # Register, login, getMe
│       │   ├── roomController.js    # Group & direct rooms, join, leave
│       │   ├── messageController.js # Room messages, send, mark read, unread aggregation
│       │   ├── userController.js    # User directory
│       │   └── adminController.js   # RBAC: delete room, remove user, user roles, stats
│       ├── events/
│       │   └── appEvents.js   # Node.js EventEmitter instance & audit log
│       ├── middleware/
│       │   ├── auth.js        # JWT protect middleware
│       │   ├── rbac.js        # authorize('admin') role check middleware
│       │   └── errorHandler.js# Centralized error handler
│       ├── models/
│       │   ├── User.js        # User Schema (role: 'user' | 'admin', isOnline, lastSeen)
│       │   ├── Room.js        # Room Schema (isGroup, members, creator, lastMessage)
│       │   └── Message.js     # Message Schema (room, sender, content, readBy)
│       ├── routes/
│       │   ├── authRoutes.js
│       │   ├── roomRoutes.js
│       │   ├── messageRoutes.js
│       │   ├── userRoutes.js
│       │   └── adminRoutes.js
│       ├── socket/
│       │   └── socketHandler.js # Handshake JWT auth, typing, presence, instant messages
│       └── utils/
│           ├── seed.js        # Database seeder with demo accounts and rooms
│           ├── testBackend.js # REST API & RBAC automated test
│           └── testE2E.js     # Full end-to-end Socket.io & aggregation automated test
└── client/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── index.css          # Sleek modern dark theme styling
        ├── main.jsx           # App entry point
        ├── App.jsx            # Router and Provider hierarchy
        ├── context/
        │   ├── AuthContext.jsx   # Authentication state, login, register, logout
        │   ├── SocketContext.jsx # Socket instance, online presence, typing state
        │   └── ChatContext.jsx   # Rooms, active chat, message history, unread counts
        ├── services/
        │   ├── api.js         # Fetch API wrappers for REST endpoints
        │   └── socket.js      # Socket.io connection helper with auth token
        ├── components/
        │   ├── Navbar.jsx     # Navigation, role badge, online status, logout
        │   ├── Sidebar.jsx    # Room search, groups, direct chats, unread badges
        │   ├── ChatArea.jsx   # Message list, typing bubble, message input
        │   ├── CreateRoomModal.jsx    # Create group room with member selection
        │   ├── DirectMessageModal.jsx # User directory for 1-to-1 messaging
        │   ├── AvailableRoomsModal.jsx# Explore and join public rooms
        │   ├── RoomMembersModal.jsx   # Room members list & Admin kick button
        │   └── AdminPanel.jsx         # Admin stats, EventEmitter log, room/user tables
        └── pages/
            ├── Login.jsx      # Login page with 1-click demo accounts
            ├── Register.jsx   # Registration with role selector
            ├── ChatPage.jsx   # Main split-view workspace
            └── AdminPage.jsx  # Admin RBAC dashboard
```

---

## 🗄️ MongoDB Collections

### 1. `User` Collection
- `username`: String (unique, required)
- `email`: String (unique, required, lowercase)
- `password`: String (bcrypt hashed, `select: false`)
- `role`: String (`'user'` or `'admin'`, default: `'user'`)
- `avatar`: String (DiceBear SVG avatar URL)
- `isOnline`: Boolean (default: `false`)
- `lastSeen`: Date (default: `Date.now`)
- `timestamps`: `true`

### 2. `Room` Collection
- `name`: String (required for group rooms)
- `description`: String (topic/purpose)
- `isGroup`: Boolean (true for group rooms, false for direct 1-to-1 chats)
- `members`: Array of `User` ObjectIds
- `creator`: ObjectId reference to `User`
- `lastMessage`: ObjectId reference to `Message`
- `timestamps`: `true`

### 3. `Message` Collection
- `room`: ObjectId reference to `Room` (indexed)
- `sender`: ObjectId reference to `User` (indexed)
- `content`: String (required, trimmed)
- `readBy`: Array of `User` ObjectIds who have read the message (indexed)
- `timestamps`: `true`

---

## 🔍 MongoDB Aggregation: Unread Count per Room

The application computes unread counts for all rooms a user belongs to using an optimized MongoDB Aggregation Pipeline in `server/src/controllers/messageController.js`:

```javascript
const aggregationResult = await Message.aggregate([
  {
    $match: {
      room: { $in: userRoomObjectIds },
      sender: { $ne: currentUserId },
      readBy: { $ne: currentUserId },
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
```

---

## 📡 Node.js EventEmitter for Server Events

A dedicated EventEmitter instance (`appEvents` in `server/src/events/appEvents.js`) decouples internal server event handling:

- `user.connected`: Fired when a user successfully passes JWT handshake and connects.
- `user.disconnected`: Fired when a user disconnects all socket instances.
- `message.saved`: Fired whenever a message is validated and persisted to MongoDB.
- `room.created`: Fired when a new room is instantiated.
- `room.deleted`: Fired when an admin deletes a room.
- `user.removed`: Fired when an admin removes a user from a room.

All events are logged to an in-memory audit trail viewable live inside the Admin Panel.

---

## 👥 Demo Accounts (Pre-Seeded)

| Account | Email | Password | Role | Access Level |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | `admin@chatsphere.com` | `password123` | `admin` | Full RBAC: Delete rooms, kick users, manage roles, audit log |
| **Alice** | `alice@chatsphere.com` | `password123` | `user` | Standard User: Chat, create rooms, join/leave |
| **Bob** | `bob@chatsphere.com` | `password123` | `user` | Standard User: Chat, direct messages |
| **Charlie** | `charlie@chatsphere.com` | `password123` | `user` | Standard User: Chat, direct messages |

> 💡 *The login screen includes 1-click buttons to automatically fill credentials for any of these demo accounts.*

---

## ⚡ Quick Start & Setup

### 1. Prerequisites
- Node.js (v18+)
- MongoDB running locally on `mongodb://127.0.0.1:27017` (or remote URI in `.env`)

### 2. Seed Database
```bash
npm run seed
```

### 3. Run Backend Verification Tests
```bash
# REST API & RBAC checks
npm run test:backend

# Full Socket.io, JWT handshake, typing, instant messaging, and aggregation test
npm run test:e2e
```

### 4. Start the Application
```bash
# Start unified full-stack server on http://localhost:5000
npm start
```
Open **[http://localhost:5000](http://localhost:5000)** in your browser to experience ChatSphere!
