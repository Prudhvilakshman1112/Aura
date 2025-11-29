import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import DailyTrackingService from '../services/dailyTrackingService.js';

const router = express.Router();
const dailyTracker = new DailyTrackingService();

// Track today's coding progress - calculates daily solved questions
router.post('/track-today', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log(`📊 Starting daily tracking for user ${userId}`);
    
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
    
    // Track daily progress using the new service
    const trackingResult = await dailyTracker.trackDailyProgress(userId, userHandles);
    
    if (trackingResult.success) {
      res.json({
        success: true,
        message: 'Daily progress tracked successfully',
        data: trackingResult
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to track daily progress',
        details: trackingResult.error
      });
    }
    
  } catch (error) {
    console.error('❌ Error in daily tracking:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to track daily progress', 
      details: error.message 
    });
  }
});

// Get today's progress for the authenticated user
router.get('/today', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const todayProgress = await dailyTracker.getTodayProgress(userId);
    
    if (todayProgress) {
      res.json({
        success: true,
        data: todayProgress
      });
    } else {
      res.json({
        success: true,
        data: null,
        message: 'No progress tracked for today yet'
      });
    }
    
  } catch (error) {
    console.error('❌ Error getting today\'s progress:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get today\'s progress', 
      details: error.message 
    });
  }
});

// Get daily progress within a date range
router.get('/progress', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'startDate and endDate query parameters are required (YYYY-MM-DD format)'
      });
    }
    
    const progress = await dailyTracker.getDailyProgress(userId, startDate, endDate);
    
    res.json({
      success: true,
      data: progress,
      dateRange: { startDate, endDate }
    });
    
  } catch (error) {
    console.error('❌ Error getting daily progress:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get daily progress', 
      details: error.message 
    });
  }
});

// Get current month's summary
router.get('/monthly-summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const summary = await dailyTracker.getCurrentMonthSummary(userId);
    
    res.json({
      success: true,
      data: summary
    });
    
  } catch (error) {
    console.error('❌ Error getting monthly summary:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get monthly summary', 
      details: error.message 
    });
  }
});

// Get current streak
router.get('/streak', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const streak = await dailyTracker.calculateCurrentStreak(userId);
    
    res.json({
      success: true,
      data: { currentStreak: streak }
    });
    
  } catch (error) {
    console.error('❌ Error getting streak:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get streak', 
      details: error.message 
    });
  }
});

// Get weekly summary (last 7 days)
router.get('/weekly-summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Calculate date range for last 7 days
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 6);
    const startDateStr = startDate.toISOString().split('T')[0];
    
    const weeklyProgress = await dailyTracker.getDailyProgress(userId, startDateStr, endDate);
    
    // Calculate weekly statistics
    const summary = {
      weekRange: { startDate: startDateStr, endDate },
      totalDays: 7,
      activeDays: weeklyProgress.filter(day => day.total_daily_solved > 0).length,
      totalLeetCodeSolved: weeklyProgress.reduce((sum, day) => sum + day.daily_leetcode_solved, 0),
      totalCodeChefSolved: weeklyProgress.reduce((sum, day) => sum + day.daily_codechef_solved, 0),
      totalCodeforcesSolved: weeklyProgress.reduce((sum, day) => sum + day.daily_codeforces_solved, 0),
      totalProblemsSolved: weeklyProgress.reduce((sum, day) => sum + day.total_daily_solved, 0),
      averagePerDay: weeklyProgress.length > 0 ? 
        (weeklyProgress.reduce((sum, day) => sum + day.total_daily_solved, 0) / 7).toFixed(2) : 0,
      bestDay: weeklyProgress.reduce((best, day) => 
        day.total_daily_solved > (best?.total_daily_solved || 0) ? day : best, null),
      dailyBreakdown: weeklyProgress
    };
    
    res.json({
      success: true,
      data: summary
    });
    
  } catch (error) {
    console.error('❌ Error getting weekly summary:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get weekly summary', 
      details: error.message 
    });
  }
});

// Bulk track multiple days (for backfilling or testing)
router.post('/bulk-track', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { dates } = req.body; // Array of dates to track
    
    if (!dates || !Array.isArray(dates)) {
      return res.status(400).json({
        error: 'dates array is required in request body'
      });
    }
    
    // Get user handles
    const userResult = await pool.query(
      'SELECT leetcode_handle, codechef_handle, codeforces_handle FROM user_profiles WHERE user_id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    
    const userHandles = userResult.rows[0];
    const results = [];
    
    // Track each date (note: this will use current totals for all dates)
    for (const date of dates) {
      try {
        const result = await dailyTracker.trackDailyProgress(userId, userHandles);
        results.push({ date, result });
      } catch (error) {
        results.push({ date, error: error.message });
      }
    }
    
    res.json({
      success: true,
      message: `Bulk tracking completed for ${dates.length} dates`,
      results
    });
    
  } catch (error) {
    console.error('❌ Error in bulk tracking:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to perform bulk tracking', 
      details: error.message 
    });
  }
});

export default router;
