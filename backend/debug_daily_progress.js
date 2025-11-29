import DailyTrackingService from './services/dailyTrackingService.js';
import dotenv from 'dotenv';

dotenv.config();

const dailyTracker = new DailyTrackingService();

async function debugDailyProgress() {
  console.log('🔍 Debugging Daily Progress Integration');
  console.log('='.repeat(50));
  
  try {
    // Test with user ID 1
    const userId = 1;
    
    console.log('\n1️⃣ Testing getTodayProgress...');
    const todayProgress = await dailyTracker.getTodayProgress(userId);
    console.log('Today\'s progress result:', todayProgress);
    
    if (todayProgress) {
      console.log('✅ Found today\'s progress data:');
      console.log('- LeetCode solved today:', todayProgress.daily_leetcode_solved);
      console.log('- CodeChef solved today:', todayProgress.daily_codechef_solved);
      console.log('- Codeforces solved today:', todayProgress.daily_codeforces_solved);
      console.log('- Total solved today:', todayProgress.total_daily_solved);
    } else {
      console.log('❌ No progress data found for today');
      
      console.log('\n2️⃣ Testing trackDailyProgress to create today\'s data...');
      // Mock user handles for testing
      const mockHandles = {
        leetcode_handle: 'test_user',
        codechef_handle: 'test_user', 
        codeforces_handle: 'test_user'
      };
      
      try {
        const trackResult = await dailyTracker.trackDailyProgress(userId, mockHandles);
        console.log('Track result:', trackResult);
      } catch (trackError) {
        console.log('❌ Error tracking progress:', trackError.message);
      }
    }
    
    console.log('\n3️⃣ Testing how AI service processes the data...');
    
    // Simulate what the AI service does
    const mockUserContext = {
      userId: userId,
      name: 'GiriPrasad',
      coding_stats: {
        leetcode_solved: 150,
        codechef_solved: 50,
        codeforces_solved: 12
      }
    };
    
    let dailyProgress = null;
    try {
      dailyProgress = await dailyTracker.getTodayProgress(mockUserContext.userId);
      console.log('Daily progress for AI:', dailyProgress);
    } catch (error) {
      console.log('Could not fetch daily progress:', error.message);
    }
    
    const enhancedContext = {
      ...mockUserContext,
      dailyProgress: dailyProgress,
      todaysSolved: dailyProgress ? {
        leetcode: dailyProgress.daily_leetcode_solved || 0,
        codechef: dailyProgress.daily_codechef_solved || 0,
        codeforces: dailyProgress.daily_codeforces_solved || 0,
        total: dailyProgress.total_daily_solved || 0
      } : { leetcode: 0, codechef: 0, codeforces: 0, total: 0 }
    };
    
    console.log('\n📊 Enhanced context for AI:');
    console.log('- Total lifetime problems:', 
      mockUserContext.coding_stats.leetcode_solved + 
      mockUserContext.coding_stats.codechef_solved + 
      mockUserContext.coding_stats.codeforces_solved);
    console.log('- Today\'s solved problems:', enhancedContext.todaysSolved);
    
    if (enhancedContext.todaysSolved.total === 0) {
      console.log('⚠️ ISSUE IDENTIFIED: AI will see 0 problems solved today');
    } else {
      console.log('✅ AI will correctly see today\'s progress');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugDailyProgress().catch(console.error);
