import pool from './database.js';

export async function ensureColumnsExist() {
  let client;
  
  try {
    console.log('🔧 Checking and adding missing database columns...');
    
    // Use a retry mechanism for connection
    let retries = 3;
    while (retries > 0) {
      try {
        client = await pool.connect();
        break;
      } catch (error) {
        retries--;
        if (error.code === '53300' && retries > 0) {
          console.log(`Connection limit reached, retrying in ${(4-retries) * 2000}ms...`);
          await new Promise(resolve => setTimeout(resolve, (4-retries) * 2000));
          continue;
        }
        throw error;
      }
    }
    
    if (!client) {
      console.log('⚠️ Could not establish database connection, skipping migration');
      return;
    }
    
    // Check if coding_stats table exists first
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'coding_stats'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('⚠️ coding_stats table does not exist, skipping column migration');
      return;
    }
    
    // Check if columns exist
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'coding_stats' 
      AND column_name IN ('codeforces_contest_solved', 'codechef_contests_participated', 'current_streak')
    `);
    
    const existingColumns = columnCheck.rows.map(row => row.column_name);
    
    // Add missing columns one by one
    if (!existingColumns.includes('codeforces_contest_solved')) {
      await client.query('ALTER TABLE coding_stats ADD COLUMN IF NOT EXISTS codeforces_contest_solved INTEGER DEFAULT 0');
      console.log('✅ Added codeforces_contest_solved column');
    }
    
    if (!existingColumns.includes('codechef_contests_participated')) {
      await client.query('ALTER TABLE coding_stats ADD COLUMN IF NOT EXISTS codechef_contests_participated INTEGER DEFAULT 0');
      console.log('✅ Added codechef_contests_participated column');
    }
    
    if (!existingColumns.includes('current_streak')) {
      await client.query('ALTER TABLE coding_stats ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0');
      console.log('✅ Added current_streak column');
    }
    
    // Update existing records with default values (only if table has data)
    const recordCount = await client.query('SELECT COUNT(*) FROM coding_stats');
    if (parseInt(recordCount.rows[0].count) > 0) {
      await client.query(`
        UPDATE coding_stats 
        SET codeforces_contest_solved = COALESCE(codeforces_contest_solved, 0), 
            codechef_contests_participated = COALESCE(codechef_contests_participated, 0), 
            current_streak = COALESCE(current_streak, 0)
      `);
    }
    
    console.log('✅ Database schema updated successfully');
    
  } catch (error) {
    if (error.code === '53300') {
      console.log('⚠️ Database connection limit reached, skipping migration (will retry on next startup)');
    } else {
      console.error('❌ Error updating database schema:', error.message);
    }
  } finally {
    if (client) {
      client.release();
    }
  }
}
