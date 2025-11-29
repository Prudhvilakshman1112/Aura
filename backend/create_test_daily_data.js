import pkg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pkg;
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function createTestDailyData() {
  console.log('🔧 Creating test daily tracking data...');
  
  try {
    const client = await pool.connect();
    
    // First, let's create the table if it doesn't exist
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS daily_coding_tracker (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        tracking_date DATE NOT NULL,
        prev_leetcode_total INTEGER DEFAULT 0,
        prev_codechef_total INTEGER DEFAULT 0,
        prev_codeforces_total INTEGER DEFAULT 0,
        current_leetcode_total INTEGER DEFAULT 0,
        current_codechef_total INTEGER DEFAULT 0,
        current_codeforces_total INTEGER DEFAULT 0,
        daily_leetcode_solved INTEGER DEFAULT 0,
        daily_codechef_solved INTEGER DEFAULT 0,
        daily_codeforces_solved INTEGER DEFAULT 0,
        total_daily_solved INTEGER DEFAULT 0,
        data_fetched_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, tracking_date)
      );
    `;
    
    await client.query(createTableQuery);
    console.log('✅ Table created/verified');
    
    // Insert test data for yesterday (so today's calculation works)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    const today = new Date().toISOString().split('T')[0];
    
    // Insert yesterday's data (baseline)
    const yesterdayData = `
      INSERT INTO daily_coding_tracker (
        user_id, tracking_date,
        prev_leetcode_total, prev_codechef_total, prev_codeforces_total,
        current_leetcode_total, current_codechef_total, current_codeforces_total,
        daily_leetcode_solved, daily_codechef_solved, daily_codeforces_solved,
        total_daily_solved
      ) VALUES (
        1, $1, 
        200, 45, 10,
        210, 50, 12,
        10, 5, 2,
        17
      )
      ON CONFLICT (user_id, tracking_date) 
      DO UPDATE SET
        current_leetcode_total = EXCLUDED.current_leetcode_total,
        current_codechef_total = EXCLUDED.current_codechef_total,
        current_codeforces_total = EXCLUDED.current_codeforces_total,
        daily_leetcode_solved = EXCLUDED.daily_leetcode_solved,
        daily_codechef_solved = EXCLUDED.daily_codechef_solved,
        daily_codeforces_solved = EXCLUDED.daily_codeforces_solved,
        total_daily_solved = EXCLUDED.total_daily_solved
    `;
    
    await client.query(yesterdayData, [yesterdayStr]);
    console.log(`✅ Yesterday's data (${yesterdayStr}) inserted`);
    
    // Insert today's data showing actual progress
    const todayData = `
      INSERT INTO daily_coding_tracker (
        user_id, tracking_date,
        prev_leetcode_total, prev_codechef_total, prev_codeforces_total,
        current_leetcode_total, current_codechef_total, current_codeforces_total,
        daily_leetcode_solved, daily_codechef_solved, daily_codeforces_solved,
        total_daily_solved
      ) VALUES (
        1, $1,
        210, 50, 12,
        215, 52, 13,
        5, 2, 1,
        8
      )
      ON CONFLICT (user_id, tracking_date) 
      DO UPDATE SET
        current_leetcode_total = EXCLUDED.current_leetcode_total,
        current_codechef_total = EXCLUDED.current_codechef_total,
        current_codeforces_total = EXCLUDED.current_codeforces_total,
        daily_leetcode_solved = EXCLUDED.daily_leetcode_solved,
        daily_codechef_solved = EXCLUDED.daily_codechef_solved,
        daily_codeforces_solved = EXCLUDED.daily_codeforces_solved,
        total_daily_solved = EXCLUDED.total_daily_solved
    `;
    
    await client.query(todayData, [today]);
    console.log(`✅ Today's data (${today}) inserted - 8 problems solved today`);
    
    // Verify the data
    const verifyQuery = `
      SELECT tracking_date, daily_leetcode_solved, daily_codechef_solved, 
             daily_codeforces_solved, total_daily_solved
      FROM daily_coding_tracker 
      WHERE user_id = 1 
      ORDER BY tracking_date DESC 
      LIMIT 2
    `;
    
    const result = await client.query(verifyQuery);
    console.log('\n📊 Inserted data verification:');
    result.rows.forEach(row => {
      console.log(`${row.tracking_date}: ${row.total_daily_solved} problems (LC: ${row.daily_leetcode_solved}, CC: ${row.daily_codechef_solved}, CF: ${row.daily_codeforces_solved})`);
    });
    
    client.release();
    console.log('\n🎉 Test data created successfully!');
    console.log('Now the mental health AI should show 8 problems solved today instead of 212');
    
  } catch (error) {
    console.error('❌ Error creating test data:', error);
  } finally {
    await pool.end();
  }
}

createTestDailyData().catch(console.error);
