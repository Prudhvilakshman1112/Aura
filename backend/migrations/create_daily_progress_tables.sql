-- Comprehensive Daily Progress Tracking Tables
-- This schema tracks all user daily activities including career milestones and coding platform progress

-- Table to track daily user activities (career + coding combined)
CREATE TABLE IF NOT EXISTS daily_user_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Career Progress Fields
    career_path_id INTEGER REFERENCES career_paths(id) ON DELETE SET NULL,
    milestones_completed INTEGER DEFAULT 0,
    study_time_minutes INTEGER DEFAULT 0,
    
    -- Coding Platform Progress Fields
    leetcode_problems_solved INTEGER DEFAULT 0,
    codechef_problems_solved INTEGER DEFAULT 0,
    codeforces_problems_solved INTEGER DEFAULT 0,
    codeforces_contest_problems INTEGER DEFAULT 0,
    codechef_contest_problems INTEGER DEFAULT 0,
    
    -- Daily Totals
    total_problems_solved INTEGER DEFAULT 0,
    total_contest_problems INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one record per user per day
    UNIQUE(user_id, activity_date)
);

-- Table to track detailed milestone completions with timestamps
CREATE TABLE IF NOT EXISTS user_milestone_completions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    career_path_id INTEGER NOT NULL REFERENCES career_paths(id) ON DELETE CASCADE,
    milestone_id INTEGER NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completion_date DATE DEFAULT CURRENT_DATE,
    
    -- Track which day this milestone was completed
    UNIQUE(user_id, milestone_id)
);

-- Table to track comprehensive daily streaks
CREATE TABLE IF NOT EXISTS user_daily_streaks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    streak_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Individual Platform Streaks
    leetcode_streak INTEGER DEFAULT 0,
    codechef_streak INTEGER DEFAULT 0,
    codeforces_streak INTEGER DEFAULT 0,
    career_milestone_streak INTEGER DEFAULT 0,
    
    -- Combined Streaks
    coding_platforms_streak INTEGER DEFAULT 0, -- Any coding platform activity
    overall_learning_streak INTEGER DEFAULT 0, -- Any learning activity (coding + career)
    
    -- Daily Activity Flags
    had_leetcode_activity BOOLEAN DEFAULT FALSE,
    had_codechef_activity BOOLEAN DEFAULT FALSE,
    had_codeforces_activity BOOLEAN DEFAULT FALSE,
    had_career_activity BOOLEAN DEFAULT FALSE,
    had_any_activity BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- One record per user per day
    UNIQUE(user_id, streak_date)
);

-- Table to track user career path progress over time
CREATE TABLE IF NOT EXISTS user_career_progress_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    career_path_id INTEGER NOT NULL REFERENCES career_paths(id) ON DELETE CASCADE,
    progress_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Progress Metrics
    total_milestones INTEGER NOT NULL DEFAULT 0,
    completed_milestones INTEGER NOT NULL DEFAULT 0,
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    
    -- Time Tracking
    daily_study_minutes INTEGER DEFAULT 0,
    cumulative_study_hours DECIMAL(8,2) DEFAULT 0.00,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Track progress changes over time
    UNIQUE(user_id, career_path_id, progress_date)
);

-- Table to store coding platform statistics history
CREATE TABLE IF NOT EXISTS coding_platform_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    record_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- LeetCode Stats
    leetcode_total_solved INTEGER DEFAULT 0,
    leetcode_easy_solved INTEGER DEFAULT 0,
    leetcode_medium_solved INTEGER DEFAULT 0,
    leetcode_hard_solved INTEGER DEFAULT 0,
    
    -- CodeChef Stats
    codechef_total_solved INTEGER DEFAULT 0,
    codechef_contest_problems INTEGER DEFAULT 0,
    codechef_rating INTEGER DEFAULT 0,
    
    -- Codeforces Stats
    codeforces_total_solved INTEGER DEFAULT 0,
    codeforces_contest_solved INTEGER DEFAULT 0,
    codeforces_rating INTEGER DEFAULT 0,
    
    -- Daily Changes (problems solved today)
    daily_leetcode_solved INTEGER DEFAULT 0,
    daily_codechef_solved INTEGER DEFAULT 0,
    daily_codeforces_solved INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- One record per user per day
    UNIQUE(user_id, record_date)
);

-- Create indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_daily_progress_user_date ON daily_user_progress(user_id, activity_date);
CREATE INDEX IF NOT EXISTS idx_daily_progress_date ON daily_user_progress(activity_date);
CREATE INDEX IF NOT EXISTS idx_daily_progress_career_path ON daily_user_progress(career_path_id);

CREATE INDEX IF NOT EXISTS idx_milestone_completions_user ON user_milestone_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_milestone_completions_date ON user_milestone_completions(completion_date);
CREATE INDEX IF NOT EXISTS idx_milestone_completions_career ON user_milestone_completions(career_path_id);

CREATE INDEX IF NOT EXISTS idx_streaks_user_date ON user_daily_streaks(user_id, streak_date);
CREATE INDEX IF NOT EXISTS idx_streaks_date ON user_daily_streaks(streak_date);

CREATE INDEX IF NOT EXISTS idx_career_history_user_path ON user_career_progress_history(user_id, career_path_id);
CREATE INDEX IF NOT EXISTS idx_career_history_date ON user_career_progress_history(progress_date);

CREATE INDEX IF NOT EXISTS idx_coding_history_user_date ON coding_platform_history(user_id, record_date);
CREATE INDEX IF NOT EXISTS idx_coding_history_date ON coding_platform_history(record_date);

-- Add triggers to update timestamps
CREATE TRIGGER update_daily_progress_updated_at 
    BEFORE UPDATE ON daily_user_progress 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add completed_at column to milestones table if not exists
ALTER TABLE milestones 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP NULL;

-- Create a view for easy daily progress summary
CREATE OR REPLACE VIEW daily_progress_summary AS
SELECT 
    dp.user_id,
    dp.activity_date,
    u.name as user_name,
    cp.name as career_path_name,
    dp.milestones_completed,
    dp.study_time_minutes,
    dp.total_problems_solved,
    dp.total_contest_problems,
    ds.overall_learning_streak,
    ds.coding_platforms_streak,
    ds.career_milestone_streak
FROM daily_user_progress dp
LEFT JOIN users u ON dp.user_id = u.id
LEFT JOIN career_paths cp ON dp.career_path_id = cp.id
LEFT JOIN user_daily_streaks ds ON dp.user_id = ds.user_id AND dp.activity_date = ds.streak_date
ORDER BY dp.activity_date DESC, dp.user_id;
