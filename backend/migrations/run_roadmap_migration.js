import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

const runMigration = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Running roadmap database migration...');
    
    // Read and execute the migration SQL
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'create_roadmaps_tables.sql'), 
      'utf8'
    );
    
    await client.query(migrationSQL);
    
    console.log('✅ Roadmap tables created successfully');
    
    // Check if we need to add authentication middleware requirement
    const authMiddlewareCheck = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'roadmaps' 
      AND column_name = 'user_id'
    `;
    
    console.log('✅ Database migration completed successfully');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

// Run migration if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  runMigration()
    .then(() => {
      console.log('🎉 Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

export { runMigration };
