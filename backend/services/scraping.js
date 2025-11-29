import puppeteer from 'puppeteer';
import axios from 'axios';
import * as cheerio from 'cheerio';

// LeetCode scraper using multiple API endpoints
export async function getLeetCodeStats(handle) {
  const endpoints = [
    `https://leetcode-stats-api.herokuapp.com/${handle}`,
    `https://leetcode.com/api/problems/algorithms/`,
    `https://alfa-leetcode-api.onrender.com/${handle}/solved`
  ];

  for (const url of endpoints) {
    try {
      console.log(`🔍 Trying LeetCode API: ${url}`);
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (response.status === 200 && response.data) {
        let solved = 0;
        
        // Handle different API response formats
        if (response.data.totalSolved !== undefined) {
          solved = response.data.totalSolved;
        } else if (response.data.solvedProblem !== undefined) {
          solved = response.data.solvedProblem;
        } else if (response.data.solved !== undefined) {
          solved = response.data.solved;
        }
        
        if (solved > 0) {
          console.log(`✅ LeetCode stats found: ${solved} problems solved`);
          return solved;
        }
      }
    } catch (error) {
      console.log(`❌ LeetCode API failed: ${url} - ${error.message}`);
      continue;
    }
  }
  
  console.log('⚠️ All LeetCode APIs failed, returning 0');
  return 0;
}

// Codeforces scraper using API with enhanced error handling
export async function getCodeforcesStats(handle) {
  try {
    console.log(`🔍 Fetching Codeforces stats for: ${handle}`);
    
    if (!handle || handle.trim() === '') {
      console.log('❌ No Codeforces handle provided');
      return { totalSolved: 0, contestSolved: 0 };
    }
    
    const url = `https://codeforces.com/api/user.status?handle=${handle.trim()}`;
    const response = await axios.get(url, {
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    console.log(`📡 Codeforces API response status: ${response.status}`);
    
    if (response.data && response.data.status === 'OK') {
      const submissions = response.data.result;
      console.log(`📊 Found ${submissions.length} submissions`);
      
      const solvedProblems = new Set();
      const contestProblems = new Set();
      
      for (const sub of submissions) {
        if (sub.verdict === 'OK') {
          const problemId = `${sub.problem.contestId}-${sub.problem.index}`;
          solvedProblems.add(problemId);
          
          // Count unique contest problems (contestId > 0 indicates contest problems)
          if (sub.problem.contestId && sub.problem.contestId > 0) {
            contestProblems.add(problemId);
          }
        }
      }
      
      const totalSolved = solvedProblems.size;
      const contestSolved = contestProblems.size;
      
      console.log(`✅ Codeforces stats for ${handle}: ${totalSolved} total, ${contestSolved} contest problems`);
      return {
        totalSolved: totalSolved,
        contestSolved: contestSolved
      };
    } else {
      console.log(`❌ Codeforces API returned status: ${response.data?.status || 'unknown'}`);
      return { totalSolved: 0, contestSolved: 0 };
    }
  } catch (error) {
    console.error(`❌ Error fetching Codeforces stats for ${handle}:`, error.message);
    if (error.response) {
      console.error(`   Response status: ${error.response.status}`);
      console.error(`   Response data:`, error.response.data);
    }
    return { totalSolved: 0, contestSolved: 0 };
  }
}

// CodeChef scraper using exact Python code logic with enhanced debugging
export async function getCodeChefStats(handle) {
  try {
    console.log(`🔍 Starting CodeChef scraping for handle: ${handle}`);
    const url = `https://www.codechef.com/users/${handle}`;
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3"
    };
    
    const response = await axios.get(url, { headers });
    console.log(`📡 CodeChef response status: ${response.status}`);
    
    if (response.status === 200) {
      const $ = cheerio.load(response.data);
      console.log(`📄 HTML loaded, searching for problems solved section...`);
      
      // Debug: Log all sections with rating-data-section class
      const allSections = $('section.rating-data-section');
      console.log(`🔍 Found ${allSections.length} rating-data-section elements`);
      
      allSections.each((i, el) => {
        const classes = $(el).attr('class');
        const text = $(el).text().trim().substring(0, 100);
        console.log(`  Section ${i}: classes="${classes}", text="${text}..."`);
      });
      
      // Find the specific section for "problems-solved" - exact match from Python code
      const solvedSection = $('section.rating-data-section.problems-solved');
      console.log(`🎯 Found ${solvedSection.length} problems-solved sections`);
      
      if (solvedSection.length > 0) {
        console.log(`✅ Problems solved section found`);
        
        // Debug: Log the entire section content
        const sectionHtml = solvedSection.html();
        console.log(`📝 Section HTML: ${sectionHtml}`);
        
        // The actual count is inside an <h5> tag within this section
        const countElement = solvedSection.find('h5');
        console.log(`🔍 Found ${countElement.length} h5 elements in problems solved section`);
        
        // Look for "Total Problems Solved: X" pattern in h3 elements
        const h3Elements = solvedSection.find('h3');
        console.log(`🔍 Found ${h3Elements.length} h3 elements in problems solved section`);
        
        let foundCount = false;
        h3Elements.each((i, el) => {
          const text = $(el).text().trim();
          console.log(`📝 H3 element ${i} text: "${text}"`);
          
          // Look for "Total Problems Solved: X" pattern
          const match = text.match(/Total Problems Solved:\s*(\d+)/i);
          if (match) {
            const numericCount = parseInt(match[1], 10);
            console.log(`✅ CodeChef - ${handle}: Total questions solved = ${numericCount}`);
            foundCount = numericCount;
            return false; // Break out of each loop
          }
        });
        
        if (foundCount !== false) {
          return foundCount;
        }
        
        // Fallback: try h5 elements with parentheses pattern
        if (countElement.length > 0) {
          const fullText = countElement.text().trim();
          console.log(`📝 H5 element text: "${fullText}"`);
          
          // Extract only the number - split by '(' and take the last part, then remove ')'
          const count = fullText.split('(').pop().replace(')', '');
          console.log(`🔢 Extracted count string: "${count}"`);
          
          const numericCount = parseInt(count, 10);
          if (!isNaN(numericCount)) {
            console.log(`✅ CodeChef - ${handle}: Total questions solved = ${numericCount}`);
            return numericCount;
          } else {
            console.log(`❌ Could not parse numeric count from: "${count}"`);
          }
        } else {
          console.log("❌ Could not find the count element (h5) inside the problems solved section.");
          
          // Try alternative selectors
          const altElements = solvedSection.find('h3, h4, h6, span, div');
          console.log(`🔍 Found ${altElements.length} alternative elements in section`);
          altElements.each((i, el) => {
            const text = $(el).text().trim();
            console.log(`  Alt element ${i}: "${text}"`);
          });
        }
      } else {
        console.log("❌ Problems solved section not found. The page structure may have changed.");
        
        // Debug: Try to find any element containing "solved" or numbers
        const solvedElements = $('*:contains("Solved"), *:contains("solved"), *:contains("(")');
        console.log(`🔍 Found ${solvedElements.length} elements containing "solved" or "(":`);
        
        solvedElements.slice(0, 10).each((i, el) => {
          const text = $(el).text().trim().substring(0, 100);
          const tagName = el.tagName;
          const classes = $(el).attr('class') || '';
          console.log(`  Element ${i}: <${tagName} class="${classes}"> "${text}..."`);
        });
      }
    }
    
    console.log(`❌ CodeChef scraping failed for ${handle}, returning 0`);
    return 0;
  } catch (error) {
    console.error(`❌ Failed to fetch CodeChef profile: ${error.message}`);
    return 0;
  }
}

// Get Codeforces contest participation and streak data
export async function getCodeforcesContestData(handle) {
  try {
    const url = `https://codeforces.com/api/user.status?handle=${handle}`;
    const response = await axios.get(url);
    const data = response.data;

    if (data.status === 'OK') {
      const submissions = data.result;
      const dates = new Set();
      const solvedProblems = new Set();
      const contestProblems = new Set();
      
      // Extract unique submission dates and problem IDs with accepted verdicts
      for (const sub of submissions) {
        if (sub.verdict === 'OK') {  // Accepted solutions only
          const timestamp = sub.creationTimeSeconds;
          const date = new Date(timestamp * 1000).toISOString().split('T')[0];
          dates.add(date);
          
          // Problem is uniquely identified by contestId and index
          const problemId = `${sub.problem.contestId}-${sub.problem.index}`;
          solvedProblems.add(problemId);
          
          // Check if it's a contest problem (contestId > 0 usually indicates contest)
          if (sub.problem.contestId && sub.problem.contestId > 0) {
            contestProblems.add(problemId);
          }
        }
      }
      
      // Calculate streak
      let streak = 0;
      const currentDate = new Date();
      let checkDate = new Date(currentDate);
      
      while (true) {
        const dateStr = checkDate.toISOString().split('T')[0];
        if (dates.has(dateStr)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
      
      return {
        totalSolved: solvedProblems.size,
        contestSolved: contestProblems.size,
        streak: streak,
        activeDates: Array.from(dates)
      };
    }
    
    return { totalSolved: 0, contestSolved: 0, streak: 0, activeDates: [] };
  } catch (error) {
    console.error('Error fetching Codeforces contest data:', error.message);
    return { totalSolved: 0, contestSolved: 0, streak: 0, activeDates: [] };
  }
}

// Get CodeChef contest participation data with exact Python logic
export async function getCodeChefContestData(handle) {
  try {
    const url = `https://www.codechef.com/users/${handle}`;
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3"
    };
    
    const response = await axios.get(url, { headers });
    
    if (response.status === 200) {
      const $ = cheerio.load(response.data);
      
      // Get problems solved using exact Python logic
      let totalSolved = 0;
      const solvedSection = $('section.rating-data-section.problems-solved');
      
      if (solvedSection.length > 0) {
        const countElement = solvedSection.find('h5');
        if (countElement.length > 0) {
          const fullText = countElement.text().trim();
          const count = fullText.split('(').pop().replace(')', '');
          const numericCount = parseInt(count, 10);
          if (!isNaN(numericCount)) {
            totalSolved = numericCount;
          }
        }
      }
      
      // Extract contest-specific problems solved count
      let contestProblemsSolved = 0;
      let contestDates = [];
      
      console.log(`🏆 Looking for CodeChef contest problems solved...`);
      
      // Look for contest-specific problems solved
      // Try different selectors for contest problems
      const contestSelectors = [
        '.contest-problem-solved',
        '.rating-data-section:contains("Contest")',
        '.contest-rating-section',
        '*:contains("Contest Problems")',
        '*:contains("contest problems")',
        '.rating-data-section',
        '.contest-participate-count',
        'section:contains("Contest")',
        'div:contains("Contest")'
      ];
      
      for (const selector of contestSelectors) {
        const contestElements = $(selector);
        console.log(`🔍 Selector "${selector}" found ${contestElements.length} elements`);
        
        contestElements.each((i, el) => {
          const text = $(el).text().trim();
          console.log(`  Contest element ${i}: "${text}"`);
          
          // Look for numbers in parentheses like "Contest Problems (123)"
          const match = text.match(/\((\d+)\)/);
          if (match) {
            const count = parseInt(match[1], 10);
            if (!isNaN(count) && count > contestProblemsSolved) {
              contestProblemsSolved = count;
              console.log(`✅ Found contest problems count: ${count}`);
            }
          }
        });
      }
      
      // If no specific contest problems found, estimate from rating history
      if (contestProblemsSolved === 0) {
        console.log(`🔍 No contest problems found, checking rating history...`);
        const ratingRows = $('.rating-table tbody tr, .contest-history tr, table tr');
        let contestCount = 0;
        
        ratingRows.each((i, row) => {
          const rowText = $(row).text().trim();
          if (rowText.includes('Contest') || rowText.includes('contest') || rowText.match(/\d{2}\/\d{2}\/\d{4}/)) {
            contestCount++;
            const dateMatch = rowText.match(/\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2}/);
            if (dateMatch) {
              contestDates.push(dateMatch[0]);
            }
          }
        });
        
        // Estimate: assume average 2-3 problems solved per contest
        contestProblemsSolved = Math.floor(contestCount * 2.5);
        console.log(`📊 Estimated contest problems from ${contestCount} contests: ${contestProblemsSolved}`);
      }
      
      console.log(`✅ CodeChef contest data: problems=${contestProblemsSolved}, dates=${contestDates.length}`);
      
      return {
        totalSolved: totalSolved,
        contestProblemsSolved: contestProblemsSolved,
        contestDates: contestDates
      };
    }
    
    return { totalSolved: 0, contestsParticipated: 0, contestDates: [] };
  } catch (error) {
    console.error('Failed to fetch CodeChef contest data:', error.message);
    return { totalSolved: 0, contestsParticipated: 0, contestDates: [] };
  }
}

// Get monthly submissions for Codeforces with time constraints
export async function getCodeforcesMonthlyStats(handle, monthStart, monthEnd) {
  try {
    console.log(`🗓️ Fetching Codeforces monthly stats for: ${handle} (${monthStart} to ${monthEnd})`);
    const url = `https://codeforces.com/api/user.status?handle=${handle}`;
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (response.data.status === 'OK') {
      const submissions = response.data.result;
      const solvedProblems = new Set();
      let contestProblems = 0;
      
      const startTime = new Date(monthStart).getTime() / 1000;
      const endTime = new Date(monthEnd + 'T23:59:59').getTime() / 1000;
      
      for (const sub of submissions) {
        if (sub.verdict === 'OK' && sub.creationTimeSeconds >= startTime && sub.creationTimeSeconds <= endTime) {
          const problemId = `${sub.problem.contestId}-${sub.problem.index}`;
          solvedProblems.add(problemId);
          
          if (sub.problem.contestId && sub.problem.contestId > 0) {
            contestProblems++;
          }
        }
      }
      
      console.log(`✅ Codeforces monthly stats: ${solvedProblems.size} problems in current month`);
      return {
        totalSolved: solvedProblems.size,
        contestSolved: contestProblems
      };
    }
    
    return { totalSolved: 0, contestSolved: 0 };
  } catch (error) {
    console.error('❌ Error fetching Codeforces monthly stats:', error.message);
    return { totalSolved: 0, contestSolved: 0 };
  }
}

// Get monthly submissions for LeetCode with time constraints
export async function getLeetCodeMonthlyStats(handle, monthStart, monthEnd) {
  try {
    console.log(`🗓️ Fetching LeetCode monthly stats for: ${handle} (${monthStart} to ${monthEnd})`);
    
    // Since LeetCode APIs don't provide submission dates, we'll use a different approach
    // We'll get current total and compare with stored baseline from month start
    const currentTotal = await getLeetCodeStats(handle);
    
    console.log(`✅ LeetCode current total: ${currentTotal} (monthly calculation will be done server-side)`);
    return currentTotal;
  } catch (error) {
    console.error('❌ Error fetching LeetCode monthly stats:', error.message);
    return 0;
  }
}

// Get monthly submissions for CodeChef with time constraints  
export async function getCodeChefMonthlyStats(handle, monthStart, monthEnd) {
  try {
    console.log(`🗓️ Fetching CodeChef monthly stats for: ${handle} (${monthStart} to ${monthEnd})`);
    
    // Since CodeChef scraping doesn't provide submission dates, we'll get current total
    // Monthly calculation will be done server-side by comparing with baseline
    const currentTotal = await getCodeChefStats(handle);
    
    console.log(`✅ CodeChef current total: ${currentTotal} (monthly calculation will be done server-side)`);
    return currentTotal;
  } catch (error) {
    console.error('❌ Error fetching CodeChef monthly stats:', error.message);
    return 0;
  }
}

// NEW: Monthly scraping function for View Analytics button
export async function scrapeMonthlyStats(userHandles, monthStart, monthEnd) {
  console.log('🗓️ Starting monthly scrapeStats with handles:', userHandles);
  console.log(`📅 Month range: ${monthStart} to ${monthEnd}`);
  
  const results = {
    leetcode: 0,
    codechef: 0,
    codeforces: 0,
    codechef_contests: 0,
    current_streak: 0,
    isMonthlyData: true
  };

  try {
    // LeetCode monthly scraping
    if (userHandles.leetcode_handle) {
      console.log(`📊 Scraping LeetCode monthly for handle: ${userHandles.leetcode_handle}`);
      results.leetcode = await getLeetCodeMonthlyStats(userHandles.leetcode_handle, monthStart, monthEnd);
      console.log(`✅ LeetCode monthly result: ${results.leetcode}`);
    }
    
    // CodeChef monthly scraping
    if (userHandles.codechef_handle) {
      console.log(`📊 Scraping CodeChef monthly for handle: ${userHandles.codechef_handle}`);
      results.codechef = await getCodeChefMonthlyStats(userHandles.codechef_handle, monthStart, monthEnd);
      console.log(`✅ CodeChef monthly result: ${results.codechef}`);
    }
    
    // Codeforces monthly scraping
    if (userHandles.codeforces_handle) {
      console.log(`📊 Scraping Codeforces monthly for handle: ${userHandles.codeforces_handle}`);
      const codeforcesData = await getCodeforcesMonthlyStats(userHandles.codeforces_handle, monthStart, monthEnd);
      results.codeforces = {
        totalSolved: codeforcesData.totalSolved,
        contestSolved: codeforcesData.contestSolved
      };
      console.log(`✅ Codeforces monthly result:`, results.codeforces);
    }
    
    console.log('🎉 Final monthly scraping results:', results);
    return results;
  } catch (error) {
    console.error('❌ Error in scrapeMonthlyStats:', error);
    return results;
  }
}

// EXISTING: Main scraping function that gets all stats for a user (UNCHANGED)
export async function scrapeAllStats(userHandles) {
  console.log('🚀 Starting scrapeAllStats with handles:', userHandles);
  
  const results = {
    leetcode: 0,
    codechef: 0,
    codeforces: 0,
    codechef_contests: 0,
    current_streak: 0
  };

  try {
    // LeetCode scraping
    if (userHandles.leetcode_handle) {
      console.log(`📊 Scraping LeetCode for handle: ${userHandles.leetcode_handle}`);
      results.leetcode = await getLeetCodeStats(userHandles.leetcode_handle);
      console.log(`✅ LeetCode result: ${results.leetcode}`);
    }
    
    // CodeChef scraping - get total problems solved
    if (userHandles.codechef_handle) {
      console.log(`📊 Scraping CodeChef for handle: ${userHandles.codechef_handle}`);
      results.codechef = await getCodeChefStats(userHandles.codechef_handle);
      console.log(`✅ CodeChef result: ${results.codechef}`);
      
      // Get contest data separately
      const contestData = await getCodeChefContestData(userHandles.codechef_handle);
      results.codechef_contests = contestData.contestProblemsSolved || 0;
      console.log(`✅ CodeChef contest problems: ${results.codechef_contests}`);
    }
    
    // Codeforces scraping
    if (userHandles.codeforces_handle) {
      console.log(`📊 Scraping Codeforces for handle: ${userHandles.codeforces_handle}`);
      const codeforcesData = await getCodeforcesStats(userHandles.codeforces_handle);
      results.codeforces = codeforcesData.totalSolved || 0;
      console.log(`✅ Codeforces result: ${results.codeforces}`);
      
      // Get additional contest data for streak
      try {
        const contestData = await getCodeforcesContestData(userHandles.codeforces_handle);
        results.current_streak = contestData.streak || 0;
        console.log(`✅ Current streak: ${results.current_streak}`);
      } catch (error) {
        console.log(`⚠️ Could not fetch contest data for streak: ${error.message}`);
        results.current_streak = 0;
      }
    }
    
    console.log('🎉 Final scraping results:', results);
    return results;
  } catch (error) {
    console.error('❌ Error in scrapeAllStats:', error);
    return results;
  }
}

// Export as default class for compatibility
class ScrapingService {
  async scrapeAllStats(handles) {
    return await scrapeAllStats(handles);
  }
}

export default ScrapingService;
