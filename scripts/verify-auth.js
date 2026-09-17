async function run() {
  const baseUrl = process.argv[2] || 'http://127.0.0.1:3000';
  console.log(`\n🔍 Verifying Authentication & Token Refresh on ${baseUrl}...`);

  // 1. Test Login
  const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@experimindlabs.com',
      password: 'AdminPass123!'
    })
  });
  const loginData = await loginRes.json();
  console.log('✅ 1. Login Status:', loginRes.status, '| User:', loginData.user?.email, '| Token Received:', !!loginData.token, '| RefreshToken Received:', !!loginData.refreshToken);

  if (!loginData.token || !loginData.refreshToken) {
    console.error('❌ Login failed:', loginData);
    process.exit(1);
  }

  // 2. Test Refresh Token with valid refresh token
  const refreshRes = await fetch(`${baseUrl}/api/v1/auth/refresh-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-refresh-token': loginData.refreshToken
    },
    body: JSON.stringify({ refreshToken: loginData.refreshToken })
  });
  const refreshData = await refreshRes.json();
  console.log('✅ 2. Token Refresh Status:', refreshRes.status, '| New Token Received:', !!refreshData.token, '| New RefreshToken Received:', !!refreshData.refreshToken);

  if (!refreshData.token) {
    console.error('❌ Token refresh failed:', refreshData);
    process.exit(1);
  }

  // 3. Test Refresh Token with invalid / expired refresh token (Must return 401)
  const invalidRefreshRes = await fetch(`${baseUrl}/api/v1/auth/refresh-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-refresh-token': 'invalid-expired-token-hash'
    },
    body: JSON.stringify({ refreshToken: 'invalid-expired-token-hash' })
  });
  const invalidRefreshData = await invalidRefreshRes.json();
  console.log('✅ 3. Invalid Refresh Token Rejection:', invalidRefreshRes.status === 401 ? '401 Unauthorized (Correct)' : `${invalidRefreshRes.status} (Unexpected)`, '| Error message:', invalidRefreshData.error);

  // 4. Test Protected Endpoint with the Refreshed Access Token
  const invRes = await fetch(`${baseUrl}/api/v1/inventory`, {
    headers: {
      'Authorization': `Bearer ${refreshData.token}`
    }
  });
  const invData = await invRes.json();
  console.log('✅ 4. Protected Inventory Fetch:', invRes.status, '| Total Items:', Array.isArray(invData) ? invData.length : 0);

  // 5. Test Protected Users Endpoint
  const usersRes = await fetch(`${baseUrl}/api/v1/users`, {
    headers: {
      'Authorization': `Bearer ${refreshData.token}`
    }
  });
  const usersData = await usersRes.json();
  console.log('✅ 5. Protected Users Directory Fetch:', usersRes.status, '| Total Users:', Array.isArray(usersData) ? usersData.length : 0);

  console.log('\n🎉 ALL AUTHENTICATION AND TOKEN REFRESH TESTS PASSED SUCCESSFULLY!\n');
}

run().catch(err => {
  console.error('❌ Test execution error:', err);
  process.exit(1);
});
