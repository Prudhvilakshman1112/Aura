import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// Debug: Log the connection string (without password)
const dbUrl = process.env.DATABASE_URL;
if (dbUrl) {
  const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
  console.log('🔗 Database URL:', maskedUrl);
} else {
  console.error('❌ DATABASE_URL not found in environment variables');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 60000,
  max: 15,
  min: 2,
  acquireTimeoutMillis: 30000,
  createTimeoutMillis: 30000,
  destroyTimeoutMillis: 5000,
  reapIntervalMillis: 1000,
  createRetryIntervalMillis: 200
});

// Test the connection with better error handling
pool.on('connect', (client) => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err, client) => {
  console.error('❌ PostgreSQL connection error:', err.message);
  if (err.code === 'ETIMEDOUT') {
    console.error('🔄 Connection timed out - check if database server is running and accessible');
  }
});

// Test connection on startup
async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ Database connection test successful');
    client.release();
  } catch (err) {
    console.error('❌ Database connection test failed:', err.message);
    if (err.code === 'ETIMEDOUT') {
      console.error('💡 Suggestion: Verify your database connection string and server status in Aiven console');
    }
  }
}

// Remove automatic connection testing to prevent polling issues
// setTimeout(testConnection, 2000);

export { pool };
export default pool;
