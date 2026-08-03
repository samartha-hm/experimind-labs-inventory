const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Connection error:', err.stack);
    process.exit(1);
  } else {
    console.log('Connected successfully!', res.rows[0]);
  }
  pool.end();
});