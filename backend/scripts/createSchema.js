import pool from '../config/database.js';

async function createSchema() {
  const client = await pool.connect();
  
  try {
    console.log('Creating database schema...');
    
    // Create users table
    await client.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        profile_image_url VARCHAR(512),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('Created users table');
    
    // Create user_profiles table
    await client.query(`
      CREATE TABLE user_profiles (
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
    console.log('Created user_profiles table');
    
    // Create coding_stats table
    await client.query(`
      CREATE TABLE coding_stats (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        leetcode_solved INTEGER DEFAULT 0,
        codechef_solved INTEGER DEFAULT 0,
        codeforces_solved INTEGER DEFAULT 0,
        last_updated TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('Created coding_stats table');
    
    // Create daily_activity table
    await client.query(`
      CREATE TABLE daily_activity (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        activity_date DATE NOT NULL,
        problems_solved INTEGER NOT NULL DEFAULT 1,
        UNIQUE(user_id, activity_date)
      )
    `);
    console.log('Created daily_activity table');
    
    // Create user_goals table
    await client.query(`
      CREATE TABLE user_goals (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        monthly_coding_goal INTEGER DEFAULT 50,
        daily_study_goal_minutes INTEGER DEFAULT 60
      )
    `);
    console.log('Created user_goals table');
    
    // Create indexes for better performance
    await client.query(`
      CREATE INDEX idx_daily_activity_user_date ON daily_activity(user_id, activity_date);
      CREATE INDEX idx_daily_activity_date ON daily_activity(activity_date);
      CREATE INDEX idx_users_email ON users(email);
    `);
    console.log('Created database indexes');
    
    console.log('Database schema created successfully!');
    
  } catch (error) {
    console.error('Error creating schema:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the schema creation if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createSchema()
    .then(() => {
      console.log('Schema creation script completed.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Schema creation script failed:', error);
      process.exit(1);
    });
}

export default createSchema;
