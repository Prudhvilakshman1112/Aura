import ScrapingService from './scraping.js';
import pkg from 'pg';
const { Pool } = pkg;

// Database connection using environment variables (same as main app)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Aiven cloud databases
  }
});

class DailyTrackingService {
  constructor() {
    this.scrapingService = new ScrapingService();
    this.pool = pool;
  }

  /**
   * Track daily coding progress for a user
   * This function stores the first update of the day as reference and calculates differences from subsequent updates
   * @param {number} userId - User ID
   * @param {Object} userHandles - User's platform handles
   * @returns {Promise<Object>} Daily tracking result
   */
  async trackDailyProgress(userId, userHandles) {
    try {
      console.log(`📊 Starting daily tracking for user ${userId}`);
      
      // Get current totals using existing web scraping
      const currentTotals = await this.scrapingService.scrapeAllStats(userHandles);
      console.log(`🔍 Current totals scraped:`, currentTotals);
      
      const today = new Date().toISOString().split('T')[0];
      
      // Check if we already have a record for today
      const existingRecord = await this.getTodayRecord(userId, today);
      
      let referenceTotals;
      let dailySolved;
      let isFirstUpdateToday = false;
      
      if (!existingRecord) {
        // This is the FIRST update of the day - store current totals as reference
        console.log(`🌅 First update of the day - storing as reference`);
        referenceTotals = currentTotals;
        dailySolved = { leetcode: 0, codechef: 0, codeforces: 0 };
        isFirstUpdateToday = true;
      } else {
        // This is a subsequent update - calculate difference from the day's first reference
        console.log(`🔄 Subsequent update - calculating from today's reference`);
        referenceTotals = {
          leetcode: existingRecord.prev_leetcode_total,
          codechef: existingRecord.prev_codechef_total,
          codeforces: existingRecord.prev_codeforces_total
        };
        
        // Calculate daily differences from the first update of the day
        dailySolved = {
          leetcode: Math.max(0, currentTotals.leetcode - referenceTotals.leetcode),
          codechef: Math.max(0, currentTotals.codechef - referenceTotals.codechef),
          codeforces: Math.max(0, currentTotals.codeforces - referenceTotals.codeforces)
        };
      }
      
      const totalDailySolved = dailySolved.leetcode + dailySolved.codechef + dailySolved.codeforces;
      
      console.log(`📅 Reference totals (first update of day):`, referenceTotals);
      console.log(`✅ Daily solved calculated:`, dailySolved);
      console.log(`📈 Total daily solved: ${totalDailySolved}`);
      
      // Save to database
      const trackingResult = await this.saveDailyTracking(userId, {
        referenceTotals,
        currentTotals,
        dailySolved,
        totalDailySolved,
        isFirstUpdateToday
      });
      
      return {
        success: true,
        userId,
        trackingDate: today,
        dailySolved,
        totalDailySolved,
        currentTotals,
        referenceTotals,
        isFirstUpdateToday,
        trackingId: trackingResult.id
      };
      
    } catch (error) {
      console.error(`❌ Error in daily tracking for user ${userId}:`, error);
      return {
        success: false,
        error: error.message,
        userId
      };
    }
  }

  /**
   * Get today's existing record from database
   * @param {number} userId - User ID
   * @param {string} date - Date string (YYYY-MM-DD)
   * @returns {Promise<Object|null>} Today's existing record or null
   */
  async getTodayRecord(userId, date) {
    try {
      const query = `
        SELECT 
          prev_leetcode_total,
          prev_codechef_total,
          prev_codeforces_total,
          current_leetcode_total,
          current_codechef_total,
          current_codeforces_total,
          daily_leetcode_solved,
          daily_codechef_solved,
          daily_codeforces_solved,
          total_daily_solved,
          data_fetched_at
        FROM daily_coding_tracker 
        WHERE user_id = $1 AND tracking_date = $2
        LIMIT 1
      `;
      
      const result = await this.pool.query(query, [userId, date]);
      
      if (result.rows.length > 0) {
        console.log(`📊 Found existing record for today (${date})`);
        return result.rows[0];
      }
      
      console.log(`📊 No existing record for today (${date}) - this will be the first update`);
      return null;
      
    } catch (error) {
      console.error(`❌ Error getting today's record:`, error);
      return null;
    }
  }

  /**
   * Save daily tracking data to database
   * @param {number} userId - User ID
   * @param {Object} data - Tracking data
   * @returns {Promise<Object>} Saved record
   */
  async saveDailyTracking(userId, data) {
    const { referenceTotals, currentTotals, dailySolved, totalDailySolved, isFirstUpdateToday } = data;
    const today = new Date().toISOString().split('T')[0];
    
    try {
      let query;
      let values;
      
      if (isFirstUpdateToday) {
        // First update of the day - store current totals as both reference and current
        query = `
          INSERT INTO daily_coding_tracker (
            user_id, tracking_date,
            prev_leetcode_total, prev_codechef_total, prev_codeforces_total,
            current_leetcode_total, current_codechef_total, current_codeforces_total,
            daily_leetcode_solved, daily_codechef_solved, daily_codeforces_solved,
            total_daily_solved, data_fetched_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW()
          )
          RETURNING id, tracking_date
        `;
        
        values = [
          userId, today,
          // Store current totals as reference (prev_*) for future calculations
          currentTotals.leetcode, currentTotals.codechef, currentTotals.codeforces,
          // Also store as current totals
          currentTotals.leetcode, currentTotals.codechef, currentTotals.codeforces,
          // Daily solved is 0 for first update
          dailySolved.leetcode, dailySolved.codechef, dailySolved.codeforces,
          totalDailySolved
        ];
      } else {
        // Subsequent update - only update current totals and daily solved, keep reference unchanged
        query = `
          UPDATE daily_coding_tracker SET
            current_leetcode_total = $3,
            current_codechef_total = $4,
            current_codeforces_total = $5,
            daily_leetcode_solved = $6,
            daily_codechef_solved = $7,
            daily_codeforces_solved = $8,
            total_daily_solved = $9,
            data_fetched_at = NOW(),
            updated_at = NOW()
          WHERE user_id = $1 AND tracking_date = $2
          RETURNING id, tracking_date
        `;
        
        values = [
          userId, today,
          currentTotals.leetcode, currentTotals.codechef, currentTotals.codeforces,
          dailySolved.leetcode, dailySolved.codechef, dailySolved.codeforces,
          totalDailySolved
        ];
      }
      
      const result = await this.pool.query(query, values);
      console.log(`💾 Daily tracking saved to database (${isFirstUpdateToday ? 'FIRST' : 'UPDATE'}):`, result.rows[0]);
      
      // Also update the daily_solved_questions table for AI service compatibility
      try {
        // Import DailySolvedService dynamically to avoid circular dependency
        const { default: DailySolvedService } = await import('./dailySolvedService.js');
        const dailySolvedService = new DailySolvedService();
        
        // Pass the calculated daily solved values instead of raw totals
        const dailySolvedData = {
          leetcode: dailySolved.leetcode,
          codechef: dailySolved.codechef,
          codeforces: dailySolved.codeforces,
          total: totalDailySolved
        };
        
        await dailySolvedService.updateDailySolvedDirect(userId, currentTotals, dailySolvedData);
        console.log('✅ Daily solved questions table updated successfully with:', dailySolvedData);
      } catch (dailySolvedError) {
        console.error('⚠️ Failed to update daily_solved_questions table:', dailySolvedError.message);
      }
      
      return result.rows[0];
      
    } catch (error) {
      console.error(`❌ Error saving daily tracking:`, error);
      throw error;
    }
  }

  /**
   * Get daily progress for a user within a date range
   * @param {number} userId - User ID
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<Array>} Daily progress records
   */
  async getDailyProgress(userId, startDate, endDate) {
    try {
      const query = `
        SELECT 
          tracking_date,
          daily_leetcode_solved,
          daily_codechef_solved,
          daily_codeforces_solved,
          total_daily_solved,
          current_leetcode_total,
          current_codechef_total,
          current_codeforces_total,
          data_fetched_at
        FROM daily_coding_tracker
        WHERE user_id = $1 
          AND tracking_date >= $2 
          AND tracking_date <= $3
        ORDER BY tracking_date DESC
      `;
      
      const result = await this.pool.query(query, [userId, startDate, endDate]);
      return result.rows;
      
    } catch (error) {
      console.error(`❌ Error getting daily progress:`, error);
      throw error;
    }
  }

  /**
   * Get current month's daily progress summary
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Monthly summary
   */
  async getCurrentMonthSummary(userId) {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const startDate = startOfMonth.toISOString().split('T')[0];
      const endDate = endOfMonth.toISOString().split('T')[0];
      
      const dailyProgress = await this.getDailyProgress(userId, startDate, endDate);
      
      // Calculate summary statistics
      const summary = {
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        totalDays: dailyProgress.length,
        activeDays: dailyProgress.filter(day => day.total_daily_solved > 0).length,
        totalLeetCodeSolved: dailyProgress.reduce((sum, day) => sum + day.daily_leetcode_solved, 0),
        totalCodeChefSolved: dailyProgress.reduce((sum, day) => sum + day.daily_codechef_solved, 0),
        totalCodeforcesSolved: dailyProgress.reduce((sum, day) => sum + day.daily_codeforces_solved, 0),
        totalProblemsSolved: dailyProgress.reduce((sum, day) => sum + day.total_daily_solved, 0),
        averagePerDay: dailyProgress.length > 0 ? 
          (dailyProgress.reduce((sum, day) => sum + day.total_daily_solved, 0) / dailyProgress.length).toFixed(2) : 0,
        bestDay: dailyProgress.reduce((best, day) => 
          day.total_daily_solved > (best?.total_daily_solved || 0) ? day : best, null),
        dailyProgress: dailyProgress
      };
      
      return summary;
      
    } catch (error) {
      console.error(`❌ Error getting monthly summary:`, error);
      throw error;
    }
  }

  /**
   * Get today's progress for a user
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Today's progress
   */
  async getTodayProgress(userId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const progress = await this.getDailyProgress(userId, today, today);
      
      return progress.length > 0 ? progress[0] : null;
      
    } catch (error) {
      console.error(`❌ Error getting today's progress:`, error);
      throw error;
    }
  }

  /**
   * Calculate current streak for a user
   * @param {number} userId - User ID
   * @returns {Promise<number>} Current streak count
   */
  async calculateCurrentStreak(userId) {
    try {
      const query = `
        SELECT tracking_date, total_daily_solved
        FROM daily_coding_tracker
        WHERE user_id = $1 
          AND total_daily_solved > 0
        ORDER BY tracking_date DESC
        LIMIT 100
      `;
      
      const result = await this.pool.query(query, [userId]);
      const activeDays = result.rows;
      
      if (activeDays.length === 0) return 0;
      
      let streak = 0;
      const today = new Date();
      let checkDate = new Date(today);
      
      // Check each day going backwards
      for (let i = 0; i < 100; i++) {
        const dateStr = checkDate.toISOString().split('T')[0];
        const dayRecord = activeDays.find(day => day.tracking_date === dateStr);
        
        if (dayRecord && dayRecord.total_daily_solved > 0) {
          streak++;
        } else {
          break;
        }
        
        checkDate.setDate(checkDate.getDate() - 1);
      }
      
      return streak;
      
    } catch (error) {
      console.error(`❌ Error calculating streak:`, error);
      return 0;
    }
  }
}

export default DailyTrackingService;
