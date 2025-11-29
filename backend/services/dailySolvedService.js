import pkg from 'pg';
const { Pool } = pkg;

// Database connection using environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

class DailySolvedService {
  constructor() {
    this.pool = pool;
  }

  /**
   * Update daily solved questions when coding stats change
   * @param {number} userId - User ID
   * @param {Object} totals - Current totals { leetcode, codechef, codeforces }
   * @returns {Promise<Object>} Updated daily solved data
   */
  async updateDailySolved(userId, totals) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Check if record exists for today
      const existingQuery = `
        SELECT * FROM daily_solved_questions 
        WHERE user_id = $1 AND date = $2
      `;
      const existingResult = await this.pool.query(existingQuery, [userId, today]);
      
      if (existingResult.rows.length === 0) {
        // First update of the day - store current totals as start reference
        const insertQuery = `
          INSERT INTO daily_solved_questions (
            user_id, date,
            leetcode_solved_today, codechef_solved_today, codeforces_solved_today, total_solved_today,
            leetcode_start_total, codechef_start_total, codeforces_start_total,
            leetcode_current_total, codechef_current_total, codeforces_current_total
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING *
        `;
        
        const result = await this.pool.query(insertQuery, [
          userId, today,
          0, 0, 0, 0, // Daily solved starts at 0
          totals.leetcode, totals.codechef, totals.codeforces, // Start totals
          totals.leetcode, totals.codechef, totals.codeforces  // Current totals
        ]);
        
        console.log(`🌅 First update today - stored reference totals:`, totals);
        return result.rows[0];
      } else {
        // Subsequent update - calculate daily solved from start totals
        const existing = existingResult.rows[0];
        const dailySolved = {
          leetcode: Math.max(0, totals.leetcode - existing.leetcode_start_total),
          codechef: Math.max(0, totals.codechef - existing.codechef_start_total),
          codeforces: Math.max(0, totals.codeforces - existing.codeforces_start_total)
        };
        const totalDaily = dailySolved.leetcode + dailySolved.codechef + dailySolved.codeforces;
        
        const updateQuery = `
          UPDATE daily_solved_questions SET
            leetcode_current_total = $3,
            codechef_current_total = $4,
            codeforces_current_total = $5,
            leetcode_solved_today = $6,
            codechef_solved_today = $7,
            codeforces_solved_today = $8,
            total_solved_today = $9,
            updated_at = NOW()
          WHERE user_id = $1 AND date = $2
          RETURNING *
        `;
        
        const result = await this.pool.query(updateQuery, [
          userId, today,
          totals.leetcode, totals.codechef, totals.codeforces,
          dailySolved.leetcode, dailySolved.codechef, dailySolved.codeforces,
          totalDaily
        ]);
        
        console.log(`🔄 Updated daily solved:`, dailySolved, `Total: ${totalDaily}`);
        return result.rows[0];
      }
    } catch (error) {
      console.error('❌ Error updating daily solved:', error);
      throw error;
    }
  }

  /**
   * Get today's solved questions for a user
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>} Today's solved data
   */
  async getTodaysSolved(userId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const query = `
        SELECT 
          leetcode_solved_today,
          codechef_solved_today,
          codeforces_solved_today,
          total_solved_today,
          date,
          updated_at
        FROM daily_solved_questions 
        WHERE user_id = $1 AND date = $2
      `;
      
      const result = await this.pool.query(query, [userId, today]);
      
      if (result.rows.length > 0) {
        const data = result.rows[0];
        console.log(`📊 Today's solved for user ${userId}:`, {
          leetcode: data.leetcode_solved_today,
          codechef: data.codechef_solved_today,
          codeforces: data.codeforces_solved_today,
          total: data.total_solved_today
        });
        return data;
      } else {
        console.log(`📊 No record found for today for user ${userId}`);
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting today\'s solved:', error);
      return null;
    }
  }

  /**
   * Update daily solved with pre-calculated values (used by daily tracking service)
   * @param {number} userId - User ID
   * @param {Object} totals - Current totals { leetcode, codechef, codeforces }
   * @param {Object} dailySolvedData - Pre-calculated daily solved data
   * @returns {Promise<Object>} Updated daily solved data
   */
  async updateDailySolvedDirect(userId, totals, dailySolvedData) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Check if record exists for today
      const existingQuery = `
        SELECT * FROM daily_solved_questions 
        WHERE user_id = $1 AND date = $2
      `;
      const existingResult = await this.pool.query(existingQuery, [userId, today]);
      
      if (existingResult.rows.length === 0) {
        // First update of the day - store current totals as start reference
        const insertQuery = `
          INSERT INTO daily_solved_questions (
            user_id, date,
            leetcode_solved_today, codechef_solved_today, codeforces_solved_today, total_solved_today,
            leetcode_start_total, codechef_start_total, codeforces_start_total,
            leetcode_current_total, codechef_current_total, codeforces_current_total
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING *
        `;
        
        const result = await this.pool.query(insertQuery, [
          userId, today,
          dailySolvedData.leetcode, dailySolvedData.codechef, dailySolvedData.codeforces, dailySolvedData.total,
          totals.leetcode, totals.codechef, totals.codeforces,
          totals.leetcode, totals.codechef, totals.codeforces
        ]);
        
        console.log(`🌅 First update today - stored daily solved:`, dailySolvedData);
        return result.rows[0];
      } else {
        // Update with pre-calculated values
        const updateQuery = `
          UPDATE daily_solved_questions SET
            leetcode_current_total = $3,
            codechef_current_total = $4,
            codeforces_current_total = $5,
            leetcode_solved_today = $6,
            codechef_solved_today = $7,
            codeforces_solved_today = $8,
            total_solved_today = $9,
            updated_at = NOW()
          WHERE user_id = $1 AND date = $2
          RETURNING *
        `;
        
        const result = await this.pool.query(updateQuery, [
          userId, today,
          totals.leetcode, totals.codechef, totals.codeforces,
          dailySolvedData.leetcode, dailySolvedData.codechef, dailySolvedData.codeforces,
          dailySolvedData.total
        ]);
        
        console.log(`🔄 Updated daily solved with pre-calculated:`, dailySolvedData);
        return result.rows[0];
      }
    } catch (error) {
      console.error('❌ Error updating daily solved direct:', error);
      throw error;
    }
  }

  /**
   * Get solved questions for a date range
   * @param {number} userId - User ID
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<Array>} Array of daily solved records
   */
  async getSolvedByDateRange(userId, startDate, endDate) {
    try {
      const query = `
        SELECT 
          date,
          leetcode_solved_today,
          codechef_solved_today,
          codeforces_solved_today,
          total_solved_today,
          updated_at
        FROM daily_solved_questions 
        WHERE user_id = $1 AND date >= $2 AND date <= $3
        ORDER BY date DESC
      `;
      
      const result = await this.pool.query(query, [userId, startDate, endDate]);
      return result.rows;
    } catch (error) {
      console.error('❌ Error getting solved by date range:', error);
      return [];
    }
  }
}

export default DailySolvedService;
