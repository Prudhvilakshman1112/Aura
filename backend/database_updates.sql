-- Database Updates for Enhanced Activity Tracking
-- This script adds missing tables and updates existing ones for comprehensive tracking

-- Create monthly_goals table for tracking user monthly targets
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, month, year)
);

-- Create daily_activity_tracking table for comprehensive daily tracking
CREATE TABLE IF NOT EXISTS daily_activity_tracking (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Study and Career Progress
    study_minutes INTEGER DEFAULT 0,
    career_milestones_completed INTEGER DEFAULT 0,
    
    -- Coding Platform Progress
    leetcode_solved INTEGER DEFAULT 0,
    codechef_solved INTEGER DEFAULT 0,
    codeforces_solved INTEGER DEFAULT 0,
    
    -- Contest Participation
    contests_participated INTEGER DEFAULT 0,
    leetcode_contests INTEGER DEFAULT 0,
    codechef_contests INTEGER DEFAULT 0,
    codeforces_contests INTEGER DEFAULT 0,
    
    -- Daily Totals
    total_problems_solved INTEGER DEFAULT 0,
    total_contest_problems INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one record per user per day
    UNIQUE(user_id, activity_date)
);

-- Create monthly_progress_summary view that calculates from beginning of current month
CREATE OR REPLACE VIEW monthly_progress_summary AS
WITH current_month_data AS (
    SELECT 
        mg.user_id,
        mg.month_year,
        mg.leetcode_goal,
        mg.codechef_goal,
        mg.codeforces_goal,
        mg.career_milestones_goal,
        mg.study_minutes_goal,
        -- Get baseline stats from the beginning of the month
        COALESCE(baseline.leetcode_baseline, 0) as leetcode_baseline,
        COALESCE(baseline.codechef_baseline, 0) as codechef_baseline,
        COALESCE(baseline.codeforces_baseline, 0) as codeforces_baseline,
        -- Get current stats
        COALESCE(current_stats.leetcode_solved, 0) as current_leetcode,
        COALESCE(current_stats.codechef_solved, 0) as current_codechef,
        COALESCE(current_stats.codeforces_solved, 0) as current_codeforces
    FROM monthly_goals mg
    LEFT JOIN (
        -- Get baseline stats from first day of month or closest available
        SELECT DISTINCT ON (cph.user_id)
            cph.user_id,
            cph.leetcode_solved as leetcode_baseline,
            cph.codechef_solved as codechef_baseline,
            cph.codeforces_solved as codeforces_baseline
        FROM coding_platform_history cph
        WHERE cph.recorded_date <= DATE_TRUNC('month', CURRENT_DATE)
        ORDER BY cph.user_id, cph.recorded_date DESC
    ) baseline ON mg.user_id = baseline.user_id
    LEFT JOIN coding_stats current_stats ON mg.user_id = current_stats.user_id
    WHERE EXTRACT(YEAR FROM mg.month_year::date) = EXTRACT(YEAR FROM CURRENT_DATE)
      AND EXTRACT(MONTH FROM mg.month_year::date) = EXTRACT(MONTH FROM CURRENT_DATE)
)
SELECT 
    user_id,
    month_year,
    leetcode_goal,
    codechef_goal,
    codeforces_goal,
    career_milestones_goal,
    study_minutes_goal,
    -- Calculate monthly progress as difference from baseline
    GREATEST(0, current_leetcode - leetcode_baseline) as leetcode_progress,
    GREATEST(0, current_codechef - codechef_baseline) as codechef_progress,
    GREATEST(0, current_codeforces - codeforces_baseline) as codeforces_progress,
    -- Get career progress from daily tracking for current month
    COALESCE((
        SELECT SUM(career_milestones_completed) 
        FROM daily_activity_tracking 
        WHERE user_id = cmd.user_id 
          AND EXTRACT(YEAR FROM activity_date) = EXTRACT(YEAR FROM CURRENT_DATE)
          AND EXTRACT(MONTH FROM activity_date) = EXTRACT(MONTH FROM CURRENT_DATE)
    ), 0) as career_progress,
    -- Get study progress from daily tracking for current month
    COALESCE((
        SELECT SUM(study_minutes) 
        FROM daily_activity_tracking 
        WHERE user_id = cmd.user_id 
          AND EXTRACT(YEAR FROM activity_date) = EXTRACT(YEAR FROM CURRENT_DATE)
          AND EXTRACT(MONTH FROM activity_date) = EXTRACT(MONTH FROM CURRENT_DATE)
    ), 0) as study_progress,
    -- Calculate percentages based on monthly progress
    CASE WHEN leetcode_goal > 0 THEN ROUND((GREATEST(0, current_leetcode - leetcode_baseline) * 100.0 / leetcode_goal), 2) ELSE 0 END as leetcode_percentage,
    CASE WHEN codechef_goal > 0 THEN ROUND((GREATEST(0, current_codechef - codechef_baseline) * 100.0 / codechef_goal), 2) ELSE 0 END as codechef_percentage,
    CASE WHEN codeforces_goal > 0 THEN ROUND((GREATEST(0, current_codeforces - codeforces_baseline) * 100.0 / codeforces_goal), 2) ELSE 0 END as codeforces_percentage,
    CASE WHEN career_milestones_goal > 0 THEN ROUND((COALESCE((
        SELECT SUM(career_milestones_completed) 
        FROM daily_activity_tracking 
        WHERE user_id = cmd.user_id 
          AND EXTRACT(YEAR FROM activity_date) = EXTRACT(YEAR FROM CURRENT_DATE)
          AND EXTRACT(MONTH FROM activity_date) = EXTRACT(MONTH FROM CURRENT_DATE)
    ), 0) * 100.0 / career_milestones_goal), 2) ELSE 0 END as career_percentage,
    CASE WHEN study_minutes_goal > 0 THEN ROUND((COALESCE((
        SELECT SUM(study_minutes) 
        FROM daily_activity_tracking 
        WHERE user_id = cmd.user_id 
          AND EXTRACT(YEAR FROM activity_date) = EXTRACT(YEAR FROM CURRENT_DATE)
          AND EXTRACT(MONTH FROM activity_date) = EXTRACT(MONTH FROM CURRENT_DATE)
    ), 0) * 100.0 / study_minutes_goal), 2) ELSE 0 END as study_percentage
FROM current_month_data cmd;

-- Create enhanced streak tracking table
CREATE TABLE IF NOT EXISTS user_streak_tracking (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    streak_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Individual Platform Streaks
    leetcode_streak INTEGER DEFAULT 0,
    codechef_streak INTEGER DEFAULT 0,
    codeforces_streak INTEGER DEFAULT 0,
    career_streak INTEGER DEFAULT 0,
    study_streak INTEGER DEFAULT 0,
    
    -- Combined Streaks
    coding_streak INTEGER DEFAULT 0, -- Any coding platform activity
    overall_streak INTEGER DEFAULT 0, -- Any learning activity
    
    -- Daily Activity Flags
    had_leetcode_activity BOOLEAN DEFAULT FALSE,
    had_codechef_activity BOOLEAN DEFAULT FALSE,
    had_codeforces_activity BOOLEAN DEFAULT FALSE,
    had_career_activity BOOLEAN DEFAULT FALSE,
    had_study_activity BOOLEAN DEFAULT FALSE,
    had_any_activity BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- One record per user per day
    UNIQUE(user_id, streak_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_monthly_goals_user_month_year ON monthly_goals(user_id, month, year);
CREATE INDEX IF NOT EXISTS idx_daily_activity_user_date ON daily_activity_tracking(user_id, activity_date);
CREATE INDEX IF NOT EXISTS idx_daily_activity_date ON daily_activity_tracking(activity_date);
CREATE INDEX IF NOT EXISTS idx_streak_tracking_user_date ON user_streak_tracking(user_id, streak_date);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_monthly_goals_updated_at 
    BEFORE UPDATE ON monthly_goals 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_activity_updated_at 
    BEFORE UPDATE ON daily_activity_tracking 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically update daily totals
CREATE OR REPLACE FUNCTION update_daily_totals()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_problems_solved = COALESCE(NEW.leetcode_solved, 0) + 
                                COALESCE(NEW.codechef_solved, 0) + 
                                COALESCE(NEW.codeforces_solved, 0);
    
    NEW.total_contest_problems = COALESCE(NEW.leetcode_contests, 0) + 
                                COALESCE(NEW.codechef_contests, 0) + 
                                COALESCE(NEW.codeforces_contests, 0);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic daily totals calculation
CREATE TRIGGER calculate_daily_totals
    BEFORE INSERT OR UPDATE ON daily_activity_tracking
    FOR EACH ROW EXECUTE FUNCTION update_daily_totals();

-- Function to update streak tracking
CREATE OR REPLACE FUNCTION update_streak_tracking()
RETURNS TRIGGER AS $$
BEGIN
    -- Update streak tracking when daily activity is inserted/updated
    INSERT INTO user_streak_tracking (
        user_id, 
        streak_date,
        had_leetcode_activity,
        had_codechef_activity,
        had_codeforces_activity,
        had_career_activity,
        had_study_activity,
        had_any_activity
    ) VALUES (
        NEW.user_id,
        NEW.activity_date,
        NEW.leetcode_solved > 0,
        NEW.codechef_solved > 0,
        NEW.codeforces_solved > 0,
        NEW.career_milestones_completed > 0,
        NEW.study_minutes > 0,
        (NEW.leetcode_solved > 0 OR NEW.codechef_solved > 0 OR NEW.codeforces_solved > 0 OR 
         NEW.career_milestones_completed > 0 OR NEW.study_minutes > 0)
    )
    ON CONFLICT (user_id, streak_date)
    DO UPDATE SET
        had_leetcode_activity = NEW.leetcode_solved > 0,
        had_codechef_activity = NEW.codechef_solved > 0,
        had_codeforces_activity = NEW.codeforces_solved > 0,
        had_career_activity = NEW.career_milestones_completed > 0,
        had_study_activity = NEW.study_minutes > 0,
        had_any_activity = (NEW.leetcode_solved > 0 OR NEW.codechef_solved > 0 OR NEW.codeforces_solved > 0 OR 
                           NEW.career_milestones_completed > 0 OR NEW.study_minutes > 0);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic streak tracking
CREATE TRIGGER update_streak_on_activity
    AFTER INSERT OR UPDATE ON daily_activity_tracking
    FOR EACH ROW EXECUTE FUNCTION update_streak_tracking();

-- Insert default monthly goals for existing users
INSERT INTO monthly_goals (user_id, month, year, daily_study_minutes, leetcode_problems, codechef_problems, codeforces_problems, contest_participation, career_milestones)
SELECT 
    id as user_id,
    EXTRACT(MONTH FROM CURRENT_DATE) as month,
    EXTRACT(YEAR FROM CURRENT_DATE) as year,
    60 as daily_study_minutes,
    30 as leetcode_problems,
    20 as codechef_problems,
    15 as codeforces_problems,
    3 as contest_participation,
    5 as career_milestones
FROM users
ON CONFLICT (user_id, month, year) DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Enhanced activity tracking database schema created successfully!';
    RAISE NOTICE 'Tables: monthly_goals, daily_activity_tracking, user_streak_tracking';
    RAISE NOTICE 'Views: monthly_progress_summary';
    RAISE NOTICE 'All triggers and functions have been set up.';
END $$;
