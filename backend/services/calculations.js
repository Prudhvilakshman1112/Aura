import pool from '../config/database.js';

// Calculate BMI
export function calculateBMI(heightCm, weightKg) {
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) {
    return null;
  }
  
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  return Math.round(bmi * 10) / 10; // Round to 1 decimal place
}

// Get BMI category
export function getBMICategory(bmi) {
  if (!bmi) return null;
  
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal weight';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

// Calculate current streak
export async function calculateCurrentStreak(userId) {
  const client = await pool.connect();
  
  try {
    // Get all activity dates for the user, ordered by date descending
    const query = `
      SELECT activity_date 
      FROM daily_activity 
      WHERE user_id = $1 
      ORDER BY activity_date DESC
    `;
    
    const result = await client.query(query, [userId]);
    const dates = result.rows.map(row => new Date(row.activity_date));
    
    if (dates.length === 0) return 0;
    
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if the most recent activity was today or yesterday
    const mostRecent = new Date(dates[0]);
    mostRecent.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.floor((today - mostRecent) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 1) {
      return 0; // Streak is broken if last activity was more than 1 day ago
    }
    
    // Count consecutive days
    let currentDate = new Date(dates[0]);
    currentDate.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < dates.length; i++) {
      const activityDate = new Date(dates[i]);
      activityDate.setHours(0, 0, 0, 0);
      
      if (activityDate.getTime() === currentDate.getTime()) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    return streak;
  } catch (error) {
    console.error('Error calculating current streak:', error);
    return 0;
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Calculate best streak
export async function calculateBestStreak(userId) {
  const client = await pool.connect();
  
  try {
    const query = `
      SELECT activity_date 
      FROM daily_activity 
      WHERE user_id = $1 
      ORDER BY activity_date ASC
    `;
    
    const result = await client.query(query, [userId]);
    const dates = result.rows.map(row => new Date(row.activity_date));
    
    if (dates.length === 0) return 0;
    
    let maxStreak = 1;
    let currentStreak = 1;
    
    for (let i = 1; i < dates.length; i++) {
      const prevDate = new Date(dates[i - 1]);
      const currDate = new Date(dates[i]);
      
      const daysDiff = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 1) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }
    
    return maxStreak;
  } catch (error) {
    console.error('Error calculating best streak:', error);
    return 0;
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Calculate active days this month
export async function calculateActiveDaysThisMonth(userId) {
  const client = await pool.connect();
  
  try {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const query = `
      SELECT COUNT(*) as active_days
      FROM daily_activity 
      WHERE user_id = $1 
      AND activity_date >= $2 
      AND activity_date <= $3
    `;
    
    const result = await client.query(query, [userId, firstDayOfMonth, lastDayOfMonth]);
    return parseInt(result.rows[0].active_days, 10);
  } catch (error) {
    console.error('Error calculating active days this month:', error);
    return 0;
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Get contribution data for the last 365 days
export async function getContributionData(userId) {
  const client = await pool.connect();
  
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 365);
    
    const query = `
      SELECT activity_date, problems_solved
      FROM daily_activity 
      WHERE user_id = $1 
      AND activity_date >= $2 
      AND activity_date <= $3
      ORDER BY activity_date ASC
    `;
    
    const result = await client.query(query, [userId, startDate, endDate]);
    
    // Create a map of date -> problems_solved
    const contributionMap = {};
    result.rows.forEach(row => {
      const dateStr = row.activity_date.toISOString().split('T')[0];
      contributionMap[dateStr] = row.problems_solved;
    });
    
    // Generate array of all dates in the range with contribution counts
    const contributions = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      contributions.push({
        date: dateStr,
        count: contributionMap[dateStr] || 0
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return contributions;
  } catch (error) {
    console.error('Error getting contribution data:', error);
    return [];
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Calculate monthly progress percentage
export async function calculateMonthlyProgress(userId) {
  let client;
  
  try {
    client = await pool.connect();
    return await calculateMonthlyProgressWithClient(client, userId);
  } catch (error) {
    console.error('Error calculating monthly progress:', error);
    return { current: 0, goal: 50, percentage: 0 };
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Calculate monthly progress using existing client (avoids connection pool conflicts)
export async function calculateMonthlyProgressWithClient(client, userId) {
  try {
    // Get user's monthly goal
    const goalQuery = `
      SELECT monthly_coding_goal 
      FROM user_goals 
      WHERE user_id = $1
    `;
    const goalResult = await client.query(goalQuery, [userId]);
    const monthlyGoal = goalResult.rows[0]?.monthly_coding_goal || 50;
    
    // Get problems solved this month
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const progressQuery = `
      SELECT COALESCE(SUM(problems_solved), 0) as total_solved
      FROM daily_activity 
      WHERE user_id = $1 
      AND activity_date >= $2 
      AND activity_date <= $3
    `;
    
    const progressResult = await client.query(progressQuery, [userId, firstDayOfMonth, lastDayOfMonth]);
    const totalSolved = parseInt(progressResult.rows[0].total_solved, 10);
    
    const percentage = Math.min(Math.round((totalSolved / monthlyGoal) * 100), 100);
    
    return {
      current: totalSolved,
      goal: monthlyGoal,
      percentage
    };
  } catch (error) {
    console.error('Error calculating monthly progress with client:', error);
    return { current: 0, goal: 50, percentage: 0 };
  }
}
