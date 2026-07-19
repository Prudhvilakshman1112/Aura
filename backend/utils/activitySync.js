import { pool } from '../config/database.js';

/**
 * Enhanced Activity Sync Utility
 * Syncs daily activity from various sources like coding stats, career progress, etc.
 * Tracks real-time daily contributions and updates monthly goal progress
 */

export class ActivitySyncService {
  
  /**
   * Sync coding stats to daily activity with real-time tracking
   */
  static async syncCodingStats(userId) {
    const client = await pool.connect();
    
    try {
      console.log(`🔄 Syncing coding stats for user ${userId}`);
      
      await client.query('BEGIN');
      
      // Get current coding stats
      const statsResult = await client.query(
        'SELECT leetcode_solved, codechef_solved, codeforces_solved FROM coding_stats WHERE user_id = $1',
        [userId]
      );
      
      if (statsResult.rows.length === 0) {
        console.log(`No coding stats found for user ${userId}`);
        await client.query('COMMIT');
        return { success: false, message: 'No coding stats found' };
      }
      
      const currentStats = statsResult.rows[0];
      
      // Get baseline stats from beginning of current month
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      
      const baselineResult = await client.query(`
        SELECT leetcode_solved, codechef_solved, codeforces_solved 
        FROM coding_platform_history 
        WHERE user_id = $1 AND recorded_date <= $2
        ORDER BY recorded_date DESC 
        LIMIT 1
      `, [userId, monthStart.toISOString().split('T')[0]]);
      
      let monthlyProgress = {
        leetcode: currentStats.leetcode_solved,
        codechef: currentStats.codechef_solved,
        codeforces: currentStats.codeforces_solved
      };
      
      // If we have baseline data, calculate monthly progress
      if (baselineResult.rows.length > 0) {
        const baselineStats = baselineResult.rows[0];
        monthlyProgress = {
          leetcode: Math.max(0, currentStats.leetcode_solved - baselineStats.leetcode_solved),
          codechef: Math.max(0, currentStats.codechef_solved - baselineStats.codechef_solved),
          codeforces: Math.max(0, currentStats.codeforces_solved - baselineStats.codeforces_solved)
        };
      }
      
      // Get previous day's daily activity to calculate today's increment
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const yesterdayActivityResult = await client.query(
        'SELECT leetcode_solved, codechef_solved, codeforces_solved FROM daily_activity_tracking WHERE user_id = $1 AND activity_date = $2',
        [userId, yesterday.toISOString().split('T')[0]]
      );
      
      let dailyIncrements = monthlyProgress; // Default to monthly progress if no previous day
      
      // Calculate today's increments based on yesterday's daily activity
      if (yesterdayActivityResult.rows.length > 0) {
        const yesterdayActivity = yesterdayActivityResult.rows[0];
        dailyIncrements = {
          leetcode: Math.max(0, monthlyProgress.leetcode - yesterdayActivity.leetcode_solved),
          codechef: Math.max(0, monthlyProgress.codechef - yesterdayActivity.codechef_solved),
          codeforces: Math.max(0, monthlyProgress.codeforces - yesterdayActivity.codeforces_solved)
        };
      }
      
      // Insert/Update today's platform history
      const today = new Date().toISOString().split('T')[0];
      await client.query(`
        INSERT INTO coding_platform_history (user_id, recorded_date, leetcode_solved, codechef_solved, codeforces_solved)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, recorded_date) 
        DO UPDATE SET 
          leetcode_solved = EXCLUDED.leetcode_solved,
          codechef_solved = EXCLUDED.codechef_solved,
          codeforces_solved = EXCLUDED.codeforces_solved,
          updated_at = CURRENT_TIMESTAMP
      `, [userId, today, currentStats.leetcode_solved, currentStats.codechef_solved, currentStats.codeforces_solved]);
      
      // Insert/Update daily activity tracking with monthly cumulative progress
      await client.query(`
        INSERT INTO daily_activity_tracking (
          user_id, activity_date, leetcode_solved, codechef_solved, codeforces_solved,
          total_problems_solved
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_id, activity_date)
        DO UPDATE SET
          leetcode_solved = EXCLUDED.leetcode_solved,
          codechef_solved = EXCLUDED.codechef_solved,
          codeforces_solved = EXCLUDED.codeforces_solved,
          total_problems_solved = EXCLUDED.total_problems_solved,
          updated_at = CURRENT_TIMESTAMP
      `, [
        userId, 
        today, 
        monthlyProgress.leetcode,  // Store cumulative monthly progress
        monthlyProgress.codechef,
        monthlyProgress.codeforces,
        monthlyProgress.leetcode + monthlyProgress.codechef + monthlyProgress.codeforces
      ]);
      
      await client.query('COMMIT');
      return { 
        success: true, 
        monthlyProgress,
        dailyIncrements,
        message: 'Coding stats synced successfully with monthly tracking'
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error syncing coding stats:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Sync career milestone progress to daily activity with module tracking
   */
  static async syncCareerProgress(userId) {
    const client = await pool.connect();
    
    try {
      console.log(`🔄 Syncing career progress for user ${userId}`);
      
      await client.query('BEGIN');
      
      const today = new Date().toISOString().split('T')[0];
      
      // Get completed milestones for today from user milestone completions
      const milestoneQuery = `
        SELECT COUNT(*) as completed_today,
               SUM(CASE WHEN DATE(umc.completed_at) = $2 THEN 1 ELSE 0 END) as today_completions
        FROM user_milestone_completions umc
        WHERE umc.user_id = $1 AND DATE(umc.completed_at) = $2
      `;
      
      const milestoneResult = await client.query(milestoneQuery, [userId, today]);
      const milestonesCompleted = parseInt(milestoneResult.rows[0]?.today_completions || 0);
      
      // Get completed modules for today
      const moduleQuery = `
        SELECT COUNT(*) as modules_completed_today
        FROM user_module_progress ump
        WHERE ump.user_id = $1 
          AND ump.completed = true 
          AND DATE(ump.completed_at) = $2
      `;
      
      const moduleResult = await client.query(moduleQuery, [userId, today]);
      const modulesCompleted = parseInt(moduleResult.rows[0]?.modules_completed_today || 0);
      
      if (milestonesCompleted > 0 || modulesCompleted > 0) {
        // Update career progress history
        const historyQuery = `
          INSERT INTO user_career_progress_history (
            user_id, career_path_id, progress_date, completed_milestones, daily_study_minutes
          )
          SELECT $1, ucp.roadmap_id, $2, $3, 0
          FROM user_career_paths ucp
          WHERE ucp.user_id = $1 AND ucp.is_active = true
          ON CONFLICT (user_id, career_path_id, progress_date)
          DO UPDATE SET
            completed_milestones = GREATEST(user_career_progress_history.completed_milestones, EXCLUDED.completed_milestones)
        `;
        
        await client.query(historyQuery, [userId, today, milestonesCompleted]);
        
        // Update today's daily activity tracking
        const updateQuery = `
          INSERT INTO daily_activity_tracking (
            user_id, activity_date, career_milestones_completed
          ) VALUES ($1, $2, $3)
          ON CONFLICT (user_id, activity_date)
          DO UPDATE SET
            career_milestones_completed = GREATEST(
              daily_activity_tracking.career_milestones_completed, 
              EXCLUDED.career_milestones_completed
            ),
            updated_at = CURRENT_TIMESTAMP
          RETURNING *
        `;
        
        const updateResult = await client.query(updateQuery, [userId, today, milestonesCompleted + modulesCompleted]);
        
        await client.query('COMMIT');
        
        console.log(`✅ Synced career progress for user ${userId}:`, {
          milestones: milestonesCompleted,
          modules: modulesCompleted,
          total: milestonesCompleted + modulesCompleted
        });
        
        return updateResult.rows[0];
      } else {
        await client.query('ROLLBACK');
        console.log(`ℹ️ No career progress completed today for user ${userId}`);
        return null;
      }
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error syncing career progress:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Sync all activity sources for a user and update streaks
   */
  static async syncAllActivity(userId) {
    try {
      console.log(`🔄 Starting full activity sync for user ${userId}`);
      
      const results = await Promise.allSettled([
        this.syncCodingStats(userId),
        this.syncCareerProgress(userId),
        this.updateStreakTracking(userId)
      ]);
      
      const syncResults = {
        codingStats: results[0].status === 'fulfilled' ? results[0].value : null,
        careerProgress: results[1].status === 'fulfilled' ? results[1].value : null,
        streakTracking: results[2].status === 'fulfilled' ? results[2].value : null,
        errors: results.filter(r => r.status === 'rejected').map(r => r.reason)
      };
      
      console.log(`✅ Completed full activity sync for user ${userId}:`, syncResults);
      return syncResults;
      
    } catch (error) {
      console.error('❌ Error in full activity sync:', error);
      throw error;
    }
  }
  
  /**
   * Update streak tracking for a user
   */
  static async updateStreakTracking(userId) {
    const client = await pool.connect();
    
    try {
      console.log(`🔄 Updating streak tracking for user ${userId}`);
      
      await client.query('BEGIN');
      
      const today = new Date().toISOString().split('T')[0];
      
      // Calculate streaks based on recent activity
      const streakQuery = `
        WITH recent_activity AS (
          SELECT 
            activity_date,
            CASE WHEN leetcode_solved > 0 THEN 1 ELSE 0 END as had_leetcode,
            CASE WHEN codechef_solved > 0 THEN 1 ELSE 0 END as had_codechef,
            CASE WHEN codeforces_solved > 0 THEN 1 ELSE 0 END as had_codeforces,
            CASE WHEN career_milestones_completed > 0 THEN 1 ELSE 0 END as had_career,
            CASE WHEN study_minutes > 0 THEN 1 ELSE 0 END as had_study,
            CASE WHEN (leetcode_solved + codechef_solved + codeforces_solved + career_milestones_completed + study_minutes) > 0 THEN 1 ELSE 0 END as had_any
          FROM daily_activity_tracking
          WHERE user_id = $1 AND activity_date >= CURRENT_DATE - INTERVAL '30 days'
          ORDER BY activity_date DESC
        ),
        streak_calc AS (
          SELECT 
            COUNT(*) FILTER (WHERE had_any = 1 AND activity_date <= $2) as overall_streak,
            COUNT(*) FILTER (WHERE (had_leetcode + had_codechef + had_codeforces) > 0 AND activity_date <= $2) as coding_streak,
            COUNT(*) FILTER (WHERE had_leetcode = 1 AND activity_date <= $2) as leetcode_streak,
            COUNT(*) FILTER (WHERE had_codechef = 1 AND activity_date <= $2) as codechef_streak,
            COUNT(*) FILTER (WHERE had_codeforces = 1 AND activity_date <= $2) as codeforces_streak,
            COUNT(*) FILTER (WHERE had_career = 1 AND activity_date <= $2) as career_streak,
            COUNT(*) FILTER (WHERE had_study = 1 AND activity_date <= $2) as study_streak
          FROM recent_activity
        )
        SELECT * FROM streak_calc
      `;
      
      const streakResult = await client.query(streakQuery, [userId, today]);
      const streaks = streakResult.rows[0] || {};
      
      // Get today's activity flags
      const todayActivityQuery = `
        SELECT 
          leetcode_solved > 0 as had_leetcode_activity,
          codechef_solved > 0 as had_codechef_activity,
          codeforces_solved > 0 as had_codeforces_activity,
          career_milestones_completed > 0 as had_career_activity,
          study_minutes > 0 as had_study_activity,
          (leetcode_solved + codechef_solved + codeforces_solved + career_milestones_completed + study_minutes) > 0 as had_any_activity
        FROM daily_activity_tracking
        WHERE user_id = $1 AND activity_date = $2
      `;
      
      const todayResult = await client.query(todayActivityQuery, [userId, today]);
      const todayActivity = todayResult.rows[0] || {
        had_leetcode_activity: false,
        had_codechef_activity: false,
        had_codeforces_activity: false,
        had_career_activity: false,
        had_study_activity: false,
        had_any_activity: false
      };
      
      // Update streak tracking
      const updateStreakQuery = `
        INSERT INTO user_streak_tracking (
          user_id, streak_date, leetcode_streak, codechef_streak, codeforces_streak,
          career_streak, study_streak, coding_streak, overall_streak,
          had_leetcode_activity, had_codechef_activity, had_codeforces_activity,
          had_career_activity, had_study_activity, had_any_activity
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (user_id, streak_date)
        DO UPDATE SET
          leetcode_streak = EXCLUDED.leetcode_streak,
          codechef_streak = EXCLUDED.codechef_streak,
          codeforces_streak = EXCLUDED.codeforces_streak,
          career_streak = EXCLUDED.career_streak,
          study_streak = EXCLUDED.study_streak,
          coding_streak = EXCLUDED.coding_streak,
          overall_streak = EXCLUDED.overall_streak,
          had_leetcode_activity = EXCLUDED.had_leetcode_activity,
          had_codechef_activity = EXCLUDED.had_codechef_activity,
          had_codeforces_activity = EXCLUDED.had_codeforces_activity,
          had_career_activity = EXCLUDED.had_career_activity,
          had_study_activity = EXCLUDED.had_study_activity,
          had_any_activity = EXCLUDED.had_any_activity
        RETURNING *
      `;
      
      const updateResult = await client.query(updateStreakQuery, [
        userId, today,
        streaks.leetcode_streak || 0,
        streaks.codechef_streak || 0,
        streaks.codeforces_streak || 0,
        streaks.career_streak || 0,
        streaks.study_streak || 0,
        streaks.coding_streak || 0,
        streaks.overall_streak || 0,
        todayActivity.had_leetcode_activity,
        todayActivity.had_codechef_activity,
        todayActivity.had_codeforces_activity,
        todayActivity.had_career_activity,
        todayActivity.had_study_activity,
        todayActivity.had_any_activity
      ]);
      
      await client.query('COMMIT');
      
      console.log(`✅ Updated streak tracking for user ${userId}:`, updateResult.rows[0]);
      return updateResult.rows[0];
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error updating streak tracking:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Schedule automatic sync for all active users
   */
  static async scheduleAutoSync() {
    const client = await pool.connect();
    
    try {
      console.log('🔄 Starting scheduled auto-sync for all users');
      
      // Get all users who have been active in the last 7 days
      const activeUsersQuery = `
        SELECT DISTINCT u.id
        FROM users u
        LEFT JOIN daily_activity_tracking dat ON u.id = dat.user_id
        WHERE dat.activity_date >= CURRENT_DATE - INTERVAL '7 days'
           OR u.created_at >= CURRENT_DATE - INTERVAL '7 days'
      `;
      
      const activeUsersResult = await client.query(activeUsersQuery);
      const activeUsers = activeUsersResult.rows;
      
      console.log(`📊 Found ${activeUsers.length} active users for auto-sync`);
      
      // Sync activity for each active user
      const syncPromises = activeUsers.map(user => 
        this.syncAllActivity(user.id).catch(error => {
          console.error(`❌ Failed to sync user ${user.id}:`, error);
          return { userId: user.id, error: error.message };
        })
      );
      
      const results = await Promise.all(syncPromises);
      
      console.log('✅ Completed scheduled auto-sync for all users');
      return results;
      
    } catch (error) {
      console.error('❌ Error in scheduled auto-sync:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

// Export individual functions for backward compatibility
export const syncCodingStats = ActivitySyncService.syncCodingStats.bind(ActivitySyncService);
export const syncCareerProgress = ActivitySyncService.syncCareerProgress.bind(ActivitySyncService);
export const syncAllActivity = ActivitySyncService.syncAllActivity.bind(ActivitySyncService);
export const updateStreakTracking = ActivitySyncService.updateStreakTracking.bind(ActivitySyncService);
export const scheduleAutoSync = ActivitySyncService.scheduleAutoSync.bind(ActivitySyncService);
