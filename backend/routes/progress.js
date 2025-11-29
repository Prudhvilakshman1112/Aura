import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import DailyProgressTracker from '../services/dailyProgressTracker.js';

const router = express.Router();

// Get user's daily progress summary
router.get('/daily-summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const summary = await DailyProgressTracker.getUserProgressSummary(userId);
    
    res.json({
      status: 'success',
      data: { summary }
    });
  } catch (error) {
    console.error('Error fetching daily progress summary:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch daily progress summary'
    });
  }
});

// Get user's learning streaks
router.get('/streaks', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const streaks = await DailyProgressTracker.getUserStreaks(userId);
    
    res.json({
      status: 'success',
      data: { streaks }
    });
  } catch (error) {
    console.error('Error fetching user streaks:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user streaks'
    });
  }
});

// Get detailed daily progress history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 30 } = req.query;
    
    const query = `
      SELECT 
        dp.activity_date,
        dp.milestones_completed,
        dp.study_time_minutes,
        dp.total_problems_solved,
        dp.leetcode_problems_solved,
        dp.codechef_problems_solved,
        dp.codeforces_problems_solved,
        dp.total_contest_problems,
        cp.name as career_path_name,
        ds.overall_learning_streak,
        ds.coding_platforms_streak,
        ds.career_milestone_streak
      FROM daily_user_progress dp
      LEFT JOIN career_paths cp ON dp.career_path_id = cp.id
      LEFT JOIN user_daily_streaks ds ON dp.user_id = ds.user_id AND dp.activity_date = ds.streak_date
      WHERE dp.user_id = $1 
        AND dp.activity_date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
      ORDER BY dp.activity_date DESC
    `;
    
    const result = await pool.query(query, [userId]);
    
    res.json({
      status: 'success',
      data: { history: result.rows }
    });
  } catch (error) {
    console.error('Error fetching progress history:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch progress history'
    });
  }
});

export default router;
