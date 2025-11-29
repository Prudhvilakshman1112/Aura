import express from 'express';
import { pool } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { calculateMonthlyProgressWithClient } from '../services/calculations.js';

const router = express.Router();

// Get dashboard data
router.get('/', authenticateToken, async (req, res) => {
  let client;
  
  try {
    const userId = req.user.userId;
    client = await pool.connect();
    
    // Get user name
    const userQuery = 'SELECT name FROM users WHERE id = $1';
    const userResult = await client.query(userQuery, [userId]);
    const userName = userResult.rows[0]?.name || 'User';
    
    // Get coding stats
    const statsQuery = `
      SELECT leetcode_solved, codechef_solved, codeforces_solved, 
             codeforces_contest_solved, codechef_contests_participated, 
             current_streak, last_updated
      FROM coding_stats 
      WHERE user_id = $1
    `;
    
    const statsResult = await client.query(statsQuery, [userId]);
    const codingStats = statsResult.rows[0] || {
      leetcode_solved: 0,
      codechef_solved: 0,
      codeforces_solved: 0,
      codeforces_contest_solved: 0,
      codechef_contests_participated: 0,
      current_streak: 0,
      last_updated: null
    };
    
    // Calculate total problems solved
    const totalSolved = codingStats.leetcode_solved + codingStats.codechef_solved + codingStats.codeforces_solved;
    
    // Get monthly progress
    const monthlyProgress = await calculateMonthlyProgressWithClient(client, userId);
    
    // Calculate career percentage (assuming 1000 problems as a career milestone)
    const careerGoal = 1000;
    const careerPercentage = Math.min(Math.round((totalSolved / careerGoal) * 100), 100);
    
    // Get recent activity (last 7 days)
    const recentActivityQuery = `
      SELECT activity_date, problems_solved
      FROM daily_activity 
      WHERE user_id = $1 
      AND activity_date >= CURRENT_DATE - INTERVAL '7 days'
      ORDER BY activity_date DESC
    `;
    const recentActivityResult = await client.query(recentActivityQuery, [userId]);
    
    res.json({
      status: 'success',
      data: {
        userName,
        codingStats: {
          leetcode: codingStats.leetcode_solved,
          codechef: codingStats.codechef_solved,
          codeforces: codingStats.codeforces_solved,
          total: totalSolved,
          contestData: {
            codeforcesContestSolved: codingStats.codeforces_contest_solved,
            codechefContestsParticipated: codingStats.codechef_contests_participated
          },
          currentStreak: codingStats.current_streak,
          lastUpdated: codingStats.last_updated
        },
        monthlyProgress: {
          current: monthlyProgress.current,
          goal: monthlyProgress.goal,
          percentage: monthlyProgress.percentage
        },
        careerPercentage,
        recentActivity: recentActivityResult.rows.map(row => ({
          date: row.activity_date,
          problemsSolved: row.problems_solved
        }))
      }
    });
    
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

export default router;
