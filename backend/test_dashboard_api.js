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

async function testDashboardAPI() {
  console.log('📊 Testing Dashboard API Data Sync');
  console.log('='.repeat(50));
  
  try {
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n1️⃣ Testing dashboard data fetch...');
    
    const dashboardResponse = await axios.get(`${BASE_URL}/dashboard`, { headers });
    
    console.log('✅ Dashboard API Response:');
    console.log('Status:', dashboardResponse.data.status);
    console.log('User Name:', dashboardResponse.data.data?.userName);
    console.log('Coding Stats:', dashboardResponse.data.data?.codingStats);
    
    const codingStats = dashboardResponse.data.data?.codingStats;
    if (codingStats) {
      console.log('\n📈 Current Stats on Dashboard:');
      console.log(`- LeetCode: ${codingStats.leetcode}`);
      console.log(`- CodeChef: ${codingStats.codechef}`);
      console.log(`- Codeforces: ${codingStats.codeforces}`);
      console.log(`- Total: ${codingStats.total}`);
      console.log(`- Current Streak: ${codingStats.currentStreak}`);
      console.log(`- Last Updated: ${codingStats.lastUpdated}`);
    }
    
    console.log('\n2️⃣ Testing scraping update...');
    
    try {
      const updateResponse = await axios.post(`${BASE_URL}/scrape/update`, {}, { headers });
      console.log('✅ Scraping Update Response:');
      console.log('Status:', updateResponse.data.status);
      console.log('New Stats:', updateResponse.data.data?.newStats);
      console.log('Differences:', updateResponse.data.data?.differences);
    } catch (scrapeError) {
      console.log('⚠️ Scraping update failed:', scrapeError.response?.data || scrapeError.message);
    }
    
    console.log('\n3️⃣ Testing dashboard data after update...');
    
    // Wait a moment for data to be processed
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const updatedDashboardResponse = await axios.get(`${BASE_URL}/dashboard`, { headers });
    
    const updatedStats = updatedDashboardResponse.data.data?.codingStats;
    if (updatedStats) {
      console.log('\n📈 Updated Stats on Dashboard:');
      console.log(`- LeetCode: ${updatedStats.leetcode}`);
      console.log(`- CodeChef: ${updatedStats.codechef}`);
      console.log(`- Codeforces: ${updatedStats.codeforces}`);
      console.log(`- Total: ${updatedStats.total}`);
      console.log(`- Current Streak: ${updatedStats.currentStreak}`);
      console.log(`- Last Updated: ${updatedStats.lastUpdated}`);
      
      // Compare with previous stats
      if (codingStats && updatedStats.total !== codingStats.total) {
        console.log(`\n🔄 Stats Updated! Total changed from ${codingStats.total} to ${updatedStats.total}`);
      } else if (codingStats) {
        console.log('\n⚠️ Stats did not change - this might indicate the sync issue');
      }
    }
    
    console.log('\n🎉 Dashboard API test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testDashboardAPI().catch(console.error);
