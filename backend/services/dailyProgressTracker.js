import pool from '../config/database.js';

class DailyProgressTracker {
  
  // Record milestone completion and update daily progress
  static async recordMilestoneCompletion(userId, careerPathId, milestoneId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. Record milestone completion
      await client.query(`
        INSERT INTO user_milestone_completions (user_id, career_path_id, milestone_id, completed_at, completion_date)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_DATE)
        ON CONFLICT (user_id, milestone_id) DO NOTHING
      `, [userId, careerPathId, milestoneId]);
      
      // 2. Update or create daily progress record
      await client.query(`
        INSERT INTO daily_user_progress (
          user_id, activity_date, career_path_id, milestones_completed, study_time_minutes
        )
        VALUES ($1, CURRENT_DATE, $2, 1, 30)
        ON CONFLICT (user_id, activity_date) 
        DO UPDATE SET 
          milestones_completed = daily_user_progress.milestones_completed + 1,
          study_time_minutes = daily_user_progress.study_time_minutes + 30,
          career_path_id = COALESCE(daily_user_progress.career_path_id, $2),
          updated_at = CURRENT_TIMESTAMP
      `, [userId, careerPathId]);
      
      // 3. Update career progress history
      await this.updateCareerProgressHistory(client, userId, careerPathId);
      
      // 4. Update daily streaks
      await this.updateDailyStreaks(client, userId, 'career');
      
      await client.query('COMMIT');
      
      console.log(`Milestone completion recorded for user ${userId}, milestone ${milestoneId}`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error recording milestone completion:', error);
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }
  
  // Record coding platform progress
  static async recordCodingProgress(userId, platform, problemsSolved, contestProblems = 0) {
    let client;
    
    try {
      client = await pool.connect();
      await client.query('BEGIN');
      await this.recordCodingProgressWithClient(client, userId, platform, problemsSolved, contestProblems);
      await client.query('COMMIT');
      
      console.log(`Coding progress recorded for user ${userId}, platform ${platform}: ${problemsSolved} problems`);
      
    } catch (error) {
      if (client) await client.query('ROLLBACK');
      console.error('Error recording coding progress:', error);
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  // Record coding platform progress using existing client (avoids connection pool conflicts)
  static async recordCodingProgressWithClient(client, userId, platform, problemsSolved, contestProblems = 0) {
    try {
      // Get previous day's stats to calculate daily increase
      const previousStats = await client.query(`
        SELECT * FROM coding_platform_history 
        WHERE user_id = $1 AND record_date < CURRENT_DATE
        ORDER BY record_date DESC LIMIT 1
      `, [userId]);
      
      const prevStats = previousStats.rows[0] || {};
      
      // Calculate daily increases
      const dailyIncrease = {
        leetcode: platform === 'leetcode' ? problemsSolved - (prevStats.leetcode_total_solved || 0) : 0,
        codechef: platform === 'codechef' ? problemsSolved - (prevStats.codechef_total_solved || 0) : 0,
        codeforces: platform === 'codeforces' ? problemsSolved - (prevStats.codeforces_total_solved || 0) : 0
      };
      
      // Update coding platform history
      const updateFields = {
        leetcode: 'leetcode_total_solved = $3, daily_leetcode_solved = $4',
        codechef: 'codechef_total_solved = $3, daily_codechef_solved = $4, codechef_contest_problems = $5',
        codeforces: 'codeforces_total_solved = $3, daily_codeforces_solved = $4, codeforces_contest_solved = $5'
      };
      
      const params = [userId, platform === 'leetcode' ? problemsSolved : prevStats.leetcode_total_solved || 0];
      if (platform === 'leetcode') {
        params.push(problemsSolved, Math.max(0, dailyIncrease.leetcode));
      } else if (platform === 'codechef') {
        params.push(problemsSolved, Math.max(0, dailyIncrease.codechef), contestProblems);
      } else if (platform === 'codeforces') {
        params.push(problemsSolved, Math.max(0, dailyIncrease.codeforces), contestProblems);
      }
      
      await client.query(`
        INSERT INTO coding_platform_history (
          user_id, record_date, 
          ${platform}_total_solved, daily_${platform}_solved
          ${platform !== 'leetcode' ? `, ${platform}_contest_${platform === 'codechef' ? 'problems' : 'solved'}` : ''}
        )
        VALUES ($1, CURRENT_DATE, $2, $3${platform !== 'leetcode' ? ', $4' : ''})
        ON CONFLICT (user_id, record_date) 
        DO UPDATE SET 
          ${updateFields[platform]},
          created_at = CURRENT_TIMESTAMP
      `, params);
      
      // Update daily progress record
      const totalDaily = dailyIncrease.leetcode + dailyIncrease.codechef + dailyIncrease.codeforces;
      
      await client.query(`
        INSERT INTO daily_user_progress (
          user_id, activity_date, 
          ${platform}_problems_solved, total_problems_solved,
          ${platform === 'codeforces' ? 'codeforces_contest_problems' : platform === 'codechef' ? 'codechef_contest_problems' : 'total_contest_problems'}
        )
        VALUES ($1, CURRENT_DATE, $2, $2, $3)
        ON CONFLICT (user_id, activity_date) 
        DO UPDATE SET 
          ${platform}_problems_solved = $2,
          total_problems_solved = daily_user_progress.total_problems_solved + $2,
          ${platform === 'codeforces' ? 'codeforces_contest_problems' : platform === 'codechef' ? 'codechef_contest_problems' : 'total_contest_problems'} = $3,
          updated_at = CURRENT_TIMESTAMP
      `, [userId, Math.max(0, totalDaily), contestProblems]);
      
      // Update daily streaks
      await this.updateDailyStreaks(client, userId, platform);
      
    } catch (error) {
      console.error('Error recording coding progress with client:', error);
      throw error;
    }
  }
  
  // Update career progress history
  static async updateCareerProgressHistory(client, userId, careerPathId) {
    const progressData = await client.query(`
      SELECT 
        COUNT(m.id) as total_milestones,
        COUNT(CASE WHEN m.completed = true THEN 1 END) as completed_milestones
      FROM milestones m
      WHERE m.career_path_id = $1
    `, [careerPathId]);
    
    const { total_milestones, completed_milestones } = progressData.rows[0];
    const progressPercentage = total_milestones > 0 ? (completed_milestones * 100.0 / total_milestones) : 0;
    
    await client.query(`
      INSERT INTO user_career_progress_history (
        user_id, career_path_id, progress_date,
        total_milestones, completed_milestones, progress_percentage,
        daily_study_minutes
      )
      VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, 30)
      ON CONFLICT (user_id, career_path_id, progress_date) 
      DO UPDATE SET 
        completed_milestones = $4,
        progress_percentage = $5,
        daily_study_minutes = user_career_progress_history.daily_study_minutes + 30,
        created_at = CURRENT_TIMESTAMP
    `, [userId, careerPathId, total_milestones, completed_milestones, progressPercentage]);
  }
  
  // Update daily streaks
  static async updateDailyStreaks(client, userId, activityType) {
    // Get yesterday's streak data
    const yesterdayStreak = await client.query(`
      SELECT * FROM user_daily_streaks_detailed 
      WHERE user_id = $1 AND streak_date = CURRENT_DATE - INTERVAL '1 day'
    `, [userId]);
    
    const prevStreak = yesterdayStreak.rows[0] || {};
    
    // Calculate new streaks
    const streakUpdates = {
      had_any_activity: true,
      overall_learning_streak: (prevStreak.overall_learning_streak || 0) + 1
    };
    
    if (activityType === 'career') {
      streakUpdates.had_career_activity = true;
      streakUpdates.career_milestone_streak = (prevStreak.career_milestone_streak || 0) + 1;
    } else {
      streakUpdates[`had_${activityType}_activity`] = true;
      streakUpdates[`${activityType}_streak`] = (prevStreak[`${activityType}_streak`] || 0) + 1;
      streakUpdates.coding_platforms_streak = Math.max(
        prevStreak.coding_platforms_streak || 0,
        streakUpdates[`${activityType}_streak`]
      );
    }
    
    // Insert or update today's streak record
    const updateFields = Object.keys(streakUpdates).map(key => `${key} = $${Object.keys(streakUpdates).indexOf(key) + 2}`).join(', ');
    const values = [userId, ...Object.values(streakUpdates)];
    
    await client.query(`
      INSERT INTO user_daily_streaks_detailed (user_id, streak_date, ${Object.keys(streakUpdates).join(', ')})
      VALUES ($1, CURRENT_DATE, ${Object.keys(streakUpdates).map((_, i) => `$${i + 2}`).join(', ')})
      ON CONFLICT (user_id, streak_date) 
      DO UPDATE SET ${updateFields}, created_at = CURRENT_TIMESTAMP
    `, values);
  }
  
  // Get user's current learning progress summary
  static async getUserProgressSummary(userId) {
    let client;
    
    try {
      client = await pool.connect();
      
      const summary = await client.query(`
        SELECT 
          dp.activity_date,
          dp.milestones_completed,
          dp.study_time_minutes,
          dp.total_problems_solved,
          dp.total_contest_problems,
          cp.name as career_path_name,
          cp.progress as career_progress,
          ds.overall_learning_streak,
          ds.coding_platforms_streak,
          ds.career_milestone_streak
        FROM daily_user_progress dp
        LEFT JOIN career_paths cp ON dp.career_path_id = cp.id
        LEFT JOIN user_daily_streaks ds ON dp.user_id = ds.user_id AND dp.activity_date = ds.streak_date
        WHERE dp.user_id = $1 AND dp.activity_date = CURRENT_DATE
      `, [userId]);
      
      return summary.rows[0] || null;
      
    } catch (error) {
      console.error('Error getting user progress summary:', error);
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }
  
  // Get user's learning streak data
  static async getUserStreaks(userId) {
    let client;
    
    try {
      client = await pool.connect();
      
      const streaks = await client.query(`
        SELECT 
          overall_learning_streak,
          coding_platforms_streak,
          career_milestone_streak,
          leetcode_streak,
          codechef_streak,
          codeforces_streak
        FROM user_daily_streaks_detailed 
        WHERE user_id = $1 AND streak_date = CURRENT_DATE
      `, [userId]);
      
      return streaks.rows[0] || {
        overall_learning_streak: 0,
        coding_platforms_streak: 0,
        career_milestone_streak: 0,
        leetcode_streak: 0,
        codechef_streak: 0,
        codeforces_streak: 0
      };
      
    } catch (error) {
      console.error('Error getting user streaks:', error);
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }
}

export default DailyProgressTracker;
