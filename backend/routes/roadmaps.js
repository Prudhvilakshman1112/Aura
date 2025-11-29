import express from 'express';
import { pool } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { staticRoadmaps } from '../data/staticRoadmaps.js';
import DailyProgressTracker from '../services/dailyProgressTracker.js';

const router = express.Router();

// Get roadmap templates (public endpoint)
router.get('/templates', async (req, res) => {
  try {
    // Return static roadmap templates
    res.json({ 
      status: 'success', 
      data: { templates: staticRoadmaps } 
    });
  } catch (error) {
    console.error('Error fetching roadmap templates:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch roadmap templates' 
    });
  }
});

// Get user's selected career paths
router.get('/user-paths', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const query = `
      SELECT ucp.*, 
             COUNT(ump.id) as total_modules,
             COUNT(CASE WHEN ump.completed = true THEN 1 END) as completed_modules
      FROM user_career_paths ucp
      LEFT JOIN user_module_progress ump ON ucp.user_id = ump.user_id AND ucp.roadmap_id = ump.roadmap_id
      WHERE ucp.user_id = $1 AND ucp.is_active = true
      GROUP BY ucp.id
      ORDER BY ucp.selected_at DESC
    `;
    
    const result = await pool.query(query, [userId]);
    
    // Calculate progress for each career path
    const careerPaths = result.rows.map(path => ({
      ...path,
      progress: path.total_modules > 0 
        ? Math.round((path.completed_modules / path.total_modules) * 100)
        : 0
    }));
    
    res.json({ 
      status: 'success', 
      data: { careerPaths } 
    });
  } catch (error) {
    console.error('Error fetching user career paths:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch user career paths' 
    });
  }
});

// Get current active learning path for dashboard
router.get('/current-learning', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const query = `
      SELECT cp.*, 
             json_agg(
               json_build_object(
                 'id', m.id,
                 'title', m.title,
                 'description', m.description,
                 'completed', m.completed,
                 'dueDate', m.due_date,
                 'estimatedTime', m.estimated_time,
                 'orderIndex', m.order_index
               ) ORDER BY m.order_index
             ) as milestones,
             COUNT(CASE WHEN m.completed = true THEN 1 END) as completed_milestones,
             COUNT(m.id) as total_milestones
      FROM career_paths cp
      LEFT JOIN milestones m ON cp.id = m.career_path_id
      WHERE cp.user_id = $1 AND cp.is_template = false
      GROUP BY cp.id
      ORDER BY cp.updated_at DESC
      LIMIT 1
    `;
    
    const result = await pool.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return res.json({ 
        status: 'success', 
        data: { currentPath: null } 
      });
    }
    
    const currentPath = result.rows[0];
    // Calculate progress
    const progress = currentPath.total_milestones > 0 
      ? Math.round((currentPath.completed_milestones / currentPath.total_milestones) * 100)
      : 0;
    
    currentPath.progress = progress;
    
    res.json({ 
      status: 'success', 
      data: { currentPath } 
    });
  } catch (error) {
    console.error('Error fetching current learning path:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch current learning path' 
    });
  }
});

// Get roadmap details with user progress
router.get('/roadmap/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const roadmapId = parseInt(req.params.id);
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Find roadmap in static data
    const roadmap = staticRoadmaps.find(r => r.id === roadmapId);
    
    if (!roadmap) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'Roadmap not found' 
      });
    }
    
    // Get user's progress for this roadmap
    const progressQuery = `
      SELECT module_name, completed, completed_at
      FROM user_module_progress
      WHERE user_id = $1 AND roadmap_id = $2
    `;
    const progressResult = await pool.query(progressQuery, [userId, roadmapId]);
    
    // Create a map of module progress
    const moduleProgress = {};
    progressResult.rows.forEach(row => {
      moduleProgress[row.module_name] = {
        completed: row.completed,
        completedAt: row.completed_at
      };
    });
    
    // Add progress information to modules
    const modulesWithProgress = roadmap.modules.map(module => ({
      name: module,
      completed: moduleProgress[module]?.completed || false,
      completedAt: moduleProgress[module]?.completedAt || null
    }));
    
    // Calculate overall progress
    const completedCount = modulesWithProgress.filter(m => m.completed).length;
    const progress = roadmap.modules.length > 0 
      ? Math.round((completedCount / roadmap.modules.length) * 100)
      : 0;
    
    res.json({
      status: 'success',
      data: {
        roadmap: {
          ...roadmap,
          modules: modulesWithProgress,
          progress,
          totalModules: roadmap.modules.length,
          completedModules: completedCount
        }
      }
    });
  } catch (error) {
    console.error('Error fetching roadmap details:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch roadmap details'
    });
  }
});

// Get roadmap categories
router.get('/categories', async (req, res) => {
  try {
    const categories = getRoadmapCategories();
    res.json({
      status: 'success',
      data: { categories }
    });
  } catch (error) {
    console.error('Error fetching roadmap categories:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch roadmap categories'
    });
  }
});

// Select a roadmap as user's career path
router.post('/select-roadmap', authenticateToken, async (req, res) => {
  let client;
  
  try {
    const userId = req.user.id;
    const { roadmapId } = req.body;
    
    if (!roadmapId) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Roadmap ID is required' 
      });
    }
    
    // Find roadmap in static data
    const roadmap = staticRoadmaps.find(r => r.id === roadmapId);
    
    if (!roadmap) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'Roadmap not found' 
      });
    }
    
    client = await pool.connect();
    await client.query('BEGIN');
    
    // Check if user already has this roadmap selected
    const existingQuery = `
      SELECT id FROM user_career_paths 
      WHERE user_id = $1 AND roadmap_id = $2 AND is_active = true
    `;
    const existingResult = await client.query(existingQuery, [userId, roadmapId]);
    
    if (existingResult.rows.length > 0) {
      await client.query('COMMIT');
      return res.json({ 
        status: 'success', 
        data: { 
          careerPathId: existingResult.rows[0].id,
          message: 'Roadmap already selected, redirecting to current path' 
        } 
      });
    }
    
    // Create user's career path selection
    const createPathQuery = `
      INSERT INTO user_career_paths (user_id, roadmap_id, roadmap_name)
      VALUES ($1, $2, $3)
      RETURNING id
    `;
    const pathResult = await client.query(createPathQuery, [
      userId,
      roadmapId,
      roadmap.name
    ]);
    
    const newPathId = pathResult.rows[0].id;
    
    // Create module progress entries for all modules in the roadmap (with ON CONFLICT)
    for (const module of roadmap.modules) {
      await client.query(
        `INSERT INTO user_module_progress (user_id, roadmap_id, module_name) 
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, roadmap_id, module_name) DO NOTHING`,
        [userId, roadmapId, module]
      );
    }
    
    await client.query('COMMIT');
    
    res.json({ 
      status: 'success', 
      data: { 
        careerPathId: newPathId,
        message: 'Roadmap selected successfully' 
      } 
    });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Error selecting roadmap:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to select roadmap' 
    });
  } finally {
    if (client) {
      await client.end();
    }
  }
});

// Helper function to update career path progress
async function updateCareerPathProgress(userId, roadmapId) {
  let client;
  try {
    client = await pool.connect();
    await updateCareerPathProgressWithClient(client, userId, roadmapId);
  } catch (error) {
    console.error('Error updating career path progress:', error);
  } finally {
    if (client) {
      await client.end();
    }
  }
}

// Helper function to update career path progress with existing client
async function updateCareerPathProgressWithClient(client, userId, roadmapId) {
  try {
    // Calculate progress based on completed modules
    const progressQuery = `
      SELECT 
        COUNT(*) as total_modules,
        COUNT(CASE WHEN completed = true THEN 1 END) as completed_modules
      FROM user_module_progress 
      WHERE user_id = $1 AND roadmap_id = $2
    `;
    const result = await client.query(progressQuery, [userId, roadmapId]);
    
    if (result.rows.length > 0) {
      const { total_modules, completed_modules } = result.rows[0];
      const progress = total_modules > 0 ? Math.round((completed_modules / total_modules) * 100) : 0;
      
      // Update the user's career path progress
      await client.query(
        `UPDATE user_career_paths 
         SET progress = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE user_id = $2 AND roadmap_id = $3`,
        [progress, userId, roadmapId]
      );
    }
  } catch (error) {
    console.error('Error updating career path progress with client:', error);
    throw error;
  }
}

// Helper function to update user learning streak
async function updateLearningStreak(userId) {
  try {
    // Get user's recent module completions
    const streakQuery = `
      SELECT DATE(completed_at) as completion_date
      FROM user_module_progress
      WHERE user_id = $1 AND completed = true AND completed_at IS NOT NULL
      ORDER BY completed_at DESC
      LIMIT 30
    `;
    const streakResult = await pool.query(streakQuery, [userId]);
    
    if (streakResult.rows.length === 0) {
      return 0;
    }
    
    // Update daily streak record for today
    const today = new Date().toISOString().split('T')[0];
    const todayCompletions = streakResult.rows.filter(row => 
      row.completion_date.toISOString().split('T')[0] === today
    ).length;
    
    if (todayCompletions > 0) {
      await pool.query(
        `INSERT INTO user_daily_streaks (user_id, streak_date, modules_completed)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, streak_date)
         DO UPDATE SET modules_completed = $3`,
        [userId, today, todayCompletions]
      );
    }
    
    // Calculate current streak
    let streak = 0;
    const completionDates = [...new Set(streakResult.rows.map(row => 
      row.completion_date.toISOString().split('T')[0]
    ))].sort().reverse();
    
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    let currentDate = todayStr;
    let hasActivityToday = completionDates.includes(todayStr);
    
    if (!hasActivityToday) {
      currentDate = yesterdayStr;
    }
    
    // Count consecutive days with activity
    while (completionDates.includes(currentDate)) {
      streak++;
      const date = new Date(currentDate);
      date.setDate(date.getDate() - 1);
      currentDate = date.toISOString().split('T')[0];
    }
    
    // Update user's streak in database
    await pool.query(
      'UPDATE users SET learning_streak = $1 WHERE id = $2',
      [streak, userId]
    );
    
    return streak;
  } catch (error) {
    console.error('Error calculating learning streak:', error);
    return 0;
  }
}

// Delete career path (using POST method to avoid server restart)
router.post('/delete-career-path', authenticateToken, async (req, res) => {
  let client;
  
  try {
    const userId = req.user.id;
    const { careerPathId } = req.body;
    
    if (!careerPathId) {
      return res.status(400).json({
        status: 'error',
        message: 'Career path ID is required'
      });
    }
    
    client = await pool.connect();
    await client.query('BEGIN');
    
    // Verify the career path belongs to the user
    const verifyQuery = `
      SELECT id, roadmap_id FROM user_career_paths 
      WHERE id = $1 AND user_id = $2
    `;
    const verifyResult = await client.query(verifyQuery, [careerPathId, userId]);
    
    if (verifyResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        status: 'error',
        message: 'Career path not found or access denied'
      });
    }
    
    const roadmapId = verifyResult.rows[0].roadmap_id;
    
    // Delete related records in correct order to avoid foreign key constraints
    
    // Check if tables exist before attempting deletion
    const checkTableQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('user_milestone_completions', 'user_career_progress_history', 'daily_user_progress')
    `;
    const existingTables = await client.query(checkTableQuery);
    const tableNames = existingTables.rows.map(row => row.table_name);
    
    // 1. Delete from user_milestone_completions if it exists
    if (tableNames.includes('user_milestone_completions')) {
      await client.query(
        'DELETE FROM user_milestone_completions WHERE user_id = $1',
        [userId]
      );
    }
    
    // 2. Delete from user_career_progress_history if it exists
    if (tableNames.includes('user_career_progress_history')) {
      await client.query(
        'DELETE FROM user_career_progress_history WHERE user_id = $1',
        [userId]
      );
    }
    
    // 3. Delete from daily_user_progress if it exists
    if (tableNames.includes('daily_user_progress')) {
      await client.query(
        'DELETE FROM daily_user_progress WHERE user_id = $1',
        [userId]
      );
    }
    
    // 4. Delete module progress for this roadmap
    await client.query(
      'DELETE FROM user_module_progress WHERE user_id = $1 AND roadmap_id = $2',
      [userId, roadmapId]
    );
    
    // 5. Delete the career path itself
    await client.query(
      'DELETE FROM user_career_paths WHERE id = $1 AND user_id = $2',
      [careerPathId, userId]
    );
    
    await client.query('COMMIT');
    
    res.json({
      status: 'success',
      message: 'Career path deleted successfully'
    });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Error deleting career path:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete career path: ' + error.message
    });
  } finally {
    if (client) {
      await client.end();
    }
  }
});

// Update module completion status
router.put('/module-completion', authenticateToken, async (req, res) => {
  let client;
  
  try {
    const userId = req.user.id;
    const { roadmapId, moduleName, completed } = req.body;
    
    if (!roadmapId || !moduleName) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Roadmap ID and module name are required' 
      });
    }
    
    client = await pool.connect();
    await client.query('BEGIN');
    
    // Update module completion status
    const result = await client.query(
      `UPDATE user_module_progress SET 
         completed = $1, 
         completed_at = CASE WHEN $1 = true THEN CURRENT_TIMESTAMP ELSE NULL END,
         updated_at = CURRENT_TIMESTAMP 
       WHERE user_id = $2 AND roadmap_id = $3 AND module_name = $4
       RETURNING *`,
      [completed, userId, roadmapId, moduleName]
    );
    
    if (result.rows.length > 0) {
      // Update career path progress using the same client
      await updateCareerPathProgressWithClient(client, userId, roadmapId);
      
      // Record milestone completion in daily progress tracker
      if (completed) {
        await DailyProgressTracker.recordMilestoneCompletion(userId, roadmapId, result.rows[0].id);
      }
    }
    
    await client.query('COMMIT');
    
    res.json({ 
      status: 'success', 
      data: { module: result.rows[0] } 
    });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Error updating module completion:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to update module completion' 
    });
  } finally {
    if (client) {
      await client.end();
    }
  }
});

// Get user's learning streak
router.get('/learning-streak', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const streak = await updateLearningStreak(userId);
    
    res.json({
      status: 'success',
      data: { streak }
    });
  } catch (error) {
    console.error('Error fetching learning streak:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch learning streak'
    });
  }
});

// Initialize roadmap tables (run migration)
router.post('/init-tables', async (req, res) => {
  try {
    console.log('🔄 Initializing roadmap tables...');
    
    // Create user_career_paths table (replaces career_paths for user selections)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_career_paths (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          roadmap_id INTEGER NOT NULL,
          roadmap_name VARCHAR(255) NOT NULL,
          selected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          progress INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create user_module_progress table for tracking individual module completion
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_module_progress (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          roadmap_id INTEGER NOT NULL,
          module_name VARCHAR(500) NOT NULL,
          completed BOOLEAN DEFAULT FALSE,
          completed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, roadmap_id, module_name)
      );
    `);

    // Create user_daily_streaks table for tracking learning streaks
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_daily_streaks (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          streak_date DATE NOT NULL,
          modules_completed INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, streak_date)
      );
    `);

    // Add learning_streak column to users table if it doesn't exist
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS learning_streak INTEGER DEFAULT 0;
    `);

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_career_paths_user_id ON user_career_paths(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_career_paths_active ON user_career_paths(user_id, is_active);
      CREATE INDEX IF NOT EXISTS idx_user_module_progress_user_roadmap ON user_module_progress(user_id, roadmap_id);
      CREATE INDEX IF NOT EXISTS idx_user_module_progress_completed ON user_module_progress(user_id, completed);
      CREATE INDEX IF NOT EXISTS idx_user_daily_streaks_user_date ON user_daily_streaks(user_id, streak_date);
    `);

    console.log('✅ Roadmap tables initialized successfully');
    res.json({ message: 'Roadmap tables initialized successfully' });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ error: 'Failed to initialize tables: ' + error.message });
  }
});

// Update module completion status
router.put('/module/:careerPathId/:moduleName', authenticateToken, async (req, res) => {
  let client;
  
  try {
    const userId = req.user.id;
    const { careerPathId, moduleName } = req.params;
    const { completed } = req.body;
    
    if (typeof completed !== 'boolean') {
      return res.status(400).json({
        status: 'error',
        message: 'Completed status must be a boolean'
      });
    }
    
    client = await pool.connect();
    await client.query('BEGIN');
    
    // Get the roadmap_id from user_career_paths
    const pathQuery = `
      SELECT roadmap_id FROM user_career_paths 
      WHERE id = $1 AND user_id = $2 AND is_active = true
    `;
    const pathResult = await client.query(pathQuery, [careerPathId, userId]);
    
    if (pathResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Career path not found'
      });
    }
    
    const roadmapId = pathResult.rows[0].roadmap_id;
    const decodedModuleName = decodeURIComponent(moduleName);
    
    // Update or insert module progress
    const updateQuery = `
      INSERT INTO user_module_progress (user_id, roadmap_id, module_name, completed, completed_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, roadmap_id, module_name)
      DO UPDATE SET 
        completed = $4,
        completed_at = $5,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const completedAt = completed ? new Date().toISOString() : null;
    const result = await client.query(updateQuery, [
      userId, 
      roadmapId, 
      decodedModuleName, 
      completed, 
      completedAt
    ]);
    
    // Update career path progress using same client
    await updateCareerPathProgressWithClient(client, userId, roadmapId);
    
    await client.query('COMMIT');
    
    // Record milestone completion in daily progress tracker (after commit)
    if (completed) {
      try {
        await DailyProgressTracker.recordMilestoneCompletion(userId, roadmapId, result.rows[0].id);
      } catch (trackerError) {
        console.error('Error recording milestone completion:', trackerError);
        // Don't fail the request if tracker fails
      }
    }
    
    res.json({
      status: 'success',
      data: { module: result.rows[0] }
    });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Error updating module:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update module'
    });
  } finally {
    if (client) {
      await client.end();
    }
  }
});

// Test endpoint to verify delete route is working
router.get('/test-delete/:careerPathId', authenticateToken, async (req, res) => {
  res.json({
    status: 'success',
    message: 'Delete route is accessible',
    careerPathId: req.params.careerPathId,
    userId: req.user.id
  });
});

// Delete career path
router.delete('/career-path/:careerPathId', authenticateToken, async (req, res) => {
  let client;
  
  try {
    const userId = req.user.id;
    const { careerPathId } = req.params;
    
    client = await pool.connect();
    await client.query('BEGIN');
    
    // Verify the career path belongs to the user
    const verifyQuery = `
      SELECT id, roadmap_id FROM user_career_paths 
      WHERE id = $1 AND user_id = $2
    `;
    const verifyResult = await client.query(verifyQuery, [careerPathId, userId]);
    
    if (verifyResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        status: 'error',
        message: 'Career path not found or access denied'
      });
    }
    
    const roadmapId = verifyResult.rows[0].roadmap_id;
    
    // Delete related records in correct order to avoid foreign key constraints
    
    // 1. Delete from user_milestone_completions if it exists
    try {
      await client.query(
        'DELETE FROM user_milestone_completions WHERE user_id = $1 AND career_path_id IN (SELECT id FROM career_paths WHERE id = $2)',
        [userId, roadmapId]
      );
    } catch (err) {
      // Table might not exist, continue
      console.log('user_milestone_completions table not found, skipping...');
    }
    
    // 2. Delete from user_career_progress_history if it exists
    try {
      await client.query(
        'DELETE FROM user_career_progress_history WHERE user_id = $1 AND career_path_id IN (SELECT id FROM career_paths WHERE id = $2)',
        [userId, roadmapId]
      );
    } catch (err) {
      // Table might not exist, continue
      console.log('user_career_progress_history table not found, skipping...');
    }
    
    // 3. Delete from daily_user_progress if it exists
    try {
      await client.query(
        'DELETE FROM daily_user_progress WHERE user_id = $1 AND career_path_id IN (SELECT id FROM career_paths WHERE id = $2)',
        [userId, roadmapId]
      );
    } catch (err) {
      // Table might not exist, continue
      console.log('daily_user_progress table not found, skipping...');
    }
    
    // 4. Delete module progress for this roadmap
    await client.query(
      'DELETE FROM user_module_progress WHERE user_id = $1 AND roadmap_id = $2',
      [userId, roadmapId]
    );
    
    // 5. Delete daily streaks for this user (only for this specific date range if needed)
    // For now, we'll keep the user's overall streaks and just delete the career path
    
    // 6. Delete the career path itself
    await client.query(
      'DELETE FROM user_career_paths WHERE id = $1 AND user_id = $2',
      [careerPathId, userId]
    );
    
    await client.query('COMMIT');
    
    res.json({
      status: 'success',
      message: 'Career path deleted successfully'
    });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Error deleting career path:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete career path: ' + error.message
    });
  } finally {
    if (client) {
      await client.end();
    }
  }
});


export default router;
