import express from 'express';
import multer from 'multer';
import { pool } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import AIService from '../services/aiService.js';

const router = express.Router();

// Configure multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Food Analysis - Analyze food from uploaded image
router.post('/food-analysis', authenticateToken, upload.single('foodImage'), async (req, res) => {
  try {
    const userId = req.user.userId;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file uploaded. Please upload a food image.'
      });
    }

    console.log('🍽️ Processing food analysis request for user:', userId);
    console.log('📸 Image details:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      bufferLength: req.file.buffer.length
    });

    // Validate image buffer
    if (!req.file.buffer || req.file.buffer.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid image data. Please try uploading the image again.'
      });
    }

    // Get user profile data for personalized recommendations
    const userProfileQuery = `
      SELECT u.name, u.email, up.height_cm, up.weight_kg, up.age, up.gender, up.study_domain
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE u.id = $1
    `;
    
    const userResult = await pool.query(userProfileQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User profile not found. Please update your profile first.'
      });
    }

    const userContext = userResult.rows[0];
    console.log('👤 User context for analysis:', {
      name: userContext.name,
      height_cm: userContext.height_cm,
      weight_kg: userContext.weight_kg,
      age: userContext.age,
      gender: userContext.gender
    });
    
    // Analyze food using AI service with the Indian food model
    console.log('🤖 Sending image to AI model for analysis...');
    const analysisResult = await AIService.analyzeFoodFromImage(req.file.buffer, userContext);
    
    console.log('🔍 Food analysis result:', analysisResult);

    res.json({
      success: true,
      message: 'Food analysis completed successfully',
      data: analysisResult
    });

  } catch (error) {
    console.error('❌ Food analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze food image. Please try again.',
      details: error.message
    });
  }
});

// Diet Planner - Generate personalized diet plan
router.post('/diet-plan', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { activity_level = 'moderate', dietary_preferences = [], health_goals = [] } = req.body;

    console.log('🥗 Generating diet plan for user:', userId);

    // Get comprehensive user profile data
    const userProfileQuery = `
      SELECT 
        u.name, u.email,
        up.height_cm, up.weight_kg, up.age, up.gender, up.study_domain, up.skills,
        cs.leetcode_solved, cs.codechef_solved, cs.codeforces_solved, cs.current_streak
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN coding_stats cs ON u.id = cs.user_id
      WHERE u.id = $1
    `;
    
    let client;
    let userResult;
    try {
      client = await pool.connect();
      userResult = await client.query(userProfileQuery, [userId]);
    } finally {
      if (client) client.release();
    }
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User profile not found. Please update your profile with physical metrics first.'
      });
    }

    const userContext = {
      ...userResult.rows[0],
      activity_level,
      dietary_preferences,
      health_goals
    };
    
    // Generate personalized diet plan using AI service
    const dietPlanResult = await AIService.generateDietPlan(userContext);
    
    console.log('📋 Diet plan generated successfully');

    res.json({
      success: true,
      message: 'Personalized diet plan generated successfully',
      data: dietPlanResult
    });

  } catch (error) {
    console.error('❌ Diet plan generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate diet plan. Please try again.',
      details: error.message
    });
  }
});

// Exercise Planner - Generate personalized exercise plan
router.post('/exercise-plan', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { fitness_level = 'beginner', available_time = '30', equipment_available = [], fitness_goals = [] } = req.body;

    console.log('💪 Generating exercise plan for user:', userId);

    // Get comprehensive user profile data
    const userProfileQuery = `
      SELECT 
        u.name, u.email,
        up.height_cm, up.weight_kg, up.age, up.gender, up.study_domain, up.skills,
        cs.leetcode_solved, cs.codechef_solved, cs.codeforces_solved, cs.current_streak
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN coding_stats cs ON u.id = cs.user_id
      WHERE u.id = $1
    `;
    
    let client;
    let userResult;
    try {
      client = await pool.connect();
      userResult = await client.query(userProfileQuery, [userId]);
    } finally {
      if (client) client.release();
    }
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User profile not found. Please update your profile with physical metrics first.'
      });
    }

    const userContext = {
      ...userResult.rows[0],
      fitness_level,
      available_time,
      equipment_available,
      fitness_goals
    };
    
    // Generate personalized exercise plan using AI service
    const exercisePlanResult = await AIService.generateExercisePlan(userContext);
    
    console.log('🏋️ Exercise plan generated successfully');

    res.json({
      success: true,
      message: 'Personalized exercise plan generated successfully',
      data: exercisePlanResult
    });

  } catch (error) {
    console.error('❌ Exercise plan generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate exercise plan. Please try again.',
      details: error.message
    });
  }
});

// Get user's physical metrics and BMI
router.get('/metrics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const metricsQuery = `
      SELECT 
        u.name,
        up.height_cm, up.weight_kg, up.age, up.gender,
        CASE 
          WHEN up.height_cm IS NOT NULL AND up.weight_kg IS NOT NULL 
          THEN ROUND((up.weight_kg / POWER(up.height_cm / 100.0, 2))::numeric, 1)
          ELSE NULL 
        END as bmi
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE u.id = $1
    `;
    
    const result = await pool.query(metricsQuery, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const metrics = result.rows[0];
    
    // Calculate BMI status
    let bmiStatus = 'Unknown';
    if (metrics.bmi) {
      if (metrics.bmi < 18.5) bmiStatus = 'Underweight';
      else if (metrics.bmi < 25) bmiStatus = 'Normal weight';
      else if (metrics.bmi < 30) bmiStatus = 'Overweight';
      else bmiStatus = 'Obese';
    }

    res.json({
      success: true,
      data: {
        ...metrics,
        bmiStatus,
        recommendations: getHealthRecommendations(metrics.bmi, metrics)
      }
    });

  } catch (error) {
    console.error('❌ Error fetching user metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user metrics',
      details: error.message
    });
  }
});

// Helper function for health recommendations
function getHealthRecommendations(bmi, userMetrics) {
  const recommendations = [];
  const userName = userMetrics.name || 'friend';

  if (!bmi) {
    recommendations.push(`Hey ${userName}, please update your height and weight in your profile to get personalized health recommendations!`);
    return recommendations;
  }

  if (bmi < 18.5) {
    recommendations.push(`${userName}, focus on gaining healthy weight with nutrient-dense foods.`);
    recommendations.push('Include protein-rich foods like dal, paneer, and nuts in your diet.');
    recommendations.push('Consider strength training to build muscle mass.');
  } else if (bmi > 25) {
    recommendations.push(`${userName}, focus on portion control and regular physical activity.`);
    recommendations.push('Include more vegetables and fiber-rich foods in your meals.');
    recommendations.push('Aim for at least 150 minutes of moderate exercise per week.');
  } else {
    recommendations.push(`Great job maintaining a healthy weight, ${userName}!`);
    recommendations.push('Continue with your balanced diet and regular exercise routine.');
  }

  // General recommendations for students/programmers
  recommendations.push('Take regular breaks from screen time - your eyes will thank you!');
  recommendations.push('Stay hydrated with 8-10 glasses of water daily.');
  recommendations.push('Maintain good posture while coding to prevent back pain.');

  return recommendations;
}

// Health Chat - AI-powered health query assistant
router.post('/health-chat', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    console.log('💬 Processing health chat query for user:', userId);

    // Get comprehensive user profile and physical metrics
    const userProfileQuery = `
      SELECT 
        u.name, u.email,
        up.height_cm, up.weight_kg, up.age, up.gender, up.study_domain, up.skills,
        cs.leetcode_solved, cs.codechef_solved, cs.codeforces_solved, cs.current_streak,
        CASE 
          WHEN up.height_cm IS NOT NULL AND up.weight_kg IS NOT NULL 
          THEN ROUND((up.weight_kg / POWER(up.height_cm / 100.0, 2))::numeric, 1)
          ELSE NULL 
        END as bmi
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN coding_stats cs ON u.id = cs.user_id
      WHERE u.id = $1
    `;
    
    let client;
    let userResult;
    try {
      client = await pool.connect();
      userResult = await client.query(userProfileQuery, [userId]);
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
    
    // Generate AI response using health chat service
    const chatResponse = await AIService.generateHealthChatResponse(message, userContext);
    
    console.log('🤖 Health chat response generated successfully');

    res.json({
      success: true,
      response: chatResponse,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Health chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process your health query. Please try again.',
      details: error.message
    });
  }
});

export default router;
