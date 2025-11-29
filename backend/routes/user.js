import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateRequest, profileUpdateSchema } from '../middleware/validation.js';

const router = express.Router();

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.userId;
    
    const query = `
      SELECT 
        u.id, u.name, u.email, u.profile_image_url, u.created_at,
        up.linkedin_handle, up.leetcode_handle, up.codechef_handle, 
        up.codeforces_handle, up.height_cm, up.weight_kg, up.age, 
        up.gender, up.study_domain, up.study_year, up.skills
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE u.id = $1
    `;
    
    const result = await client.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    const user = result.rows[0];
    
    res.json({
      status: 'success',
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        profileImageUrl: user.profile_image_url,
        createdAt: user.created_at,
        profile: {
          linkedinHandle: user.linkedin_handle,
          leetcodeHandle: user.leetcode_handle,
          codechefHandle: user.codechef_handle,
          codeforcesHandle: user.codeforces_handle,
          heightCm: user.height_cm,
          weightKg: user.weight_kg,
          age: user.age,
          gender: user.gender,
          studyDomain: user.study_domain,
          studyYear: user.study_year,
          skills: user.skills || []
        }
      }
    });
    
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  } finally {
    await client.end();
  }
});

// Update user profile
router.put('/profile', authenticateToken, validateRequest(profileUpdateSchema), async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.userId;
    const updates = req.body;
    
    console.log('🔍 Backend: Profile update request received');
    console.log('User ID:', userId);
    console.log('Updates:', updates);
    
    await client.query('BEGIN');
    
    // Separate user table updates from profile table updates
    const userUpdates = {};
    const profileUpdates = {};
    
    // Fields that belong to users table
    if (updates.name !== undefined) userUpdates.name = updates.name;
    if (updates.profile_image_url !== undefined) userUpdates.profile_image_url = updates.profile_image_url;
    
    // Fields that belong to user_profiles table
    const profileFields = [
      'linkedin_handle', 'leetcode_handle', 'codechef_handle', 'codeforces_handle',
      'height_cm', 'weight_kg', 'age', 'gender', 'study_domain', 'study_year', 'skills'
    ];
    
    profileFields.forEach(field => {
      if (updates[field] !== undefined) {
        profileUpdates[field] = updates[field];
      }
    });
    
    console.log('🔍 Backend: User updates:', userUpdates);
    console.log('🔍 Backend: Profile updates:', profileUpdates);
    
    // Update users table if needed
    if (Object.keys(userUpdates).length > 0) {
      const userSetClause = Object.keys(userUpdates)
        .map((key, index) => `${key} = $${index + 2}`)
        .join(', ');
      
      const userValues = [userId, ...Object.values(userUpdates)];
      
      await client.query(
        `UPDATE users SET ${userSetClause} WHERE id = $1`,
        userValues
      );
    }
    
    // Update user_profiles table if needed
    if (Object.keys(profileUpdates).length > 0) {
      // First check if profile exists
      const profileExistsQuery = 'SELECT user_id FROM user_profiles WHERE user_id = $1';
      const profileExists = await client.query(profileExistsQuery, [userId]);
      
      if (profileExists.rows.length === 0) {
        // Insert new profile
        const insertFields = ['user_id', ...Object.keys(profileUpdates)];
        const insertValues = [userId, ...Object.values(profileUpdates)];
        const insertPlaceholders = insertFields.map((_, index) => `$${index + 1}`).join(', ');
        
        await client.query(
          `INSERT INTO user_profiles (${insertFields.join(', ')}) VALUES (${insertPlaceholders})`,
          insertValues
        );
      } else {
        // Update existing profile
        const profileSetClause = Object.keys(profileUpdates)
          .map((key, index) => `${key} = $${index + 2}`)
          .join(', ');
        
        const profileValues = [userId, ...Object.values(profileUpdates)];
        
        const updateQuery = `UPDATE user_profiles SET ${profileSetClause} WHERE user_id = $1`;
        console.log('🔍 Backend: Executing profile update query:', updateQuery);
        console.log('🔍 Backend: With values:', profileValues);
        
        const updateResult = await client.query(updateQuery, profileValues);
        console.log('🔍 Backend: Profile update result:', updateResult.rowCount, 'rows affected');
      }
    }
    
    await client.query('COMMIT');
    console.log('🔍 Backend: Transaction committed successfully');
    
    res.json({
      status: 'success',
      message: 'Profile updated successfully'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  } finally {
    await client.end();
  }
});

export default router;
