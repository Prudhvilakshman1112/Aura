import express from 'express';
import { z } from 'zod';
import { pool } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { ActivitySyncService } from '../utils/activitySync.js';

const router = express.Router();

// Validation schemas
const monthlyGoalSchema = z.object({
  month: z.number().min(1).max(12),
  year: z.number().min(2020).max(2030),
  daily_study_minutes: z.number().min(0).optional(),
  leetcode_problems: z.number().min(0).optional(),
  codechef_problems: z.number().min(0).optional(),
  codeforces_problems: z.number().min(0).optional(),
  contest_participation: z.number().min(0).optional(),
  career_milestones: z.number().min(0).optional()
});

const dailyActivitySchema = z.object({
  activity_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  study_minutes: z.number().min(0).optional(),
  leetcode_solved: z.number().min(0).optional(),
  codechef_solved: z.number().min(0).optional(),
  codeforces_solved: z.number().min(0).optional(),
  contests_participated: z.number().min(0).optional(),
  career_milestones_completed: z.number().min(0).optional()
});

// Middleware for request validation
const validateRequest = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    console.error('Validation error:', error);
    res.status(400).json({
      status: 'error',
      message: 'Invalid request data',
      errors: error.errors
    });
  }
};

// GET /api/activity/goals/:year/:month - Get monthly goals
router.get('/goals/:year/:month', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.userId;
    const { year, month } = req.params;
    
    console.log(`Fetching monthly goals for user ${userId}, ${year}-${month}`);
    
    const query = `
      SELECT * FROM monthly_goals 
      WHERE user_id = $1 AND year = $2 AND month = $3
    `;
    
    const result = await client.query(query, [userId, parseInt(year), parseInt(month)]);
    
    if (result.rows.length === 0) {
      // Return default goals if none exist
      res.json({
        status: 'success',
        data: {
          user_id: userId,
          year: parseInt(year),
          month: parseInt(month),
          daily_study_minutes: 0,
          leetcode_problems: 0,
          codechef_problems: 0,
          codeforces_problems: 0,
          contest_participation: 0,
          career_milestones: 0
        }
      });
    } else {
      res.json({
        status: 'success',
        data: result.rows[0]
      });
    }
    
  } catch (error) {
    console.error('Get monthly goals error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
});

// PUT /api/activity/goals - Set/Update monthly goals
router.put('/goals', authenticateToken, validateRequest(monthlyGoalSchema), async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.userId;
    const goalData = req.body;
    
    console.log(`Setting monthly goals for user ${userId}:`, goalData);
    
    const query = `
      INSERT INTO monthly_goals (
        user_id, month, year, daily_study_minutes, leetcode_problems,
        codechef_problems, codeforces_problems, contest_participation, career_milestones
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (user_id, month, year)
      DO UPDATE SET
        daily_study_minutes = EXCLUDED.daily_study_minutes,
        leetcode_problems = EXCLUDED.leetcode_problems,
        codechef_problems = EXCLUDED.codechef_problems,
        codeforces_problems = EXCLUDED.codeforces_problems,
        contest_participation = EXCLUDED.contest_participation,
        career_milestones = EXCLUDED.career_milestones,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const values = [
      userId,
      goalData.month,
      goalData.year,
      goalData.daily_study_minutes || 0,
      goalData.leetcode_problems || 0,
      goalData.codechef_problems || 0,
      goalData.codeforces_problems || 0,
      goalData.contest_participation || 0,
      goalData.career_milestones || 0
    ];
    
    const result = await client.query(query, values);
    
    res.json({
      status: 'success',
      message: 'Monthly goals updated successfully',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Set monthly goals error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
});

// GET /api/activity/daily/:date - Get daily activity
router.get('/daily/:date', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.userId;
    const { date } = req.params;
    
    console.log(`Fetching daily activity for user ${userId}, date ${date}`);
    
    const query = `
      SELECT * FROM daily_activity_tracking 
      WHERE user_id = $1 AND activity_date = $2
    `;
    
    const result = await client.query(query, [userId, date]);
    
    if (result.rows.length === 0) {
      // Return default activity if none exists
      res.json({
        status: 'success',
        data: {
          user_id: userId,
          activity_date: date,
          study_minutes: 0,
          leetcode_solved: 0,
          codechef_solved: 0,
          codeforces_solved: 0,
          contests_participated: 0,
          career_milestones_completed: 0
        }
      });
    } else {
      res.json({
        status: 'success',
        data: result.rows[0]
      });
    }
    
  } catch (error) {
    console.error('Get daily activity error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
});

// PUT /api/activity/daily - Update daily activity
router.put('/daily', authenticateToken, validateRequest(dailyActivitySchema), async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.userId;
    const activityData = req.body;
    
    console.log(`Updating daily activity for user ${userId}:`, activityData);
    
    const query = `
      INSERT INTO daily_activity_tracking (
        user_id, activity_date, study_minutes, leetcode_solved,
        codechef_solved, codeforces_solved, contests_participated, career_milestones_completed
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_id, activity_date)
      DO UPDATE SET
        study_minutes = EXCLUDED.study_minutes,
        leetcode_solved = EXCLUDED.leetcode_solved,
        codechef_solved = EXCLUDED.codechef_solved,
        codeforces_solved = EXCLUDED.codeforces_solved,
        contests_participated = EXCLUDED.contests_participated,
        career_milestones_completed = EXCLUDED.career_milestones_completed,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const values = [
      userId,
      activityData.activity_date,
      activityData.study_minutes || 0,
      activityData.leetcode_solved || 0,
      activityData.codechef_solved || 0,
      activityData.codeforces_solved || 0,
      activityData.contests_participated || 0,
      activityData.career_milestones_completed || 0
    ];
    
    const result = await client.query(query, values);
    
    res.json({
      status: 'success',
      message: 'Daily activity updated successfully',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Update daily activity error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
});

// GET /api/activity/progress/:year/:month - Get monthly progress summary
router.get('/progress/:year/:month', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.userId;
    const { year, month } = req.params;
    
    console.log(`Fetching monthly progress for user ${userId}, ${year}-${month}`);
    
    const query = `
      SELECT 
        mps.*,
        mg.daily_study_minutes as goal_daily_study_minutes,
        mg.leetcode_problems as goal_leetcode_problems,
        mg.codechef_problems as goal_codechef_problems,
        mg.codeforces_problems as goal_codeforces_problems,
        mg.contest_participation as goal_contest_participation,
        mg.career_milestones as goal_career_milestones
      FROM monthly_progress_summary mps
      LEFT JOIN monthly_goals mg ON (
        mps.user_id = mg.user_id AND 
        mps.month = mg.month AND 
        mps.year = mg.year
      )
      WHERE mps.user_id = $1 AND mps.year = $2 AND mps.month = $3
    `;
    
    const result = await client.query(query, [userId, parseInt(year), parseInt(month)]);
    
    if (result.rows.length === 0) {
      // Return default progress if none exists
      res.json({
        status: 'success',
        data: {
          user_id: userId,
          year: parseInt(year),
          month: parseInt(month),
          total_study_minutes: 0,
          total_leetcode_solved: 0,
          total_codechef_solved: 0,
          total_codeforces_solved: 0,
          total_contests_participated: 0,
          total_career_milestones: 0,
          study_progress_percent: 0,
          leetcode_progress_percent: 0,
          codechef_progress_percent: 0,
          codeforces_progress_percent: 0,
          contest_progress_percent: 0,
          career_progress_percent: 0
        }
      });
    } else {
      res.json({
        status: 'success',
        data: result.rows[0]
      });
    }
    
  } catch (error) {
    console.error('Get monthly progress error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
});

// GET /api/activity/monthly-range/:year/:month - Get daily activities for entire month
router.get('/monthly-range/:year/:month', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.userId;
    const { year, month } = req.params;
    
    console.log(`Fetching monthly activity range for user ${userId}, ${year}-${month}`);
    
    const query = `
      SELECT * FROM daily_activity_tracking 
      WHERE user_id = $1 
        AND EXTRACT(YEAR FROM activity_date) = $2 
        AND EXTRACT(MONTH FROM activity_date) = $3
      ORDER BY activity_date ASC
    `;
    
    const result = await client.query(query, [userId, parseInt(year), parseInt(month)]);
    
    res.json({
      status: 'success',
      data: result.rows
    });
    
  } catch (error) {
    console.error('Get monthly activity range error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
});

// POST /api/activity/sync-coding - Sync only coding stats
router.post('/sync-coding', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    console.log(`Syncing coding stats for user ${userId}`);
    
    const result = await ActivitySyncService.syncCodingStats(userId);
    
    res.json({
      success: true,
      message: 'Coding stats synced successfully',
      data: result
    });
  } catch (error) {
    console.error('Error syncing coding stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync coding stats',
      error: error.message
    });
  }
});

// POST /api/activity/sync-career - Sync career progress
router.post('/sync-career', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    console.log(`Syncing career progress for user ${userId}`);
    
    const result = await ActivitySyncService.syncCareerProgress(userId);
    
    res.json({
      status: 'success',
      message: 'Career progress synced successfully',
      data: result
    });
    
  } catch (error) {
    console.error('Sync career progress error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// POST /api/activity/sync-from-stats - Sync activity with real-time web scraping
router.post('/sync-from-stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    console.log(`🚀 Starting real-time web scraping for user ${userId}`);
    
    // Get user profile to fetch platform handles
    const userProfileResult = await pool.query(
      'SELECT leetcode_handle, codechef_handle, codeforces_handle FROM user_profiles WHERE user_id = $1',
      [userId]
    );
    
    if (userProfileResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User profile not found. Please update your platform handles.'
      });
    }
    
    const { leetcode_handle, codechef_handle, codeforces_handle } = userProfileResult.rows[0];
    
    // Trigger real-time monthly web scraping for fresh data
    console.log('🔄 Triggering real-time monthly web scraping...');
    const scrapingResponse = await fetch(`${process.env.API_BASE_URL || 'http://localhost:3001'}/api/scrape/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization
      },
      body: JSON.stringify({ monthlyOnly: true })
    });
    
    const scrapingResult = await scrapingResponse.json();
    console.log('📊 Monthly scraping result:', scrapingResult);
    
    // Wait for scraping data to be processed
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Now sync the activity with the latest scraped data
    const syncResults = await ActivitySyncService.syncAllActivity(userId);
    
    // Get updated monthly progress after scraping
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    
    const currentStatsResult = await pool.query(
      'SELECT leetcode_solved, codechef_solved, codeforces_solved FROM coding_stats WHERE user_id = $1',
      [userId]
    );
    
    const baselineResult = await pool.query(`
      SELECT leetcode_solved, codechef_solved, codeforces_solved 
      FROM coding_platform_history 
      WHERE user_id = $1 AND recorded_date <= $2
      ORDER BY recorded_date DESC 
      LIMIT 1
    `, [userId, monthStart.toISOString().split('T')[0]]);
    
    let monthlyProgress = { leetcode: 0, codechef: 0, codeforces: 0 };
    
    if (currentStatsResult.rows.length > 0) {
      const currentStats = currentStatsResult.rows[0];
      
      if (baselineResult.rows.length > 0) {
        const baseline = baselineResult.rows[0];
        monthlyProgress = {
          leetcode: Math.max(0, currentStats.leetcode_solved - baseline.leetcode_solved),
          codechef: Math.max(0, currentStats.codechef_solved - baseline.codechef_solved),
          codeforces: Math.max(0, currentStats.codeforces_solved - baseline.codeforces_solved)
        };
      } else {
        monthlyProgress = {
          leetcode: currentStats.leetcode_solved,
          codechef: currentStats.codechef_solved,
          codeforces: currentStats.codeforces_solved
        };
      }
    }
    
    console.log(`📊 Monthly progress calculated:`, monthlyProgress);
    
    res.json({
      success: true,
      message: `Live web scraping completed successfully`,
      monthlyProgress,
      scrapingResult,
      syncResults
    });
    
  } catch (error) {
    console.error('❌ Error in real-time web scraping:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform real-time web scraping',
      error: error.message
    });
  }
});

// GET /api/activity/streak/current - Get current streak for user
router.get('/streak/current', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.userId;
    const today = new Date().toISOString().split('T')[0];
    
    console.log(`Fetching current streak for user ${userId}`);
    
    const query = `
      SELECT * FROM user_streak_tracking 
      WHERE user_id = $1 AND streak_date = $2
    `;
    
    const result = await client.query(query, [userId, today]);
    
    if (result.rows.length === 0) {
      // Return default streak if none exists
      res.json({
        status: 'success',
        data: {
          user_id: userId,
          streak_date: today,
          overall_streak: 0,
          coding_streak: 0,
          leetcode_streak: 0,
          codechef_streak: 0,
          codeforces_streak: 0,
          career_streak: 0,
          study_streak: 0
        }
      });
    } else {
      res.json({
        status: 'success',
        data: result.rows[0]
      });
    }
    
  } catch (error) {
    console.error('Get current streak error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
});

// GET /api/activity/monthly-progress - Get monthly progress summary
router.get('/monthly-progress', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get current month goals
    const goalsResult = await pool.query(`
      SELECT * FROM monthly_goals 
      WHERE user_id = $1 
      AND EXTRACT(YEAR FROM month_year::date) = EXTRACT(YEAR FROM CURRENT_DATE)
      AND EXTRACT(MONTH FROM month_year::date) = EXTRACT(MONTH FROM CURRENT_DATE)
    `, [userId]);
    
    if (goalsResult.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          leetcode_progress: 0,
          codechef_progress: 0,
          codeforces_progress: 0,
          career_progress: 0,
          study_progress: 0,
          leetcode_percentage: 0,
          codechef_percentage: 0,
          codeforces_percentage: 0,
          career_percentage: 0,
          study_percentage: 0
        }
      });
    }
    
    const goals = goalsResult.rows[0];
    
    // Get baseline stats from beginning of month
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    
    const baselineResult = await pool.query(`
      SELECT leetcode_solved, codechef_solved, codeforces_solved 
      FROM coding_platform_history 
      WHERE user_id = $1 AND recorded_date <= $2
      ORDER BY recorded_date DESC 
      LIMIT 1
    `, [userId, monthStart.toISOString().split('T')[0]]);
    
    // Get current stats
    const currentStatsResult = await pool.query(`
      SELECT leetcode_solved, codechef_solved, codeforces_solved 
      FROM coding_stats 
      WHERE user_id = $1
    `, [userId]);
    
    let monthlyProgress = {
      leetcode_progress: 0,
      codechef_progress: 0,
      codeforces_progress: 0
    };
    
    if (currentStatsResult.rows.length > 0) {
      const currentStats = currentStatsResult.rows[0];
      
      if (baselineResult.rows.length > 0) {
        const baseline = baselineResult.rows[0];
        monthlyProgress = {
          leetcode_progress: Math.max(0, currentStats.leetcode_solved - baseline.leetcode_solved),
          codechef_progress: Math.max(0, currentStats.codechef_solved - baseline.codechef_solved),
          codeforces_progress: Math.max(0, currentStats.codeforces_solved - baseline.codeforces_solved)
        };
      } else {
        monthlyProgress = {
          leetcode_progress: currentStats.leetcode_solved,
          codechef_progress: currentStats.codechef_solved,
          codeforces_progress: currentStats.codeforces_solved
        };
      }
    }
    
    // Get career and study progress from daily tracking
    const activityResult = await pool.query(`
      SELECT 
        COALESCE(SUM(career_milestones_completed), 0) as career_progress,
        COALESCE(SUM(study_minutes), 0) as study_progress
      FROM daily_activity_tracking 
      WHERE user_id = $1 
        AND EXTRACT(YEAR FROM activity_date) = EXTRACT(YEAR FROM CURRENT_DATE)
        AND EXTRACT(MONTH FROM activity_date) = EXTRACT(MONTH FROM CURRENT_DATE)
    `, [userId]);
    
    const activityData = activityResult.rows[0] || { career_progress: 0, study_progress: 0 };
    
    // Calculate percentages
    const data = {
      ...monthlyProgress,
      career_progress: parseInt(activityData.career_progress),
      study_progress: parseInt(activityData.study_progress),
      leetcode_percentage: goals.leetcode_goal > 0 ? Math.round((monthlyProgress.leetcode_progress * 100) / goals.leetcode_goal) : 0,
      codechef_percentage: goals.codechef_goal > 0 ? Math.round((monthlyProgress.codechef_progress * 100) / goals.codechef_goal) : 0,
      codeforces_percentage: goals.codeforces_goal > 0 ? Math.round((monthlyProgress.codeforces_progress * 100) / goals.codeforces_goal) : 0,
      career_percentage: goals.career_milestones_goal > 0 ? Math.round((parseInt(activityData.career_progress) * 100) / goals.career_milestones_goal) : 0,
      study_percentage: goals.study_minutes_goal > 0 ? Math.round((parseInt(activityData.study_progress) * 100) / goals.study_minutes_goal) : 0
    };
    
    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Error fetching monthly progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch monthly progress'
    });
  }
});

// GET /api/activity/streak/history/:days - Get streak history for specified days
router.get('/streak/history/:days', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.userId;
    const days = parseInt(req.params.days) || 30;
    
    console.log(`Fetching ${days} days streak history for user ${userId}`);
    
    const query = `
      SELECT * FROM user_streak_tracking 
      WHERE user_id = $1 
        AND streak_date >= CURRENT_DATE - INTERVAL '${days} days'
      ORDER BY streak_date DESC
    `;
    
    const result = await client.query(query, [userId]);
    
    res.json({
      status: 'success',
      data: result.rows
    });
    
  } catch (error) {
    console.error('Get streak history error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
});

// POST /api/activity/update-streak - Manually update streak tracking
router.post('/update-streak', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    console.log(`Manually updating streak tracking for user ${userId}`);
    
    const result = await ActivitySyncService.updateStreakTracking(userId);
    
    res.json({
      status: 'success',
      message: 'Streak tracking updated successfully',
      data: result
    });
    
  } catch (error) {
    console.error('Update streak tracking error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

export default router;
