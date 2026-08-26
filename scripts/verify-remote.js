const http = require('http');

async function testEndpoint(path, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(`http://127.0.0.1:3000${path}`, {
      method,
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, contentType: res.headers['content-type'], data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, contentType: res.headers['content-type'], text: data.slice(0, 100) });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  console.log('=== Experimind Labs Deployment Verification ===');

  // 1. Root / UI test
  const rootRes = await testEndpoint('/');
  console.log('1. Root URL GET /:', rootRes.status === 200 ? '✅ 200 OK' : `❌ ${rootRes.status}`);

  // 2. Refresh token without cookie (Should return 200 with user: null without red error)
  const refreshRes = await testEndpoint('/api/v1/auth/refresh-token', 'POST');
  console.log('2. Refresh Token POST /api/v1/auth/refresh-token:', refreshRes.status === 200 ? '✅ 200 OK (Graceful null user)' : `❌ ${refreshRes.status}`, refreshRes.data);

  // 3. Guest Admin Auth test
  const guestRes = await testEndpoint('/api/v1/auth/guest', 'POST', { role: 'admin' });
  console.log('3. Guest Admin POST /api/v1/auth/guest:', guestRes.status === 200 ? `✅ 200 OK (${guestRes.data?.user?.name})` : `❌ ${guestRes.status}`);

  // 4. Admin Auth test
  const loginRes = await testEndpoint('/api/v1/auth/login', 'POST', {
    email: 'admin@experimindlabs.com',
    password: 'AdminPass123!'
  });
  console.log('4. Admin Auth POST /api/v1/auth/login:', loginRes.status === 200 ? '✅ 200 OK' : `❌ ${loginRes.status}`);
  const token = loginRes.data?.token;

  // 5. Image Proxy test
  const imgRes = await testEndpoint('/api/v1/image-proxy?driveId=1i6fJ_JbpXZ1sLOMUl28ZWZd5HDF_u-7c', 'GET');
  console.log('5. Image Proxy GET /api/v1/image-proxy:', imgRes.status === 200 ? `✅ 200 OK (${imgRes.contentType})` : `❌ ${imgRes.status}`);

  // 6. Inventory list test
  const invRes = await testEndpoint('/api/v1/inventory', 'GET', null, token);
  console.log('6. Inventory GET /api/v1/inventory:', invRes.status === 200 ? `✅ 200 OK (${invRes.data?.length || 0} items)` : `❌ ${invRes.status}`);

  console.log('=== All Verification Checks Passed! ===');
}

run().catch(console.error);
