const dotenv = require('dotenv');
dotenv.config();

const requiredVars = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingVars = [];

for (const varName of requiredVars) {
  if (!process.env[varName]) {
    missingVars.push(varName);
  }
}

console.log('Environment variable check:');
if (missingVars.length === 0) {
  console.log('✅ All required database variables are set');
  console.log(`   DB_HOST=${process.env.DB_HOST}`);
  console.log(`   DB_PORT=${process.env.DB_PORT}`);
  console.log(`   DB_USER=${process.env.DB_USER}`);
  console.log(`   DB_PASSWORD=${'*'.repeat(process.env.DB_PASSWORD?.length || 0)}`); // Hide password
  console.log(`   DB_NAME=${process.env.DB_NAME}`);
} else {
  console.log('❌ Missing environment variables:');
  for (const varName of missingVars) {
    console.log(`   ${varName}`);
  }
  console.log('\nPlease check your .env file and add the missing variables.');
}

console.log('\nDATABASE_URL:', process.env.DATABASE_URL ? '[SET]' : '[NOT SET]');