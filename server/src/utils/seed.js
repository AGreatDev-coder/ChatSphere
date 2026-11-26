const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Room = require('../models/Room');
const Message = require('../models/Message');

dotenv.config({ path: require('path').resolve(__dirname, '../../.env') });

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/chatsphere';
    await mongoose.connect(mongoUri);
    console.log('[Seed] Connected to MongoDB');

    // Clean existing database collections
    await User.deleteMany({});
    await Room.deleteMany({});
    await Message.deleteMany({});
    console.log('[Seed] Cleared existing data');

    // 1. Create Users (User and Admin roles)
    const adminUser = await User.create({
      username: 'admin',
      email: 'admin@chatsphere.com',
      password: 'password123',
      role: 'admin',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=admin',
    });

    const alice = await User.create({
      username: 'alice',
      email: 'alice@chatsphere.com',
      password: 'password123',
      role: 'user',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=alice',
    });

    const bob = await User.create({
      username: 'bob',
      email: 'bob@chatsphere.com',
      password: 'password123',
      role: 'user',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bob',
    });

    const charlie = await User.create({
      username: 'charlie',
      email: 'charlie@chatsphere.com',
      password: 'password123',
      role: 'user',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=charlie',
    });

    console.log('[Seed] Created Users: admin, alice, bob, charlie');

    // 2. Create Group Rooms
    const generalRoom = await Room.create({
      name: 'General Discussion',
      description: 'Welcome to ChatSphere! The general hangout for everyone.',
      isGroup: true,
      creator: adminUser._id,
      members: [adminUser._id, alice._id, bob._id, charlie._id],
    });

    const techRoom = await Room.create({
      name: 'Tech & Code',
      description: 'Discussions about MERN stack, WebSockets, MongoDB and Architecture.',
      isGroup: true,
      creator: adminUser._id,
      members: [adminUser._id, alice._id, bob._id],
    });

    // 3. Create a Direct 1-to-1 Room between Alice & Bob
    const directRoom = await Room.create({
      name: 'alice & bob',
      description: 'Private 1-to-1 chat',
      isGroup: false,
      creator: alice._id,
      members: [alice._id, bob._id],
    });

    // 4. Seed Messages in General Room
    const msg1 = await Message.create({
      room: generalRoom._id,
      sender: adminUser._id,
      content: 'Welcome everyone to ChatSphere! Feel free to create rooms and chat in real time.',
      readBy: [adminUser._id, alice._id, bob._id],
    });

    const msg2 = await Message.create({
      room: generalRoom._id,
      sender: alice._id,
      content: 'Hi Admin! The real-time messaging and UI look super slick.',
      readBy: [alice._id, adminUser._id],
    });

    generalRoom.lastMessage = msg2._id;
    await generalRoom.save();

    // 5. Seed Messages in Direct Room
    const directMsg = await Message.create({
      room: directRoom._id,
      sender: alice._id,
      content: 'Hey Bob! Testing private 1-to-1 messaging here.',
      readBy: [alice._id],
    });

    directRoom.lastMessage = directMsg._id;
    await directRoom.save();

    console.log('[Seed] Database successfully seeded with users, rooms, and messages!');
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]', error);
    process.exit(1);
  }
};

seedData();
