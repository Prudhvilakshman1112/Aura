import express from 'express';
import { pool } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import AIService from '../services/aiService.js';

const router = express.Router();

// Mental Coach Chat - AI-powered mental wellness assistant with comprehensive user data access
router.post('/chat', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    console.log('🧠 Processing mental coach chat query for user:', userId);

    // Get comprehensive user data including all coding progress and mental health context
    const comprehensiveUserDataQuery = `
      WITH daily_progress AS (
        SELECT 
          user_id,
          COUNT(*) as total_active_days,
          MAX(activity_date) as last_active_date,
          SUM(problems_solved) as total_problems_today
        FROM daily_activity 
        WHERE user_id = $1 AND activity_date >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY user_id
      ),
      career_progress AS (
        SELECT 
          user_id,
          COUNT(*) as total_career_paths,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_career_paths,
          AVG(progress) as avg_career_progress
        FROM user_career_paths 
        WHERE user_id = $1
        GROUP BY user_id
      ),
      module_progress AS (
        SELECT 
          user_id,
          COUNT(*) as total_modules,
          COUNT(CASE WHEN completed = true THEN 1 END) as completed_modules,
          COUNT(CASE WHEN completed = true AND completed_at >= CURRENT_DATE THEN 1 END) as modules_completed_today
        FROM user_module_progress 
        WHERE user_id = $1
        GROUP BY user_id
      ),
      recent_milestones AS (
        SELECT 
          user_id,
          COUNT(*) as total_milestones,
          COUNT(CASE WHEN completed = true THEN 1 END) as completed_milestones,
          COUNT(CASE WHEN completed = true AND completed_at >= CURRENT_DATE THEN 1 END) as milestones_completed_today
        FROM milestones m
        JOIN career_paths cp ON m.career_path_id = cp.id
        WHERE cp.user_id = $1
        GROUP BY user_id
      ),
      streak_data AS (
        SELECT 
          user_id,
          COUNT(*) as streak_days_this_week,
          MAX(streak_date) as last_streak_date,
          SUM(modules_completed) as total_modules_in_streaks
        FROM user_daily_streaks 
        WHERE user_id = $1 AND streak_date >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY user_id
      ),
      goal_progress AS (
        SELECT 
          user_id,
          monthly_coding_goal,
          daily_study_goal_minutes
        FROM user_goals 
        WHERE user_id = $1
      )
      SELECT 
        u.name, u.email, u.learning_streak,
        up.height_cm, up.weight_kg, up.age, up.gender, up.study_domain, up.study_year, up.skills,
        up.leetcode_handle, up.codechef_handle, up.codeforces_handle,
        cs.leetcode_solved, cs.codechef_solved, cs.codeforces_solved, cs.codeforces_contest_solved,
        cs.codechef_contests_participated, cs.current_streak as coding_current_streak, cs.last_updated as coding_last_updated,
        
        -- Daily progress data
        COALESCE(dp.total_active_days, 0) as active_days_this_week,
        dp.last_active_date,
        COALESCE(dp.total_problems_today, 0) as problems_solved_today,
        
        -- Career progress data
        COALESCE(cp.total_career_paths, 0) as total_career_paths,
        COALESCE(cp.active_career_paths, 0) as active_career_paths,
        COALESCE(cp.avg_career_progress, 0) as avg_career_progress,
        
        -- Module progress data
        COALESCE(mp.total_modules, 0) as total_modules,
        COALESCE(mp.completed_modules, 0) as completed_modules,
        COALESCE(mp.modules_completed_today, 0) as modules_completed_today,
        
        -- Milestone data
        COALESCE(rm.total_milestones, 0) as total_milestones,
        COALESCE(rm.completed_milestones, 0) as completed_milestones,
        COALESCE(rm.milestones_completed_today, 0) as milestones_completed_today,
        
        -- Streak data
        COALESCE(sd.streak_days_this_week, 0) as streak_days_this_week,
        sd.last_streak_date,
        COALESCE(sd.total_modules_in_streaks, 0) as total_modules_in_streaks,
        
        -- Goal data
        gp.monthly_coding_goal,
        gp.daily_study_goal_minutes,
        
        -- Current date context
        CURRENT_DATE as current_date,
        CURRENT_TIME as current_time,
        EXTRACT(DOW FROM CURRENT_DATE) as day_of_week,
        EXTRACT(HOUR FROM CURRENT_TIME) as current_hour
        
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN coding_stats cs ON u.id = cs.user_id
      LEFT JOIN daily_progress dp ON u.id = dp.user_id
      LEFT JOIN career_progress cp ON u.id = cp.user_id
      LEFT JOIN module_progress mp ON u.id = mp.user_id
      LEFT JOIN recent_milestones rm ON u.id = rm.user_id
      LEFT JOIN streak_data sd ON u.id = sd.user_id
      LEFT JOIN goal_progress gp ON u.id = gp.user_id
      WHERE u.id = $1
    `;
    
    let client;
    let userResult;
    try {
      client = await pool.connect();
      userResult = await client.query(comprehensiveUserDataQuery, [userId]);
    } finally {
      if (client) client.release();
    }
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User profile not found. Please update your profile first.'
      });
    }

    const userContext = userResult.rows[0];
    
    // Add additional context for mental health assessment
    const mentalHealthContext = {
      ...userContext,
      userId: userId, // Explicitly add userId to context
      // Calculate stress indicators
      high_activity_day: userContext.problems_solved_today > 5 || userContext.modules_completed_today > 3,
      potential_burnout_indicator: userContext.active_days_this_week >= 6 && userContext.avg_career_progress < 0.3,
      achievement_today: userContext.problems_solved_today > 0 || userContext.modules_completed_today > 0 || userContext.milestones_completed_today > 0,
      streak_momentum: userContext.coding_current_streak > 7,
      goal_pressure: userContext.monthly_coding_goal && userContext.leetcode_solved < (userContext.monthly_coding_goal * 0.8),
      
      // Time-based context
      late_night_session: userContext.current_hour >= 22 || userContext.current_hour <= 6,
      weekend_activity: userContext.day_of_week === 0 || userContext.day_of_week === 6,
      
      // Progress ratios for context
      module_completion_rate: userContext.total_modules > 0 ? (userContext.completed_modules / userContext.total_modules) : 0,
      milestone_completion_rate: userContext.total_milestones > 0 ? (userContext.completed_milestones / userContext.total_milestones) : 0,
      
      // User message for context
      user_message: message
    };
    
    console.log('📊 Mental health context prepared with comprehensive user data');
    
    // Generate AI response using enhanced mental coach service with daily progress integration
    const chatResponse = await AIService.generateMentalCoachResponse(message, mentalHealthContext);
    
    console.log('🤖 Mental health chat response generated successfully');

    res.json({
      success: true,
      response: chatResponse.response,
      sentiment: chatResponse.sentiment,
      todaysSolved: chatResponse.todaysSolved,
      recommendations: chatResponse.recommendations,
      personalizedMessage: chatResponse.personalizedMessage,
      timestamp: new Date().toISOString(),
      context_summary: {
        problems_solved_today: userContext.problems_solved_today,
        modules_completed_today: userContext.modules_completed_today,
        current_streak: userContext.coding_current_streak,
        active_career_paths: userContext.active_career_paths,
        daily_progress_integrated: chatResponse.todaysSolved ? true : false
      }
    });

  } catch (error) {
    console.error('❌ Mental health chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process your mental health query. Please try again.',
      details: error.message
    });
  }
});

// Get user's mental health insights and progress summary
router.get('/insights', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    console.log('📈 Generating mental health insights for user:', userId);

    // Get mental health relevant data
    const insightsQuery = `
      WITH recent_activity AS (
        SELECT 
          COUNT(*) as active_days_last_week,
          AVG(problems_solved) as avg_problems_per_day,
          MAX(activity_date) as last_active
        FROM daily_activity 
        WHERE user_id = $1 AND activity_date >= CURRENT_DATE - INTERVAL '7 days'
      ),
      stress_indicators AS (
        SELECT 
          COUNT(CASE WHEN activity_date >= CURRENT_DATE - INTERVAL '3 days' AND problems_solved > 10 THEN 1 END) as high_intensity_days,
          COUNT(CASE WHEN activity_date >= CURRENT_DATE - INTERVAL '7 days' AND problems_solved = 0 THEN 1 END) as zero_progress_days
        FROM daily_activity 
        WHERE user_id = $1
      ),
      achievement_momentum AS (
        SELECT 
          COUNT(CASE WHEN completed_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as recent_completions,
          COUNT(CASE WHEN completed_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as monthly_completions
        FROM user_module_progress 
        WHERE user_id = $1 AND completed = true
      )
      SELECT 
        u.name, u.learning_streak,
        cs.current_streak as coding_streak,
        cs.leetcode_solved, cs.codechef_solved, cs.codeforces_solved,
        ra.active_days_last_week,
        ra.avg_problems_per_day,
        ra.last_active,
        si.high_intensity_days,
        si.zero_progress_days,
        am.recent_completions,
        am.monthly_completions,
        ug.monthly_coding_goal,
        ug.daily_study_goal_minutes
      FROM users u
      LEFT JOIN coding_stats cs ON u.id = cs.user_id
      LEFT JOIN recent_activity ra ON true
      LEFT JOIN stress_indicators si ON true
      LEFT JOIN achievement_momentum am ON true
      LEFT JOIN user_goals ug ON u.id = ug.user_id
      WHERE u.id = $1
    `;
    
    const result = await pool.query(insightsQuery, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const insights = result.rows[0];
    
    // Generate mental health recommendations
    const recommendations = generateMentalHealthRecommendations(insights);

    res.json({
      success: true,
      data: {
        ...insights,
        mental_health_score: calculateMentalHealthScore(insights),
        recommendations,
        stress_level: assessStressLevel(insights)
      }
    });

  } catch (error) {
    console.error('❌ Error generating mental health insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate mental health insights',
      details: error.message
    });
  }
});

// Helper function to calculate mental health score
function calculateMentalHealthScore(insights) {
  let score = 70; // Base score
  
  // Positive factors
  if (insights.coding_streak > 0) score += Math.min(insights.coding_streak * 2, 20);
  if (insights.active_days_last_week >= 5) score += 10;
  if (insights.recent_completions > 0) score += 15;
  
  // Negative factors
  if (insights.high_intensity_days > 2) score -= 15;
  if (insights.zero_progress_days > 3) score -= 20;
  if (insights.active_days_last_week === 0) score -= 25;
  
  return Math.max(0, Math.min(100, score));
}

// Helper function to assess stress level
function assessStressLevel(insights) {
  if (insights.high_intensity_days > 3 || insights.zero_progress_days > 4) {
    return 'high';
  } else if (insights.high_intensity_days > 1 || insights.zero_progress_days > 2) {
    return 'medium';
  } else {
    return 'low';
  }
}

// Helper function to generate mental health recommendations
function generateMentalHealthRecommendations(insights) {
  const recommendations = [];
  const userName = insights.name || 'friend';

  // Stress management recommendations
  if (insights.high_intensity_days > 2) {
    recommendations.push({
      type: 'stress_management',
      title: 'Take Regular Breaks',
      description: `${userName}, you've had ${insights.high_intensity_days} high-intensity coding days recently. Consider taking short breaks every hour.`,
      priority: 'high'
    });
  }

  // Motivation recommendations
  if (insights.zero_progress_days > 2) {
    recommendations.push({
      type: 'motivation',
      title: 'Gentle Progress',
      description: `It's okay to have slower days, ${userName}. Even solving one problem counts as progress.`,
      priority: 'medium'
    });
  }

  // Achievement recognition
  if (insights.recent_completions > 0) {
    recommendations.push({
      type: 'achievement',
      title: 'Celebrate Your Progress',
      description: `Great job completing ${insights.recent_completions} modules recently! Take a moment to appreciate your growth.`,
      priority: 'low'
    });
  }

  // Streak maintenance
  if (insights.coding_streak > 7) {
    recommendations.push({
      type: 'balance',
      title: 'Maintain Balance',
      description: `Your ${insights.coding_streak}-day streak is impressive! Remember to balance coding with rest and other activities.`,
      priority: 'medium'
    });
  }

  // Default recommendations if no specific issues
  if (recommendations.length === 0) {
    recommendations.push({
      type: 'general',
      title: 'Keep Up the Good Work',
      description: `You're maintaining a healthy coding routine, ${userName}. Keep focusing on consistent progress!`,
      priority: 'low'
    });
  }

  return recommendations;
}

export default router;
