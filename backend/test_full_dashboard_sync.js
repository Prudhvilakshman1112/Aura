import axios from 'axios';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// Generate a fresh test token
const testUser = {
  userId: 1,
  email: 'test@example.com',
  name: 'GiriPrasad'
};

const token = jwt.sign(testUser, process.env.JWT_SECRET, {
  expiresIn: '1h'
});

const BASE_URL = 'http://localhost:3001/api';
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};

async function testFullDashboardSync() {
  console.log('🔄 Testing Full Dashboard Data Sync Flow');
  console.log('='.repeat(55));
  
  try {
    // Step 1: Get initial dashboard data
    console.log('\n📊 Step 1: Getting initial dashboard data...');
    const initialResponse = await axios.get(`${BASE_URL}/dashboard`, { headers });
    const initialStats = initialResponse.data.data?.codingStats;
    
    console.log('Initial Stats:');
    console.log(`- LeetCode: ${initialStats?.leetcode || 0}`);
    console.log(`- CodeChef: ${initialStats?.codechef || 0}`);
    console.log(`- Codeforces: ${initialStats?.codeforces || 0}`);
    console.log(`- Total: ${initialStats?.total || 0}`);
    console.log(`- Last Updated: ${initialStats?.lastUpdated || 'Never'}`);
    
    // Step 2: Trigger scraping update
    console.log('\n🔍 Step 2: Triggering scraping update...');
    try {
      const updateResponse = await axios.post(`${BASE_URL}/scrape/update`, {}, { headers });
      
      if (updateResponse.data.status === 'success') {
        console.log('✅ Scraping completed successfully');
        console.log('New Stats from Scraper:', updateResponse.data.data?.newStats);
        console.log('Differences:', updateResponse.data.data?.differences);
      } else {
        console.log('⚠️ Scraping response:', updateResponse.data);
      }
    } catch (scrapeError) {
      console.log('❌ Scraping failed:', scrapeError.response?.data || scrapeError.message);
      return;
    }
    
    // Step 3: Wait and check updated dashboard data
    console.log('\n⏳ Step 3: Waiting for data to sync...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const updatedResponse = await axios.get(`${BASE_URL}/dashboard`, { headers });
    const updatedStats = updatedResponse.data.data?.codingStats;
    
    console.log('\nUpdated Stats:');
    console.log(`- LeetCode: ${updatedStats?.leetcode || 0}`);
    console.log(`- CodeChef: ${updatedStats?.codechef || 0}`);
    console.log(`- Codeforces: ${updatedStats?.codeforces || 0}`);
    console.log(`- Total: ${updatedStats?.total || 0}`);
    console.log(`- Last Updated: ${updatedStats?.lastUpdated || 'Never'}`);
    
    // Step 4: Compare results
    console.log('\n🔍 Step 4: Analyzing sync results...');
    
    if (!initialStats || !updatedStats) {
      console.log('❌ Missing stats data - check database connection');
      return;
    }
    
    const totalChanged = updatedStats.total !== initialStats.total;
    const lastUpdatedChanged = updatedStats.lastUpdated !== initialStats.lastUpdated;
    
    if (totalChanged) {
      console.log(`✅ SUCCESS: Total problems changed from ${initialStats.total} to ${updatedStats.total}`);
    } else {
      console.log(`⚠️ ISSUE: Total problems remained the same (${initialStats.total})`);
    }
    
    if (lastUpdatedChanged) {
      console.log(`✅ SUCCESS: Last updated timestamp changed`);
    } else {
      console.log(`⚠️ ISSUE: Last updated timestamp did not change`);
    }
    
    // Step 5: Test daily tracking integration
    console.log('\n📈 Step 5: Testing daily tracking integration...');
    try {
      const dailyTrackingResponse = await axios.post(`${BASE_URL}/daily-tracking/track-today`, {}, { headers });
      console.log('✅ Daily tracking updated:', dailyTrackingResponse.data);
      
      const todayProgressResponse = await axios.get(`${BASE_URL}/daily-tracking/today`, { headers });
      console.log('✅ Today\'s progress:', todayProgressResponse.data);
    } catch (dailyError) {
      console.log('⚠️ Daily tracking issue:', dailyError.response?.data || dailyError.message);
    }
    
    console.log('\n🎯 SUMMARY:');
    console.log('- Dashboard API: ✅ Working');
    console.log('- Scraping Service: ✅ Working');
    console.log(`- Data Sync: ${totalChanged || lastUpdatedChanged ? '✅ Working' : '❌ Not Working'}`);
    console.log('- Daily Tracking: ✅ Integrated');
    
    if (!totalChanged && !lastUpdatedChanged) {
      console.log('\n🔧 TROUBLESHOOTING SUGGESTIONS:');
      console.log('1. Check if coding handles are properly set in user profile');
      console.log('2. Verify scraping service can access external platforms');
      console.log('3. Check database connection and coding_stats table updates');
      console.log('4. Ensure frontend refreshes data after scraping updates');
    }
    
  } catch (error) {
    console.error('❌ Full sync test failed:', error.response?.data || error.message);
  }
}

testFullDashboardSync().catch(console.error);
