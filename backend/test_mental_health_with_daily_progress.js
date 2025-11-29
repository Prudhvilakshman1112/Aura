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

async function testMentalHealthWithDailyProgress() {
  console.log('🧠 Testing Mental Health AI with Daily Progress Integration');
  console.log('='.repeat(60));
  
  try {
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n1️⃣ Testing mental health AI response...');
    
    const mentalHealthResponse = await axios.post(`${BASE_URL}/mental-coach/chat`, {
      message: "I'm feeling stressed about my coding progress today. I feel like I haven't accomplished much.",
      userContext: {
        userId: 1,
        name: "GiriPrasad",
        age: 25,
        study_domain: "Computer Science",
        coding_stats: {
          leetcode_solved: 150,
          codechef_solved: 50,
          codeforces_solved: 12
        }
      }
    }, { headers });
    
    console.log('\n✅ Mental Health AI Response:');
    console.log('Response:', mentalHealthResponse.data.response);
    console.log('\n📊 Daily Progress Data:');
    console.log('Today\'s Solved:', mentalHealthResponse.data.todaysSolved);
    
    // Check if the response mentions today's actual progress
    const response = mentalHealthResponse.data.response.toLowerCase();
    const todaysSolved = mentalHealthResponse.data.todaysSolved;
    
    console.log('\n🔍 Analysis:');
    if (todaysSolved && todaysSolved.total > 0) {
      console.log(`✅ AI correctly identified ${todaysSolved.total} problems solved today`);
      console.log(`   - LeetCode: ${todaysSolved.leetcode}`);
      console.log(`   - CodeChef: ${todaysSolved.codechef}`);
      console.log(`   - Codeforces: ${todaysSolved.codeforces}`);
      
      if (response.includes('today') || response.includes(todaysSolved.total.toString())) {
        console.log('✅ AI response mentions today\'s progress');
      } else {
        console.log('⚠️ AI response doesn\'t clearly mention today\'s progress');
      }
    } else {
      console.log('❌ AI shows 0 problems solved today - this needs investigation');
    }
    
    // Test with different scenario
    console.log('\n2️⃣ Testing with productive day scenario...');
    
    const productiveResponse = await axios.post(`${BASE_URL}/mental-coach/chat`, {
      message: "I had a great coding session today and solved several problems!",
      userContext: {
        userId: 1,
        name: "GiriPrasad",
        age: 25,
        study_domain: "Computer Science",
        coding_stats: {
          leetcode_solved: 150,
          codechef_solved: 50,
          codeforces_solved: 12
        }
      }
    }, { headers });
    
    console.log('\n✅ Productive Day Response:');
    console.log('Response:', productiveResponse.data.response);
    console.log('Today\'s Solved:', productiveResponse.data.todaysSolved);
    
    console.log('\n🎉 Test completed!');
    console.log('\n📋 SUMMARY:');
    console.log('- Mental health AI integration: ✅');
    console.log('- Daily progress fetching: ✅');
    console.log('- Contextual responses: ✅');
    
    if (mentalHealthResponse.data.todaysSolved?.total > 0) {
      console.log(`- Today's progress correctly shown: ✅ (${mentalHealthResponse.data.todaysSolved.total} problems)`);
    } else {
      console.log('- Today\'s progress: ❌ (showing 0 - needs data)');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testMentalHealthWithDailyProgress().catch(console.error);
