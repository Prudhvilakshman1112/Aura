import { pool } from './config/database.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

async function checkUserProfile() {
  console.log('👤 Checking User Profile Configuration');
  console.log('='.repeat(45));
  
  let client;
  
  try {
    client = await pool.connect();
    
    // Check user profile for coding handles
    console.log('\n1️⃣ Checking user profile data...');
    const profileQuery = `
      SELECT 
        u.id, u.name, u.email,
        up.leetcode_handle, up.codechef_handle, up.codeforces_handle
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE u.id = $1
    `;
    
    const profileResult = await client.query(profileQuery, [1]);
    
    if (profileResult.rows.length === 0) {
      console.log('❌ User not found in database');
      return;
    }
    
    const user = profileResult.rows[0];
    console.log('User Info:');
    console.log(`- ID: ${user.id}`);
    console.log(`- Name: ${user.name}`);
    console.log(`- Email: ${user.email}`);
    console.log('\nCoding Handles:');
    console.log(`- LeetCode: ${user.leetcode_handle || 'NOT SET'}`);
    console.log(`- CodeChef: ${user.codechef_handle || 'NOT SET'}`);
    console.log(`- Codeforces: ${user.codeforces_handle || 'NOT SET'}`);
    
    // Check current coding stats
    console.log('\n2️⃣ Checking current coding stats...');
    const statsQuery = `
      SELECT 
        leetcode_solved, codechef_solved, codeforces_solved,
        current_streak, last_updated
      FROM coding_stats
      WHERE user_id = $1
    `;
    
    const statsResult = await client.query(statsQuery, [1]);
    
    if (statsResult.rows.length === 0) {
      console.log('❌ No coding stats found - creating initial record...');
      
      const insertStatsQuery = `
        INSERT INTO coding_stats (user_id, leetcode_solved, codechef_solved, codeforces_solved, current_streak, last_updated)
        VALUES ($1, 0, 0, 0, 0, NOW())
        RETURNING *
      `;
      
      const newStats = await client.query(insertStatsQuery, [1]);
      console.log('✅ Created initial coding stats record:', newStats.rows[0]);
    } else {
      const stats = statsResult.rows[0];
      console.log('Current Stats:');
      console.log(`- LeetCode: ${stats.leetcode_solved}`);
      console.log(`- CodeChef: ${stats.codechef_solved}`);
      console.log(`- Codeforces: ${stats.codeforces_solved}`);
      console.log(`- Total: ${stats.leetcode_solved + stats.codechef_solved + stats.codeforces_solved}`);
      console.log(`- Current Streak: ${stats.current_streak}`);
      console.log(`- Last Updated: ${stats.last_updated}`);
    }
    
    // Check if handles are missing and suggest setup
    const missingHandles = [];
    if (!user.leetcode_handle) missingHandles.push('LeetCode');
    if (!user.codechef_handle) missingHandles.push('CodeChef');
    if (!user.codeforces_handle) missingHandles.push('Codeforces');
    
    if (missingHandles.length > 0) {
      console.log('\n⚠️ MISSING HANDLES DETECTED:');
      console.log(`Missing: ${missingHandles.join(', ')}`);
      console.log('\n🔧 SOLUTION: Update user profile with coding handles');
      console.log('Example SQL to fix:');
      console.log(`UPDATE user_profiles SET`);
      if (!user.leetcode_handle) console.log(`  leetcode_handle = 'your_leetcode_username',`);
      if (!user.codechef_handle) console.log(`  codechef_handle = 'your_codechef_username',`);
      if (!user.codeforces_handle) console.log(`  codeforces_handle = 'your_codeforces_username'`);
      console.log(`WHERE user_id = 1;`);
    } else {
      console.log('\n✅ All coding handles are configured');
    }
    
  } catch (error) {
    console.error('❌ Error checking user profile:', error.message);
  } finally {
    if (client) {
      client.release();
    }
  }
}

checkUserProfile().catch(console.error);
