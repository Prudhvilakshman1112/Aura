import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const { Pool } = pg;

// Create database connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

async function createCompleteSchema() {
  const client = await pool.connect();
  
  try {
    console.log('🔗 Connecting to PostgreSQL database...');
    console.log(`📍 Host: ${process.env.DB_HOST}`);
    console.log(`🗄️  Database: ${process.env.DB_NAME}`);
    console.log(`👤 User: ${process.env.DB_USER}`);
    
    // Test connection
    const timeResult = await client.query('SELECT NOW()');
    console.log('✅ Database connection successful!');
    console.log(`⏰ Server time: ${timeResult.rows[0].now}`);
    
    // Read the complete schema file
    const schemaPath = path.join(__dirname, '..', 'complete_database_schema.sql');
    console.log(`📄 Reading schema file: ${schemaPath}`);
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at: ${schemaPath}`);
    }
    
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    console.log(`📊 Schema file loaded (${schemaSQL.length} characters)`);
    
    // Split the SQL into individual statements
    const statements = schemaSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`🔧 Found ${statements.length} SQL statements to execute`);
    console.log('🚀 Executing database schema creation...');
    console.log('⏳ This may take a few moments...');
    
    // Execute statements one by one for better error reporting
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        if (statement.includes('CREATE TABLE') || statement.includes('CREATE INDEX') || statement.includes('CREATE TRIGGER')) {
          const tableName = statement.match(/CREATE (?:TABLE|INDEX|TRIGGER)(?:\s+IF NOT EXISTS)?\s+(\w+)/i);
          console.log(`   Creating: ${tableName ? tableName[1] : 'unknown'}`);
        }
        
        await client.query(statement);
        successCount++;
      } catch (error) {
        errorCount++;
        console.warn(`⚠️  Warning executing statement ${i + 1}: ${error.message}`);
        if (error.code !== '42P07' && error.code !== '42P06') { // Ignore "already exists" errors
          console.error(`❌ Statement: ${statement.substring(0, 100)}...`);
        }
      }
    }
    
    console.log(`✅ Executed ${successCount} statements successfully`);
    if (errorCount > 0) {
      console.log(`⚠️  ${errorCount} statements had warnings (likely already existed)`);
    }
    
    // Verify tables were created
    console.log('🔍 Verifying table creation...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log(`📋 Created ${tablesResult.rows.length} tables:`);
    tablesResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });
    
    // Verify views were created
    const viewsResult = await client.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    if (viewsResult.rows.length > 0) {
      console.log(`👁️  Created ${viewsResult.rows.length} views:`);
      viewsResult.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.table_name}`);
      });
    }
    
    // Check indexes
    const indexesResult = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public'
      AND indexname NOT LIKE '%_pkey'
      ORDER BY indexname
    `);
    
    if (indexesResult.rows.length > 0) {
      console.log(`🔍 Created ${indexesResult.rows.length} custom indexes`);
    }
    
    console.log('');
    console.log('🎉 Database setup completed successfully!');
    console.log('🚀 Your Aura Synergy Hub application is ready to run!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Start the backend server: npm start');
    console.log('2. Start the frontend application');
    console.log('3. Register your first user account');
    
  } catch (error) {
    console.error('❌ Error creating database schema:', error);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('🔌 Connection refused. Please check:');
      console.error('   - Database server is running');
      console.error('   - Host and port are correct');
      console.error('   - Network connectivity');
    } else if (error.code === '28P01') {
      console.error('🔐 Authentication failed. Please check:');
      console.error('   - Username and password are correct');
      console.error('   - User has necessary privileges');
    } else if (error.code === '3D000') {
      console.error('🗄️  Database does not exist. Please check:');
      console.error('   - Database name is correct');
      console.error('   - Database exists on the server');
    } else if (error.code === '42P07') {
      console.error('⚠️  Some tables already exist. This might be expected.');
      console.error('   - Use DROP SCHEMA public CASCADE; to reset (WARNING: deletes all data)');
      console.error('   - Or modify the schema to use IF NOT EXISTS clauses');
    }
    
    throw error;
  } finally {
    client.release();
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

// Run the schema creation if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createCompleteSchema()
    .then(() => {
      console.log('✅ Schema creation script completed successfully.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Schema creation script failed:', error.message);
      process.exit(1);
    });
}

export default createCompleteSchema;
