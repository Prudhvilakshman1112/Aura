-- Migration to add DayTracker required tables
-- Run this to fix the blank DayTracker screen issue

-- Monthly goals table - Detailed monthly targets for DayTracker
CREATE TABLE IF NOT EXISTS monthly_goals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2030),
    daily_study_minutes INTEGER DEFAULT 0,
    leetcode_problems INTEGER DEFAULT 0,
    codechef_problems INTEGER DEFAULT 0,
    codeforces_problems INTEGER DEFAULT 0,
    contest_participation INTEGER DEFAULT 0,
    career_milestones INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, month, year)
);

-- Daily activity tracking table - Comprehensive daily progress tracking
CREATE TABLE IF NOT EXISTS daily_activity_tracking (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL,
    study_minutes INTEGER DEFAULT 0,
    leetcode_solved INTEGER DEFAULT 0,
    codechef_solved INTEGER DEFAULT 0,
    codeforces_solved INTEGER DEFAULT 0,
    contests_participated INTEGER DEFAULT 0,
    career_milestones_completed INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, activity_date)
);

-- Monthly progress summary table - Aggregated monthly statistics
CREATE TABLE IF NOT EXISTS monthly_progress_summary (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2030),
    total_study_minutes INTEGER DEFAULT 0,
    total_leetcode_solved INTEGER DEFAULT 0,
    total_codechef_solved INTEGER DEFAULT 0,
    total_codeforces_solved INTEGER DEFAULT 0,
    total_contests_participated INTEGER DEFAULT 0,
    total_career_milestones INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    study_progress_percent DECIMAL(5,2) DEFAULT 0,
    leetcode_progress_percent DECIMAL(5,2) DEFAULT 0,
    codechef_progress_percent DECIMAL(5,2) DEFAULT 0,
    codeforces_progress_percent DECIMAL(5,2) DEFAULT 0,
    contest_progress_percent DECIMAL(5,2) DEFAULT 0,
    career_progress_percent DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, month, year)
);

-- User streak tracking table - Daily streak information
CREATE TABLE IF NOT EXISTS user_streak_tracking (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    streak_date DATE NOT NULL,
    overall_streak INTEGER DEFAULT 0,
    coding_streak INTEGER DEFAULT 0,
    leetcode_streak INTEGER DEFAULT 0,
    codechef_streak INTEGER DEFAULT 0,
    codeforces_streak INTEGER DEFAULT 0,
    career_streak INTEGER DEFAULT 0,
    study_streak INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, streak_date)
);

-- Add triggers for updated_at columns
CREATE TRIGGER update_monthly_goals_updated_at BEFORE UPDATE ON monthly_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_daily_activity_tracking_updated_at BEFORE UPDATE ON daily_activity_tracking FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_monthly_progress_summary_updated_at BEFORE UPDATE ON monthly_progress_summary FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_streak_tracking_updated_at BEFORE UPDATE ON user_streak_tracking FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing (optional)
-- This will create default goals for current month for existing users
INSERT INTO monthly_goals (user_id, month, year, daily_study_minutes, leetcode_problems, codechef_problems, codeforces_problems, contest_participation, career_milestones)
SELECT 
    id as user_id,
    EXTRACT(MONTH FROM CURRENT_DATE) as month,
    EXTRACT(YEAR FROM CURRENT_DATE) as year,
    60 as daily_study_minutes,
    30 as leetcode_problems,
    20 as codechef_problems,
    15 as codeforces_problems,
    2 as contest_participation,
    5 as career_milestones
FROM users
ON CONFLICT (user_id, month, year) DO NOTHING;
