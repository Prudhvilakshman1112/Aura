-- Create simple daily solved questions table
CREATE TABLE IF NOT EXISTS daily_solved_questions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Daily solved counts for each platform
    leetcode_solved_today INTEGER DEFAULT 0,
    codechef_solved_today INTEGER DEFAULT 0,
    codeforces_solved_today INTEGER DEFAULT 0,
    
    -- Total daily solved across all platforms
    total_solved_today INTEGER DEFAULT 0,
    
    -- Reference totals from start of day (for calculation)
    leetcode_start_total INTEGER DEFAULT 0,
    codechef_start_total INTEGER DEFAULT 0,
    codeforces_start_total INTEGER DEFAULT 0,
    
    -- Current totals (latest)
    leetcode_current_total INTEGER DEFAULT 0,
    codechef_current_total INTEGER DEFAULT 0,
    codeforces_current_total INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one record per user per day
    UNIQUE(user_id, date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_solved_user_date ON daily_solved_questions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_solved_date ON daily_solved_questions(date);
CREATE INDEX IF NOT EXISTS idx_daily_solved_user_id ON daily_solved_questions(user_id);
