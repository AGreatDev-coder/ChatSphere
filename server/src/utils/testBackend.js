const http = require('http');

const request = (options, data = null) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
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

async function runTests() {
  console.log('--- Starting Backend Verification Tests ---');

  // 1. Health check
  const health = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/health',
    method: 'GET',
  });
  console.log('1. Health check:', health.status === 200 ? 'PASS' : 'FAIL', health.data);

  // 2. Login as admin
  const adminLogin = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: 'admin@chatsphere.com', password: 'password123' }
  );
  console.log('2. Admin login:', adminLogin.status === 200 ? 'PASS' : 'FAIL', `Role: ${adminLogin.data?.user?.role}`);
  const adminToken = adminLogin.data.token;

  // 3. Login as regular user Alice
  const userLogin = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: 'alice@chatsphere.com', password: 'password123' }
  );
  console.log('3. User login:', userLogin.status === 200 ? 'PASS' : 'FAIL', `Username: ${userLogin.data?.user?.username}`);
  const userToken = userLogin.data.token;

  // 4. Get Alice rooms
  const roomsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/rooms/my',
    method: 'GET',
    headers: { Authorization: `Bearer ${userToken}` },
  });
  console.log('4. User rooms with unread aggregation:', roomsRes.status === 200 ? 'PASS' : 'FAIL', `Count: ${roomsRes.data?.count}`);

  // 5. Unread count aggregation endpoint
  const unreadRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/messages/unread',
    method: 'GET',
    headers: { Authorization: `Bearer ${userToken}` },
  });
  console.log('5. Unread aggregation pipeline:', unreadRes.status === 200 ? 'PASS' : 'FAIL', unreadRes.data?.unreadCounts);

  // 6. Admin stats and Event Logs
  const statsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/stats',
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log('6. Admin stats & EventEmitter logs:', statsRes.status === 200 ? 'PASS' : 'FAIL', statsRes.data?.stats);

  // 7. Regular user attempting admin endpoint (RBAC check)
  const forbiddenRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/stats',
    method: 'GET',
    headers: { Authorization: `Bearer ${userToken}` },
  });
  console.log('7. RBAC Forbidden check for non-admin:', forbiddenRes.status === 403 ? 'PASS' : 'FAIL', forbiddenRes.data?.message);

  console.log('--- Backend Verification Complete ---');
  process.exit(0);
}

runTests().catch((e) => {
  console.error('Test error:', e);
  process.exit(1);
});
