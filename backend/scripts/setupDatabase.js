import pool from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Setting up daily progress tracking database...');
    
    // Read and execute the SQL file
    const sqlPath = path.join(__dirname, '../migrations/create_daily_progress_tables.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Split by semicolons and execute each statement
    const statements = sqlContent.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await client.query(statement);
          console.log('✅ Executed SQL statement successfully');
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log('ℹ️ Table/function already exists, skipping...');
          } else {
            console.error('❌ Error executing statement:', error.message);
          }
        }
      }
    }
    
    console.log('🔄 Migrating existing data...');
    
    // 1. Migrate existing milestone completions
    console.log('Migrating milestone completions...');
    await client.query(`
      INSERT INTO user_milestone_completions (user_id, career_path_id, milestone_id, completed_at, completion_date)
      SELECT 
        cp.user_id,
        m.career_path_id,
        m.id as milestone_id,
        COALESCE(m.completed_at, m.updated_at) as completed_at,
        COALESCE(DATE(m.completed_at), DATE(m.updated_at)) as completion_date
      FROM milestones m
      JOIN career_paths cp ON m.career_path_id = cp.id
      WHERE m.completed = true 
        AND cp.user_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM user_milestone_completions umc 
          WHERE umc.user_id = cp.user_id AND umc.milestone_id = m.id
        )
      ON CONFLICT (user_id, milestone_id) DO NOTHING
    `);
    
    // 2. Create initial daily progress records
    console.log('Creating initial daily progress records...');
    await client.query(`
      INSERT INTO daily_user_progress (user_id, activity_date, career_path_id, milestones_completed, total_problems_solved)
      SELECT 
        cp.user_id,
        CURRENT_DATE,
        cp.id as career_path_id,
        COUNT(m.id) as milestones_completed,
        COALESCE(cs.leetcode_solved, 0) + COALESCE(cs.codechef_solved, 0) + COALESCE(cs.codeforces_solved, 0) as total_problems_solved
      FROM career_paths cp
      LEFT JOIN milestones m ON cp.id = m.career_path_id AND m.completed = true
      LEFT JOIN coding_stats cs ON cp.user_id = cs.user_id
      WHERE cp.user_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM daily_user_progress dup 
          WHERE dup.user_id = cp.user_id AND dup.activity_date = CURRENT_DATE
        )
      GROUP BY cp.user_id, cp.id, cs.leetcode_solved, cs.codechef_solved, cs.codeforces_solved
      ON CONFLICT (user_id, activity_date) DO NOTHING
    `);
    
    // 3. Initialize coding platform history
    console.log('Initializing coding platform history...');
    await client.query(`
      INSERT INTO coding_platform_history (
        user_id, record_date, 
        leetcode_total_solved, codechef_total_solved, codeforces_total_solved,
        codeforces_contest_solved, codechef_contest_problems
      )
      SELECT 
        user_id,
        CURRENT_DATE,
        COALESCE(leetcode_solved, 0),
        COALESCE(codechef_solved, 0),
        COALESCE(codeforces_solved, 0),
        COALESCE(codeforces_contest_solved, 0),
        COALESCE(codechef_contests_participated, 0)
      FROM coding_stats
      WHERE NOT EXISTS (
        SELECT 1 FROM coding_platform_history cph 
        WHERE cph.user_id = coding_stats.user_id AND cph.record_date = CURRENT_DATE
      )
      ON CONFLICT (user_id, record_date) DO NOTHING
    `);
    
    // 4. Initialize user daily streaks
    console.log('Initializing daily streaks...');
    await client.query(`
      INSERT INTO user_daily_streaks (
        user_id, streak_date, 
        coding_platforms_streak, overall_learning_streak,
        had_any_activity
      )
      SELECT 
        u.id as user_id,
        CURRENT_DATE,
        COALESCE(cs.current_streak, 0),
        COALESCE(cs.current_streak, 0),
        CASE WHEN cs.user_id IS NOT NULL THEN true ELSE false END
      FROM users u
      LEFT JOIN coding_stats cs ON u.id = cs.user_id
      WHERE NOT EXISTS (
        SELECT 1 FROM user_daily_streaks uds 
        WHERE uds.user_id = u.id AND uds.streak_date = CURRENT_DATE
      )
      ON CONFLICT (user_id, streak_date) DO NOTHING
    `);
    
    // 5. Initialize career progress history
    console.log('Initializing career progress history...');
    await client.query(`
      INSERT INTO user_career_progress_history (
        user_id, career_path_id, progress_date,
        total_milestones, completed_milestones, progress_percentage
      )
      SELECT 
        cp.user_id,
        cp.id,
        CURRENT_DATE,
        COUNT(m.id) as total_milestones,
        COUNT(CASE WHEN m.completed = true THEN 1 END) as completed_milestones,
        CASE 
          WHEN COUNT(m.id) > 0 THEN 
            ROUND((COUNT(CASE WHEN m.completed = true THEN 1 END) * 100.0 / COUNT(m.id)), 2)
          ELSE 0 
        END as progress_percentage
      FROM career_paths cp
      LEFT JOIN milestones m ON cp.id = m.career_path_id
      WHERE cp.user_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM user_career_progress_history ucph 
          WHERE ucph.user_id = cp.user_id 
            AND ucph.career_path_id = cp.id 
            AND ucph.progress_date = CURRENT_DATE
        )
      GROUP BY cp.user_id, cp.id
      ON CONFLICT (user_id, career_path_id, progress_date) DO NOTHING
    `);
    
    console.log('✅ Database setup completed successfully!');
    
    // Display summary
    const summary = await client.query(`
      SELECT 
        'Users' as table_name,
        COUNT(*) as record_count
      FROM users
      UNION ALL
      SELECT 'Daily Progress Records', COUNT(*) FROM daily_user_progress
      UNION ALL
      SELECT 'Milestone Completions', COUNT(*) FROM user_milestone_completions
      UNION ALL
      SELECT 'Daily Streaks', COUNT(*) FROM user_daily_streaks
      UNION ALL
      SELECT 'Career Progress History', COUNT(*) FROM user_career_progress_history
      UNION ALL
      SELECT 'Coding Platform History', COUNT(*) FROM coding_platform_history
    `);
    
    console.log('\n📊 Database Summary:');
    summary.rows.forEach(row => {
      console.log(`${row.table_name}: ${row.record_count} records`);
    });
    
  } catch (error) {
    console.error('❌ Error during database setup:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupDatabase()
    .then(() => {
      console.log('🎉 Database setup script completed successfully.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database setup script failed:', error);
      process.exit(1);
    });
}

export default setupDatabase;
