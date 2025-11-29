import DailyTrackingService from './services/dailyTrackingService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testDailyTrackingFix() {
  console.log('🧪 Testing Daily Tracking Fix...\n');
  
  const dailyTracker = new DailyTrackingService();
  const testUserId = 1;
  const testHandles = {
    leetcode: 'test_user',
    codechef: 'test_user', 
    codeforces: 'test_user'
  };

  try {
    // Simulate first update of the day
    console.log('📅 SCENARIO 1: First update of the day');
    console.log('Simulating user with LeetCode: 50, CodeChef: 30, Codeforces: 20');
    
    // Mock the scrapeAllStats function for testing
    const originalScrapeAllStats = (await import('./services/scraping.js')).scrapeAllStats;
    
    // First update - should store as reference
    const mockCurrentTotals1 = { leetcode: 50, codechef: 30, codeforces: 20 };
    
    // Mock scraping to return our test data
    const mockScrapeAllStats = async () => mockCurrentTotals1;
    
    // Replace the import temporarily for testing
    const scraping = await import('./services/scraping.js');
    scraping.scrapeAllStats = mockScrapeAllStats;
    
    const result1 = await dailyTracker.trackDailyProgress(testUserId, testHandles);
    
    console.log('✅ First Update Result:');
    console.log(`   - Is First Update: ${result1.isFirstUpdateToday}`);
    console.log(`   - Daily Solved: LeetCode: ${result1.dailySolved.leetcode}, CodeChef: ${result1.dailySolved.codechef}, Codeforces: ${result1.dailySolved.codeforces}`);
    console.log(`   - Total Daily: ${result1.totalDailySolved}`);
    console.log(`   - Reference Totals: LeetCode: ${result1.referenceTotals.leetcode}, CodeChef: ${result1.referenceTotals.codechef}, Codeforces: ${result1.referenceTotals.codeforces}\n`);
    
    // Wait a moment to simulate time passing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate second update of the same day (user solved more problems)
    console.log('📅 SCENARIO 2: Second update of the same day');
    console.log('User solved 3 more LeetCode, 2 more CodeChef, 1 more Codeforces');
    
    const mockCurrentTotals2 = { leetcode: 53, codechef: 32, codeforces: 21 };
    scraping.scrapeAllStats = async () => mockCurrentTotals2;
    
    const result2 = await dailyTracker.trackDailyProgress(testUserId, testHandles);
    
    console.log('✅ Second Update Result:');
    console.log(`   - Is First Update: ${result2.isFirstUpdateToday}`);
    console.log(`   - Daily Solved: LeetCode: ${result2.dailySolved.leetcode}, CodeChef: ${result2.dailySolved.codechef}, Codeforces: ${result2.dailySolved.codeforces}`);
    console.log(`   - Total Daily: ${result2.totalDailySolved}`);
    console.log(`   - Reference Totals: LeetCode: ${result2.referenceTotals.leetcode}, CodeChef: ${result2.referenceTotals.codechef}, Codeforces: ${result2.referenceTotals.codeforces}\n`);
    
    // Test getTodayProgress function
    console.log('📅 SCENARIO 3: Testing getTodayProgress');
    const todayProgress = await dailyTracker.getTodayProgress(testUserId);
    
    console.log('✅ Today\'s Progress:');
    if (todayProgress) {
      console.log(`   - LeetCode solved today: ${todayProgress.daily_leetcode_solved}`);
      console.log(`   - CodeChef solved today: ${todayProgress.daily_codechef_solved}`);
      console.log(`   - Codeforces solved today: ${todayProgress.daily_codeforces_solved}`);
      console.log(`   - Total solved today: ${todayProgress.total_daily_solved}`);
    } else {
      console.log('   - No progress found for today');
    }
    
    // Restore original function
    scraping.scrapeAllStats = originalScrapeAllStats;
    
    console.log('\n🎉 Daily Tracking Fix Test Completed!');
    console.log('Expected Results:');
    console.log('- First update should show 0 daily solved (reference point)');
    console.log('- Second update should show 6 total daily solved (3+2+1)');
    console.log('- Mental health AI should now get accurate daily progress!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testDailyTrackingFix().then(() => {
  console.log('Test completed');
  process.exit(0);
}).catch(error => {
  console.error('Test error:', error);
  process.exit(1);
});
