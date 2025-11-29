import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateRequest, goalsSchema } from '../middleware/validation.js';

const router = express.Router();

// Set or update user goals
router.post('/', authenticateToken, validateRequest(goalsSchema), async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.userId;
    const { monthly_coding_goal, daily_study_goal_minutes } = req.body;
    
    // Use UPSERT (INSERT ... ON CONFLICT) to handle both create and update
    const query = `
      INSERT INTO user_goals (user_id, monthly_coding_goal, daily_study_goal_minutes)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        monthly_coding_goal = COALESCE($2, user_goals.monthly_coding_goal),
        daily_study_goal_minutes = COALESCE($3, user_goals.daily_study_goal_minutes)
      RETURNING *
    `;
    
    const result = await client.query(query, [userId, monthly_coding_goal, daily_study_goal_minutes]);
    const updatedGoals = result.rows[0];
    
    res.json({
      status: 'success',
      message: 'Goals updated successfully',
      data: {
        monthlyCodingGoal: updatedGoals.monthly_coding_goal,
        dailyStudyGoalMinutes: updatedGoals.daily_study_goal_minutes
      }
    });
    
  } catch (error) {
    console.error('Goals update error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
});

// Get user goals
router.get('/', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.userId;
    
    const query = 'SELECT * FROM user_goals WHERE user_id = $1';
    const result = await client.query(query, [userId]);
    
    const goals = result.rows[0] || {
      monthly_coding_goal: 50,
      daily_study_goal_minutes: 60
    };
    
    res.json({
      status: 'success',
      data: {
        monthlyCodingGoal: goals.monthly_coding_goal,
        dailyStudyGoalMinutes: goals.daily_study_goal_minutes
      }
    });
    
  } catch (error) {
    console.error('Get goals error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
});

export default router;
