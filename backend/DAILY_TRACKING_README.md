# Daily Coding Tracker - Implementation Guide

## Overview

The Daily Coding Tracker system tracks the exact number of questions solved on each specific day by calculating differences between consecutive day totals from LeetCode, CodeChef, and Codeforces platforms.

## Key Features

- **Daily Progress Calculation**: Automatically calculates today's solved questions by comparing current totals with previous day's totals
- **Platform Support**: Tracks LeetCode, CodeChef, and Codeforces separately and combined
- **Non-Intrusive**: Uses existing web scraping functions without modifying them
- **Timestamp Tracking**: Records when data was fetched for accuracy
- **Streak Calculation**: Calculates current coding streaks based on daily activity
- **Historical Data**: Maintains complete history of daily progress

## Database Schema

### New Table: `daily_coding_tracker`

```sql
CREATE TABLE daily_coding_tracker (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    tracking_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Previous day totals (for calculation reference)
    prev_leetcode_total INTEGER DEFAULT 0,
    prev_codechef_total INTEGER DEFAULT 0,
    prev_codeforces_total INTEGER DEFAULT 0,
    
    -- Current day totals (from web scraping)
    current_leetcode_total INTEGER DEFAULT 0,
    current_codechef_total INTEGER DEFAULT 0,
    current_codeforces_total INTEGER DEFAULT 0,
    
    -- Daily solved counts (calculated difference)
    daily_leetcode_solved INTEGER DEFAULT 0,
    daily_codechef_solved INTEGER DEFAULT 0,
    daily_codeforces_solved INTEGER DEFAULT 0,
    
    -- Total daily solved across platforms
    total_daily_solved INTEGER DEFAULT 0,
    
    -- Timestamps
    data_fetched_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, tracking_date)
);
```

## Setup Instructions

### 1. Run Database Migration

Execute the migration to create the new table:

```bash
# Navigate to backend directory
cd backend

# Run the migration batch file
./execute_daily_tracking_migration.bat

# Or run manually with psql
psql -U postgres -d aura_synergy_hub -f migrations/create_daily_coding_tracker.sql
```

### 2. Start the Server

The daily tracking routes are automatically registered when you start the server:

```bash
npm start
```

## API Endpoints

All endpoints require authentication token in Authorization header.

### 1. Track Today's Progress
```http
POST /api/daily-tracking/track-today
```

**Description**: Scrapes current totals and calculates today's solved questions

**Response**:
```json
{
  "success": true,
  "message": "Daily progress tracked successfully",
  "data": {
    "userId": 1,
    "trackingDate": "2024-01-15",
    "dailySolved": {
      "leetcode": 3,
      "codechef": 2,
      "codeforces": 1
    },
    "totalDailySolved": 6,
    "currentTotals": {
      "leetcode": 150,
      "codechef": 89,
      "codeforces": 45
    },
    "previousTotals": {
      "leetcode": 147,
      "codechef": 87,
      "codeforces": 44
    }
  }
}
```

### 2. Get Today's Progress
```http
GET /api/daily-tracking/today
```

**Response**:
```json
{
  "success": true,
  "data": {
    "tracking_date": "2024-01-15",
    "daily_leetcode_solved": 3,
    "daily_codechef_solved": 2,
    "daily_codeforces_solved": 1,
    "total_daily_solved": 6,
    "current_leetcode_total": 150,
    "current_codechef_total": 89,
    "current_codeforces_total": 45,
    "data_fetched_at": "2024-01-15T10:30:00Z"
  }
}
```

### 3. Get Daily Progress Range
```http
GET /api/daily-tracking/progress?startDate=2024-01-01&endDate=2024-01-15
```

**Response**: Array of daily progress records

### 4. Get Monthly Summary
```http
GET /api/daily-tracking/monthly-summary
```

**Response**:
```json
{
  "success": true,
  "data": {
    "month": 1,
    "year": 2024,
    "totalDays": 15,
    "activeDays": 12,
    "totalLeetCodeSolved": 45,
    "totalCodeChefSolved": 30,
    "totalCodeforcesSolved": 18,
    "totalProblemsSolved": 93,
    "averagePerDay": "6.20",
    "bestDay": {
      "tracking_date": "2024-01-10",
      "total_daily_solved": 12
    },
    "dailyProgress": [...]
  }
}
```

### 5. Get Current Streak
```http
GET /api/daily-tracking/streak
```

**Response**:
```json
{
  "success": true,
  "data": {
    "currentStreak": 7
  }
}
```

### 6. Get Weekly Summary
```http
GET /api/daily-tracking/weekly-summary
```

**Response**: Last 7 days summary with statistics

## How It Works

### Daily Calculation Logic

1. **Current Totals**: Uses existing `scrapeAllStats()` function to get current total problems solved
2. **Previous Totals**: Retrieves yesterday's totals from `daily_coding_tracker` table
3. **Daily Difference**: Calculates `current - previous = daily_solved`
4. **Validation**: Ensures daily counts are never negative (handles edge cases)
5. **Storage**: Saves all data with timestamps for future reference

### Example Calculation

```javascript
// Day 1: User has 100 LeetCode problems
// Day 2: User has 103 LeetCode problems
// Daily solved = 103 - 100 = 3 problems solved on Day 2
```

### Fallback Strategy

If no previous day data exists:
1. Check `daily_coding_tracker` table first
2. Fallback to `coding_stats` table (current totals)
3. Default to zero if no baseline exists

## Integration with Existing Code

### Preserves Original Functionality
- **No modifications** to existing `scraping.js` functions
- **No changes** to existing `scrapeAllStats()` behavior  
- **No impact** on current total counting system
- **Maintains** all existing API endpoints

### Uses Existing Infrastructure
- Leverages existing web scraping functions
- Uses existing authentication middleware
- Follows existing database patterns
- Maintains existing error handling

## Usage Examples

### Frontend Integration

```javascript
// Track today's progress
const trackToday = async () => {
  const response = await fetch('/api/daily-tracking/track-today', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  const result = await response.json();
  console.log('Today solved:', result.data.totalDailySolved);
};

// Get monthly summary
const getMonthlyStats = async () => {
  const response = await fetch('/api/daily-tracking/monthly-summary', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const result = await response.json();
  console.log('Monthly total:', result.data.totalProblemsSolved);
};
```

### Automated Daily Tracking

You can set up automated daily tracking using cron jobs or scheduled tasks:

```javascript
// Example: Track daily progress at midnight
const scheduleDailyTracking = () => {
  // Run at 00:01 every day
  cron.schedule('1 0 * * *', async () => {
    const users = await getAllActiveUsers();
    for (const user of users) {
      await dailyTracker.trackDailyProgress(user.id, user.handles);
    }
  });
};
```

## Benefits

1. **Accurate Daily Tracking**: Knows exactly how many problems were solved each day
2. **Historical Analysis**: Complete history for progress analysis and trends
3. **Streak Calculation**: Accurate streak counting based on daily activity
4. **Performance Insights**: Identify productive days and patterns
5. **Goal Tracking**: Track daily/weekly/monthly goals effectively
6. **Non-Disruptive**: Works alongside existing systems without conflicts

## Troubleshooting

### Common Issues

1. **No previous data**: First run will use current totals as baseline
2. **Negative values**: System prevents negative daily counts (handles platform resets)
3. **Missing handles**: Requires at least one platform handle to be configured
4. **Rate limiting**: Uses existing scraping delays and error handling

### Debugging

Enable detailed logging by checking console output:
- `📊 Starting daily tracking for user X`
- `🔍 Current totals scraped: {...}`
- `📅 Previous totals: {...}`
- `✅ Daily solved calculated: {...}`

## Future Enhancements

- **Real-time updates**: WebSocket integration for live progress updates
- **Goal integration**: Automatic goal progress calculation
- **Analytics dashboard**: Visual charts and progress graphs
- **Notifications**: Daily progress notifications and streak alerts
- **Leaderboards**: Compare daily progress with other users
