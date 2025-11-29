import pkg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const { Pool } = pkg;

// Load environment variables
dotenv.config();

// Create database connection using environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Aiven cloud databases
  }
});

async function runMigration() {
  console.log('====================================');
  console.log('Daily Coding Tracker Migration');
  console.log('====================================');
  console.log('');
  
  try {
    console.log('🔗 Connecting to Aiven PostgreSQL database...');
    
    // Test connection
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    
    // Read migration file
    const migrationPath = path.join(process.cwd(), 'migrations', 'create_daily_coding_tracker.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded');
    console.log('🚀 Executing migration...');
    
    // Execute migration
    await client.query(migrationSQL);
    
    console.log('');
    console.log('✅ Daily tracking migration completed successfully!');
    console.log('');
    console.log('📊 New table created: daily_coding_tracker');
    console.log('👁️ New view created: daily_coding_progress_view');
    console.log('🔗 New API endpoints available at: /api/daily-tracking');
    console.log('');
    console.log('🎉 You can now start tracking daily coding progress!');
    
    client.release();
    
  } catch (error) {
    console.error('');
    console.error('❌ Migration failed!');
    console.error('Error details:', error.message);
    console.error('');
    
    if (error.message.includes('already exists')) {
      console.log('ℹ️ Note: Table may already exist. This is not necessarily an error.');
    }
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
runMigration().catch(console.error);
