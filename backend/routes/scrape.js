import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { scrapeAllStats, scrapeMonthlyStats } from '../services/scraping.js';
import DailyProgressTracker from '../services/dailyProgressTracker.js';
import DailyTrackingService from '../services/dailyTrackingService.js';
import DailySolvedService from '../services/dailySolvedService.js';

const router = express.Router();
const dailyTracker = new DailyTrackingService();
const dailySolvedService = new DailySolvedService();

// Manual scraping update - supports both total and monthly scraping
router.post('/update', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { monthlyOnly = false } = req.body; // Parameter to indicate monthly scraping
    console.log(`🔄 Starting stats update for user ${userId}, monthlyOnly: ${monthlyOnly}`);
    
    // Get user handles from user_profiles
    const userResult = await pool.query(
      'SELECT leetcode_handle, codechef_handle, codeforces_handle FROM user_profiles WHERE user_id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    
    const userHandles = userResult.rows[0];
    console.log('📋 User handles found:', userHandles);
    
    // Check if user has at least one handle configured
    if (!userHandles.leetcode_handle && !userHandles.codechef_handle && !userHandles.codeforces_handle) {
      return res.status(400).json({
        error: 'No coding platform handles configured. Please update your profile first.'
      });
    }
    
    let stats;
    let monthRange = null;
    
    if (monthlyOnly) {
      // Get current month start and end dates for monthly scraping
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      
      console.log(`📅 Monthly scraping range: ${monthStart} to ${monthEnd}`);
      monthRange = { start: monthStart, end: monthEnd };
      
      // Use monthly scraping function
      stats = await scrapeMonthlyStats(userHandles, monthStart, monthEnd);
      console.log('📊 Monthly scraped stats:', stats);
    } else {
      // Use existing total scraping function (UNCHANGED)
      stats = await scrapeAllStats(userHandles);
      console.log('📊 Total scraped stats:', stats);
      
      // Update coding_stats table with total stats
      const updateQuery = `
        INSERT INTO coding_stats (user_id, leetcode_solved, codechef_solved, codeforces_solved, codeforces_contest_solved, codechef_contests_participated, current_streak, last_updated)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          leetcode_solved = EXCLUDED.leetcode_solved,
          codechef_solved = EXCLUDED.codechef_solved,
          codeforces_solved = EXCLUDED.codeforces_solved,
          codeforces_contest_solved = EXCLUDED.codeforces_contest_solved,
          codechef_contests_participated = EXCLUDED.codechef_contests_participated,
          current_streak = EXCLUDED.current_streak,
          last_updated = NOW()
      `;
      
      const codeforcesTotal = typeof stats.codeforces === 'object' ? stats.codeforces.totalSolved : stats.codeforces;
      const codeforcesContest = typeof stats.codeforces === 'object' ? stats.codeforces.contestSolved : 0;
      
      await pool.query(updateQuery, [
        userId,
        stats.leetcode || 0,
        stats.codechef || 0,
        codeforcesTotal || 0,
        codeforcesContest || 0,
        stats.codechef_contests || 0,
        stats.current_streak || 0
      ]);
      
      console.log('✅ Total stats updated successfully');
      
      // Update daily solved questions table
      console.log('📊 Updating daily solved questions...');
      try {
        const dailySolvedResult = await dailySolvedService.updateDailySolved(userId, {
          leetcode: stats.leetcode || 0,
          codechef: stats.codechef || 0,
          codeforces: codeforcesTotal || 0
        });
        console.log('✅ Daily solved updated:', {
          leetcode: dailySolvedResult.leetcode_solved_today,
          codechef: dailySolvedResult.codechef_solved_today,
          codeforces: dailySolvedResult.codeforces_solved_today,
          total: dailySolvedResult.total_solved_today
        });
      } catch (dailyError) {
        console.error('⚠️ Daily solved update failed but continuing:', dailyError.message);
      }
      
      // Keep existing daily tracking for backward compatibility
      console.log('📊 Triggering daily progress tracking...');
      try {
        const dailyTrackingResult = await dailyTracker.trackDailyProgress(userId, userHandles);
        console.log('✅ Daily tracking completed:', dailyTrackingResult);
      } catch (dailyError) {
        console.error('⚠️ Daily tracking failed but continuing:', dailyError.message);
      }
    }
    
    res.json({
      success: true,
      message: monthlyOnly ? 'Monthly stats scraped successfully' : 'Total stats updated successfully',
      stats: stats,
      monthRange: monthRange,
      isMonthlyData: monthlyOnly
    });
    
  } catch (error) {
    console.error('❌ Error updating stats:', error);
    res.status(500).json({ error: 'Failed to update stats', details: error.message });
  }
});

export default router;
