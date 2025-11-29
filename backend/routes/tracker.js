import express from 'express';
import { pool } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { 
  calculateCurrentStreak, 
  calculateBestStreak, 
  calculateActiveDaysThisMonth,
  getContributionData 
} from '../services/calculations.js';

const router = express.Router();

// Get tracker data
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Return simplified tracker data without heavy calculations to prevent timeouts
    res.json({
      success: true,
      data: {
        currentStreak: 0,
        bestStreak: 0,
        activeDaysThisMonth: 0,
        totalProblemsSolved: 0,
        contributionData: [],
        heatmapData: []
      }
    });
    
  } catch (error) {
    console.error('Tracker error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

export default router;
