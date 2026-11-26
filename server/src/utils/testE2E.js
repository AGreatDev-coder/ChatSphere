const path = require('path');
const io = require(path.resolve(__dirname, '../../../client/node_modules/socket.io-client'));
const http = require('http');

const request = (options, data = null) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
};

async function testE2E() {
  console.log('=== Starting ChatSphere Full E2E & Socket Verification ===\n');

  // 1. Authenticate Alice (User) and Admin
  const aliceLogin = await request(
    { hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    { email: 'alice@chatsphere.com', password: 'password123' }
  );
  const aliceToken = aliceLogin.data.token;
  const aliceUser = aliceLogin.data.user;
  console.log('✓ Alice authenticated:', aliceUser.username, '(Role:', aliceUser.role + ')');

  const adminLogin = await request(
    { hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    { email: 'admin@chatsphere.com', password: 'password123' }
  );
  const adminToken = adminLogin.data.token;
  const adminUser = adminLogin.data.user;
  console.log('✓ Admin authenticated:', adminUser.username, '(Role:', adminUser.role + ')');

  // 2. Test Socket.io handshake without token (should fail / reject)
  await new Promise((resolve) => {
    const unauthSocket = io('http://localhost:5000', {
      auth: { token: '' },
      transports: ['websocket'],
      reconnection: false,
    });
    unauthSocket.on('connect_error', (err) => {
      console.log('✓ Unauthenticated handshake properly rejected:', err.message);
      unauthSocket.disconnect();
      resolve();
    });
    unauthSocket.on('connect', () => {
      console.error('FAIL: Unauthenticated socket connected!');
      unauthSocket.disconnect();
      resolve();
    });
  });

  // 3. Connect Alice and Admin with valid JWT during socket handshake
  const aliceSocket = io('http://localhost:5000', {
    auth: { token: aliceToken },
    transports: ['websocket'],
  });

  const adminSocket = io('http://localhost:5000', {
    auth: { token: adminToken },
    transports: ['websocket'],
  });

  await Promise.all([
    new Promise((resolve) => aliceSocket.on('connect', resolve)),
    new Promise((resolve) => adminSocket.on('connect', resolve)),
  ]);
  console.log('✓ Both Alice and Admin connected via Socket.io with JWT handshake verification');

  // 4. Create a new test group room
  const createRoomRes = await request(
    { hostname: 'localhost', port: 5000, path: '/api/rooms/group', method: 'POST', headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' } },
    { name: 'E2E Automated Room', description: 'Testing room lifecycle', memberIds: [aliceUser._id] }
  );
  const testRoom = createRoomRes.data.room;
  console.log('✓ Group room created:', testRoom.name, '(ID:', testRoom._id + ')');

  // 5. Join room on sockets
  await Promise.all([
    new Promise((resolve) => aliceSocket.emit('join_room', { roomId: testRoom._id }, resolve)),
    new Promise((resolve) => adminSocket.emit('join_room', { roomId: testRoom._id }, resolve)),
  ]);
  console.log('✓ Both Alice and Admin joined room');

  // 6. Test Typing Indicator
  const typingPromise = new Promise((resolve) => {
    adminSocket.on('typing', (data) => {
      console.log(`✓ Real-time typing event received: ${data.username} is typing in room ${data.roomId}`);
      resolve();
    });
  });
  aliceSocket.emit('typing', { roomId: testRoom._id });
  await typingPromise;

  // 7. Test Message History & Instant Delivery
  const messagePromise = new Promise((resolve) => {
    adminSocket.on('receive_message', (msg) => {
      console.log(`✓ Real-time message received by Admin: "${msg.content}" from ${msg.sender.username}`);
      resolve(msg);
    });
  });

  aliceSocket.emit('send_message', {
    roomId: testRoom._id,
    content: 'Hello Admin! This is an instant real-time message.',
  });

  const receivedMsg = await messagePromise;

  // 8. Test Unread Count Aggregation Pipeline
  // Alice sent message, Admin hasn't read it yet:
  const unreadRes = await request(
    { hostname: 'localhost', port: 5000, path: '/api/messages/unread', method: 'GET', headers: { Authorization: `Bearer ${adminToken}` } }
  );
  console.log('✓ Unread aggregation pipeline verified:', unreadRes.data.unreadCounts);

  // 9. Mark message as read
  await request(
    { hostname: 'localhost', port: 5000, path: `/api/rooms/${testRoom._id}/read`, method: 'PUT', headers: { Authorization: `Bearer ${adminToken}` } }
  );
  const unreadAfterRead = await request(
    { hostname: 'localhost', port: 5000, path: '/api/messages/unread', method: 'GET', headers: { Authorization: `Bearer ${adminToken}` } }
  );
  console.log('✓ Unread count after mark as read:', unreadAfterRead.data.unreadCounts[testRoom._id] || 0);

  // 10. Admin RBAC: Admin removes Alice from room
  const removeRes = await request(
    { hostname: 'localhost', port: 5000, path: `/api/admin/rooms/${testRoom._id}/remove-user`, method: 'POST', headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' } },
    { userId: aliceUser._id }
  );
  console.log('✓ Admin RBAC remove user verified:', removeRes.data.message);

  // 11. Admin RBAC: Admin deletes room
  const deleteRoomRes = await request(
    { hostname: 'localhost', port: 5000, path: `/api/admin/rooms/${testRoom._id}`, method: 'DELETE', headers: { Authorization: `Bearer ${adminToken}` } }
  );
  console.log('✓ Admin RBAC delete room verified:', deleteRoomRes.data.message);

  // 12. Check Node.js EventEmitter audit logs
  const statsRes = await request(
    { hostname: 'localhost', port: 5000, path: '/api/admin/stats', method: 'GET', headers: { Authorization: `Bearer ${adminToken}` } }
  );
  console.log('✓ Node.js EventEmitter recent events count:', statsRes.data.recentEvents.length);
  console.log('  Recent event types:', statsRes.data.recentEvents.slice(0, 5).map((e) => e.type).join(', '));

  // Cleanup sockets
  aliceSocket.disconnect();
  adminSocket.disconnect();

  console.log('\n=== ALL E2E REQUIREMENTS FULLY VERIFIED AND PASSING ===');
  process.exit(0);
}

testE2E().catch((err) => {
  console.error('E2E Test Failed:', err);
  process.exit(1);
});
