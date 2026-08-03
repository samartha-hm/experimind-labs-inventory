import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Extract connection parameters from DATABASE_URL or individual vars
const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD } = process.env;

// Default to connecting to the 'postgres' database to create our target database
const adminClient = new Client({
  host: DB_HOST,
  port: parseInt(DB_PORT),
  user: DB_USER,
  password: DB_PASSWORD,
  database: 'postgres', // Connect to the default maintenance database
});

async function createDatabase() {
  try {
    await adminClient.connect();
    console.log('Connected to PostgreSQL server (as postgres user)');

    // Check if database exists
    const { rows } = await adminClient.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [process.env.DB_NAME]
    );

    if (rows.length === 0) {
      // Database does not exist, create it
      await adminClient.query(`CREATE DATABASE "${process.env.DB_NAME}"`);
      console.log(`Database "${process.env.DB_NAME}" created successfully.`);
    } else {
      console.log(`Database "${process.env.DB_NAME}" already exists.`);
    }
  } catch (err) {
    console.error('Error creating database:', err);
    process.exit(1);
  } finally {
    await adminClient.end();
  }
}

createDatabase();