const http = require('http');
const { exec } = require('child_process');

function testEndpoint(path, expectedStatus, description) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === expectedStatus) {
          console.log(`✓ ${description} - Status: ${res.statusCode}`);
          resolve(true);
        } else {
          console.log(`✗ ${description} - Expected ${expectedStatus}, got ${res.statusCode}`);
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.log(`✗ ${description} - Connection error: ${err.message}`);
      resolve(false);
    });

    req.end();
  });
}

async function main() {
  console.log('Testing Experimind Inventory System...\n');

  const results = [];

  // Test basic connectivity
  results.push(await testEndpoint('/api/analyze', 400, 'Analysis endpoint (expects POST with data)'));

  // Test versioned API endpoints (should return 401 Unauthorized without auth)
  results.push(await testEndpoint('/api/v1/inventory', 401, 'Protected inventory endpoint'));
  results.push(await testEndpoint('/api/v1/warehouse', 401, 'Protected warehouse endpoint'));
  results.push(await testEndpoint('/api/v1/report/summary', 401, 'Protected report endpoint'));

  const passed = results.filter(r => r === true).length;
  const total = results.length;

  console.log(`\n${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('\n✅ All tests passed! Your system is running correctly.');
    console.log('\nNext steps:');
    console.log('1. Get a Firebase ID token from your frontend app');
    console.log('2. Test authenticated endpoints:');
    console.log('   curl -X POST http://localhost:3000/api/v1/auth/login \\');
    console.log('        -H "Content-Type: application/json" \\');
    console.log('        -d \'{"idToken": "YOUR_FIREBASE_ID_TOKEN"}\'');
    console.log('3. Use the returned JWT to access protected endpoints:');
    console.log('   curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:3000/api/v1/inventory');
  } else {
    console.log('\n❌ Some tests failed. Please check:');
    console.log('1. Is the server running? (npm run dev)');
    console.log('2. Did the migration complete successfully?');
    console.log('3. Are there any port conflicts?');
  }
}

main().catch(console.error);