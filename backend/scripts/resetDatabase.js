import pool from '../config/database.js';

async function resetDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('Starting database reset...');
    
    // Get all table names
    const tablesQuery = `
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `;
    
    const result = await client.query(tablesQuery);
    const tables = result.rows.map(row => row.tablename);
    
    if (tables.length > 0) {
      console.log(`Found ${tables.length} tables to drop:`, tables);
      
      // Drop all tables with CASCADE to handle foreign key constraints
      for (const table of tables) {
        await client.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
        console.log(`Dropped table: ${table}`);
      }
    } else {
      console.log('No tables found to drop.');
    }
    
    console.log('Database reset completed successfully!');
    
  } catch (error) {
    console.error('Error resetting database:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the reset if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  resetDatabase()
    .then(() => {
      console.log('Database reset script completed.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database reset script failed:', error);
      process.exit(1);
    });
}

export default resetDatabase;
