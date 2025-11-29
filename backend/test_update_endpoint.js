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

async function testUpdateEndpoint() {
  console.log('🧪 Testing Update Stats Endpoint');
  console.log('='.repeat(40));
  
  try {
    console.log('\n📡 Making POST request to /api/scrape/update...');
    
    const response = await axios.post(`${BASE_URL}/scrape/update`, {}, { 
      headers,
      timeout: 30000 // 30 second timeout
    });
    
    console.log('\n✅ Response received:');
    console.log('Status Code:', response.status);
    console.log('Response Data:', JSON.stringify(response.data, null, 2));
    
    if (response.data.status === 'success') {
      console.log('\n🎉 SUCCESS: Update endpoint is working!');
      console.log('New Stats:', response.data.data?.newStats);
      console.log('Differences:', response.data.data?.differences);
    } else {
      console.log('\n⚠️ Response indicates failure:', response.data.message);
    }
    
  } catch (error) {
    console.error('\n❌ Request failed:');
    
    if (error.response) {
      console.log('Status Code:', error.response.status);
      console.log('Response Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.log('No response received - server might be down');
      console.log('Request details:', error.request);
    } else {
      console.log('Error setting up request:', error.message);
    }
  }
}

testUpdateEndpoint().catch(console.error);
