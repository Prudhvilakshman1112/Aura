import express from 'express';
import { pool } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { calculateBMI, getBMICategory } from '../services/calculations.js';

const router = express.Router();

// Get physical metrics
router.get('/metrics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('🔍 Fetching physical metrics for user:', userId);
    
    // Fetch user physical data from user_profiles table
    const query = `
      SELECT height_cm, weight_kg, age, gender 
      FROM user_profiles 
      WHERE user_id = $1
    `;
    
    const result = await pool.query(query, [userId]);
    console.log('📊 Database query result:', result.rows);
    
    let physicalData = {
      height_cm: null,
      weight_kg: null,
      age: null,
      gender: null,
      bmi: null,
      bmiCategory: 'Unknown'
    };
    
    if (result.rows.length > 0) {
      const userData = result.rows[0];
      console.log('✅ User data found:', userData);
      
      // Convert string values to numbers
      const height = parseFloat(userData.height_cm);
      const weight = parseFloat(userData.weight_kg);
      
      console.log('🔄 Converted values:', { height, weight, originalHeight: userData.height_cm, originalWeight: userData.weight_kg });
      
      physicalData = {
        height_cm: height,
        weight_kg: weight,
        age: userData.age,
        gender: userData.gender,
        bmi: null,
        bmiCategory: 'Unknown'
      };
      
      // Calculate BMI if height and weight are available
      if (height && weight && !isNaN(height) && !isNaN(weight)) {
        const bmi = calculateBMI(height, weight);
        const bmiCategory = getBMICategory(bmi);
        physicalData.bmi = parseFloat(bmi.toFixed(1));
        physicalData.bmiCategory = bmiCategory;
        console.log('📈 BMI calculated with converted values:', { height, weight, bmi, bmiCategory });
      }
    } else {
      console.log('❌ No user profile data found for user:', userId);
    }
    
    console.log('📤 Sending response:', physicalData);
    
    res.json({
      status: 'success',
      message: 'Physical metrics retrieved successfully',
      data: physicalData
    });
    
  } catch (error) {
    console.error('❌ Physical metrics error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Update physical metrics
router.post('/metrics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { height_cm, weight_kg, age, gender } = req.body;
    
    // Convert string values to numbers
    const height = parseFloat(height_cm);
    const weight = parseFloat(weight_kg);
    const userAge = parseInt(age);
    
    // Check if user profile exists
    const checkQuery = 'SELECT user_id FROM user_profiles WHERE user_id = $1';
    const checkResult = await pool.query(checkQuery, [userId]);
    
    if (checkResult.rows.length === 0) {
      // Create new user profile
      const insertQuery = `
        INSERT INTO user_profiles (user_id, height_cm, weight_kg, age, gender)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING height_cm, weight_kg, age, gender
      `;
      const insertResult = await pool.query(insertQuery, [userId, height, weight, userAge, gender]);
      
      const userData = insertResult.rows[0];
      let responseData = { ...userData, bmi: null, bmiCategory: 'Unknown' };
      
      // Calculate BMI if height and weight are provided
      if (height && weight) {
        const bmi = calculateBMI(height, weight);
        const bmiCategory = getBMICategory(bmi);
        responseData.bmi = parseFloat(bmi.toFixed(1));
        responseData.bmiCategory = bmiCategory;
      }
      
      res.json({
        status: 'success',
        message: 'Physical metrics created successfully',
        data: responseData
      });
    } else {
      // Update existing user profile
      const updateQuery = `
        UPDATE user_profiles 
        SET height_cm = $2, weight_kg = $3, age = $4, gender = $5
        WHERE user_id = $1
        RETURNING height_cm, weight_kg, age, gender
      `;
      const updateResult = await pool.query(updateQuery, [userId, height, weight, userAge, gender]);
      
      const userData = updateResult.rows[0];
      let responseData = { ...userData, bmi: null, bmiCategory: 'Unknown' };
      
      // Calculate BMI if height and weight are provided
      if (height && weight) {
        const bmi = calculateBMI(height, weight);
        const bmiCategory = getBMICategory(bmi);
        responseData.bmi = parseFloat(bmi.toFixed(1));
        responseData.bmiCategory = bmiCategory;
      }
      
      res.json({
        status: 'success',
        message: 'Physical metrics updated successfully',
        data: responseData
      });
    }
    
  } catch (error) {
    console.error('Update physical metrics error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Initialize user profile with default physical data (for testing)
router.post('/init-profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('🔧 Initializing profile for user:', userId);
    
    // Check if profile already exists
    const checkQuery = 'SELECT user_id FROM user_profiles WHERE user_id = $1';
    const checkResult = await pool.query(checkQuery, [userId]);
    
    if (checkResult.rows.length === 0) {
      // Create profile with some default data
      const insertQuery = `
        INSERT INTO user_profiles (user_id, height_cm, weight_kg, age, gender)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      const result = await pool.query(insertQuery, [userId, 175, 70, 25, 'Male']);
      console.log('✅ Profile created:', result.rows[0]);
      
      res.json({
        success: true,
        message: 'Profile initialized with default data',
        data: result.rows[0]
      });
    } else {
      res.json({
        success: true,
        message: 'Profile already exists',
        data: checkResult.rows[0]
      });
    }
    
  } catch (error) {
    console.error('❌ Init profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Helper function to get health recommendations
function getHealthRecommendations(bmi, category) {
  const recommendations = {
    'Underweight': [
      'Consider consulting with a healthcare provider',
      'Focus on nutrient-dense foods',
      'Include strength training exercises'
    ],
    'Normal weight': [
      'Maintain current healthy lifestyle',
      'Continue regular physical activity',
      'Keep balanced nutrition'
    ],
    'Overweight': [
      'Consider moderate calorie reduction',
      'Increase physical activity',
      'Focus on whole foods and vegetables'
    ],
    'Obese': [
      'Consult with a healthcare provider',
      'Consider structured weight loss program',
      'Gradual increase in physical activity'
    ]
  };
  
  return recommendations[category] || [];
}

export default router;
