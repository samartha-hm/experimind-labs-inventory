const { existsSync } = require('fs');
const path = require('path');

console.log('Checking Node.js dependencies...');

// Check if node_modules directory exists
const nodeModulesPath = './node_modules';
if (!existsSync(nodeModulesPath)) {
  console.log('❌ node_modules directory not found');
  console.log('📦 Please run: npm install');
  console.log('   This will install all dependencies including pg');
  process.exit(1);
}

console.log('✅ node_modules directory found');

// Check if pg package exists
const pgPath = './node_modules/pg/package.json';
if (!existsSync(pgPath)) {
  console.log('❌ pg package not found in node_modules');
  console.log('📦 Please run: npm install');
  console.log('   This should install the pg dependency');
  process.exit(1);
}

console.log('✅ pg package found in node_modules');

// Try to read the pg package version
try {
  const pgPackage = JSON.parse(require('fs').readFileSync('./node_modules/pg/package.json', 'utf8'));
  console.log(`📦 pg version: ${pgPackage.version}`);
} catch (err) {
  console.log('⚠️  Could not read pg package version:', err.message);
}

console.log('\n✅ Dependency check passed. You should be able to run the database creation script now.');