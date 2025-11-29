import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function createSchema() {
  const client = await pool.connect();
  
  try {
    console.log('Creating database schema...');
    
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        profile_image_url VARCHAR(512),
        learning_streak INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✓ users table created');
    
    // Create user_profiles table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        linkedin_handle VARCHAR(100),
        leetcode_handle VARCHAR(100),
        codechef_handle VARCHAR(100),
        codeforces_handle VARCHAR(100),
        height_cm DECIMAL(5,2),
        weight_kg DECIMAL(5,2),
        age INTEGER,
        gender VARCHAR(10),
        study_domain VARCHAR(100),
        study_year INTEGER,
        skills TEXT[]
      )
    `);
    console.log('✓ user_profiles table created');
    
    // Create coding_stats table
    await client.query(`
      CREATE TABLE IF NOT EXISTS coding_stats (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        leetcode_solved INTEGER DEFAULT 0,
        codechef_solved INTEGER DEFAULT 0,
        codeforces_solved INTEGER DEFAULT 0,
        codeforces_contest_solved INTEGER DEFAULT 0,
        codechef_contests_participated INTEGER DEFAULT 0,
        current_streak INTEGER DEFAULT 0,
        last_updated TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✓ coding_stats table created');
    
    // Create daily_activity table
    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_activity (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        activity_date DATE NOT NULL,
        problems_solved INTEGER NOT NULL DEFAULT 1,
        UNIQUE(user_id, activity_date)
      )
    `);
    console.log('✓ daily_activity table created');
    
    // Create user_goals table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_goals (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        monthly_coding_goal INTEGER DEFAULT 50,
        daily_study_goal_minutes INTEGER DEFAULT 60
      )
    `);
    console.log('✓ user_goals table created');
    
    // Create career_paths table
    await client.query(`
      CREATE TABLE IF NOT EXISTS career_paths (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        icon VARCHAR(10) DEFAULT '🛣️',
        difficulty VARCHAR(50) DEFAULT 'Intermediate',
        estimated_duration VARCHAR(100),
        progress INTEGER DEFAULT 0,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        is_template BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ career_paths table created');
    
    // Create milestones table
    await client.query(`
      CREATE TABLE IF NOT EXISTS milestones (
        id SERIAL PRIMARY KEY,
        career_path_id INTEGER REFERENCES career_paths(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        completed BOOLEAN DEFAULT FALSE,
        due_date DATE,
        estimated_time VARCHAR(100),
        order_index INTEGER DEFAULT 0,
        completed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ milestones table created');
    
    // Create user_career_paths table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_career_paths (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        roadmap_id INTEGER NOT NULL,
        roadmap_name VARCHAR(255) NOT NULL,
        selected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        progress INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ user_career_paths table created');
    
    // Create user_module_progress table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_module_progress (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        roadmap_id INTEGER NOT NULL,
        module_name VARCHAR(500) NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, roadmap_id, module_name)
      )
    `);
    console.log('✓ user_module_progress table created');
    
    // Create user_daily_streaks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_daily_streaks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        streak_date DATE NOT NULL,
        modules_completed INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, streak_date)
      )
    `);
    console.log('✓ user_daily_streaks table created');
    
    // Create daily_user_progress table
    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_user_progress (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
        career_path_id INTEGER REFERENCES career_paths(id) ON DELETE SET NULL,
        milestones_completed INTEGER DEFAULT 0,
        study_time_minutes INTEGER DEFAULT 0,
        leetcode_problems_solved INTEGER DEFAULT 0,
        codechef_problems_solved INTEGER DEFAULT 0,
        codeforces_problems_solved INTEGER DEFAULT 0,
        codeforces_contest_problems INTEGER DEFAULT 0,
        codechef_contest_problems INTEGER DEFAULT 0,
        total_problems_solved INTEGER DEFAULT 0,
        total_contest_problems INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, activity_date)
      )
    `);
    console.log('✓ daily_user_progress table created');
    
    // Create indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_daily_activity_user_date ON daily_activity(user_id, activity_date)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_career_paths_user_id ON user_career_paths(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_module_progress_user_roadmap ON user_module_progress(user_id, roadmap_id)`);
    console.log('✓ indexes created');
    
    // Verify tables
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log(`\n🎉 SUCCESS! Created ${result.rows.length} tables:`);
    result.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createSchema().catch(console.error);
