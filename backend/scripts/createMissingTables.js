import pool from '../config/database.js';

async function createMissingTables() {
  let client;
  
  try {
    console.log('🔧 Creating missing database tables...');
    client = await pool.connect();
    
    // Create coding_platform_history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS coding_platform_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        record_date DATE NOT NULL DEFAULT CURRENT_DATE,
        
        -- LeetCode Stats
        leetcode_total_solved INTEGER DEFAULT 0,
        leetcode_easy_solved INTEGER DEFAULT 0,
        leetcode_medium_solved INTEGER DEFAULT 0,
        leetcode_hard_solved INTEGER DEFAULT 0,
        
        -- CodeChef Stats
        codechef_total_solved INTEGER DEFAULT 0,
        codechef_contest_problems INTEGER DEFAULT 0,
        codechef_rating INTEGER DEFAULT 0,
        
        -- Codeforces Stats
        codeforces_total_solved INTEGER DEFAULT 0,
        codeforces_contest_solved INTEGER DEFAULT 0,
        codeforces_rating INTEGER DEFAULT 0,
        
        -- Daily Changes (problems solved today)
        daily_leetcode_solved INTEGER DEFAULT 0,
        daily_codechef_solved INTEGER DEFAULT 0,
        daily_codeforces_solved INTEGER DEFAULT 0,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- One record per user per day
        UNIQUE(user_id, record_date)
      )
    `);
    console.log('✅ Created coding_platform_history table');
    
    // Create daily_user_progress table if missing
    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_user_progress (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
        
        -- Career Progress Fields
        career_path_id INTEGER REFERENCES career_paths(id) ON DELETE SET NULL,
        milestones_completed INTEGER DEFAULT 0,
        study_time_minutes INTEGER DEFAULT 0,
        
        -- Coding Platform Progress Fields
        leetcode_problems_solved INTEGER DEFAULT 0,
        codechef_problems_solved INTEGER DEFAULT 0,
        codeforces_problems_solved INTEGER DEFAULT 0,
        codeforces_contest_problems INTEGER DEFAULT 0,
        codechef_contest_problems INTEGER DEFAULT 0,
        
        -- Daily Totals
        total_problems_solved INTEGER DEFAULT 0,
        total_contest_problems INTEGER DEFAULT 0,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- Ensure one record per user per day
        UNIQUE(user_id, activity_date)
      )
    `);
    console.log('✅ Created daily_user_progress table');
    
    // Create user_daily_streaks_detailed table (renamed from user_daily_streaks)
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_daily_streaks_detailed (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        streak_date DATE NOT NULL DEFAULT CURRENT_DATE,
        
        -- Individual Platform Streaks
        leetcode_streak INTEGER DEFAULT 0,
        codechef_streak INTEGER DEFAULT 0,
        codeforces_streak INTEGER DEFAULT 0,
        career_milestone_streak INTEGER DEFAULT 0,
        
        -- Combined Streaks
        coding_platforms_streak INTEGER DEFAULT 0,
        overall_learning_streak INTEGER DEFAULT 0,
        
        -- Daily Activity Flags
        had_leetcode_activity BOOLEAN DEFAULT FALSE,
        had_codechef_activity BOOLEAN DEFAULT FALSE,
        had_codeforces_activity BOOLEAN DEFAULT FALSE,
        had_career_activity BOOLEAN DEFAULT FALSE,
        had_any_activity BOOLEAN DEFAULT FALSE,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- One record per user per day
        UNIQUE(user_id, streak_date)
      )
    `);
    console.log('✅ Created user_daily_streaks_detailed table');
    
    // Create indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_coding_history_user_date ON coding_platform_history(user_id, record_date);
      CREATE INDEX IF NOT EXISTS idx_coding_history_date ON coding_platform_history(record_date);
      CREATE INDEX IF NOT EXISTS idx_daily_progress_user_date ON daily_user_progress(user_id, activity_date);
      CREATE INDEX IF NOT EXISTS idx_streaks_detailed_user_date ON user_daily_streaks_detailed(user_id, streak_date);
    `);
    console.log('✅ Created indexes');
    
    console.log('🎉 All missing tables created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Run the migration
createMissingTables()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
