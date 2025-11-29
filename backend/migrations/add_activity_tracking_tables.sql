-- Daily Activity Tracking System
-- This migration adds tables for tracking daily activities and monthly goals

-- Monthly Goals Table - User-defined targets for different activities
CREATE TABLE IF NOT EXISTS monthly_goals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL CHECK (year >= 2020),
    
    -- Goal categories
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

-- Daily Activity Tracking Table - Records daily progress
CREATE TABLE IF NOT EXISTS daily_activity_tracking (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL,
    
    -- Daily achievements
    study_minutes INTEGER DEFAULT 0,
    leetcode_solved INTEGER DEFAULT 0,
    codechef_solved INTEGER DEFAULT 0,
    codeforces_solved INTEGER DEFAULT 0,
    contests_participated INTEGER DEFAULT 0,
    career_milestones_completed INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, activity_date)
);

-- Monthly Progress Summary Table - Aggregated monthly data
CREATE TABLE IF NOT EXISTS monthly_progress_summary (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL CHECK (year >= 2020),
    
    -- Total achievements for the month
    total_study_minutes INTEGER DEFAULT 0,
    total_leetcode_solved INTEGER DEFAULT 0,
    total_codechef_solved INTEGER DEFAULT 0,
    total_codeforces_solved INTEGER DEFAULT 0,
    total_contests_participated INTEGER DEFAULT 0,
    total_career_milestones INTEGER DEFAULT 0,
    
    -- Progress percentages (calculated)
    study_progress_percent DECIMAL(5,2) DEFAULT 0,
    leetcode_progress_percent DECIMAL(5,2) DEFAULT 0,
    codechef_progress_percent DECIMAL(5,2) DEFAULT 0,
    codeforces_progress_percent DECIMAL(5,2) DEFAULT 0,
    contest_progress_percent DECIMAL(5,2) DEFAULT 0,
    career_progress_percent DECIMAL(5,2) DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, month, year)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_monthly_goals_user_date ON monthly_goals(user_id, year, month);
CREATE INDEX IF NOT EXISTS idx_daily_activity_user_date ON daily_activity_tracking(user_id, activity_date);
CREATE INDEX IF NOT EXISTS idx_monthly_summary_user_date ON monthly_progress_summary(user_id, year, month);

-- Function to automatically update monthly summary when daily activity changes
CREATE OR REPLACE FUNCTION update_monthly_summary()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert or update monthly summary
    INSERT INTO monthly_progress_summary (
        user_id, month, year,
        total_study_minutes, total_leetcode_solved, total_codechef_solved,
        total_codeforces_solved, total_contests_participated, total_career_milestones
    )
    SELECT 
        user_id,
        EXTRACT(MONTH FROM activity_date)::INTEGER,
        EXTRACT(YEAR FROM activity_date)::INTEGER,
        SUM(study_minutes),
        SUM(leetcode_solved),
        SUM(codechef_solved),
        SUM(codeforces_solved),
        SUM(contests_participated),
        SUM(career_milestones_completed)
    FROM daily_activity_tracking
    WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
      AND EXTRACT(MONTH FROM activity_date) = EXTRACT(MONTH FROM COALESCE(NEW.activity_date, OLD.activity_date))
      AND EXTRACT(YEAR FROM activity_date) = EXTRACT(YEAR FROM COALESCE(NEW.activity_date, OLD.activity_date))
    GROUP BY user_id, EXTRACT(MONTH FROM activity_date), EXTRACT(YEAR FROM activity_date)
    ON CONFLICT (user_id, month, year)
    DO UPDATE SET
        total_study_minutes = EXCLUDED.total_study_minutes,
        total_leetcode_solved = EXCLUDED.total_leetcode_solved,
        total_codechef_solved = EXCLUDED.total_codechef_solved,
        total_codeforces_solved = EXCLUDED.total_codeforces_solved,
        total_contests_participated = EXCLUDED.total_contests_participated,
        total_career_milestones = EXCLUDED.total_career_milestones,
        updated_at = CURRENT_TIMESTAMP;
    
    -- Update progress percentages
    UPDATE monthly_progress_summary mps
    SET 
        study_progress_percent = CASE 
            WHEN mg.daily_study_minutes > 0 THEN 
                LEAST(100, (mps.total_study_minutes::DECIMAL / (mg.daily_study_minutes * EXTRACT(DAY FROM DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day'))) * 100)
            ELSE 0 
        END,
        leetcode_progress_percent = CASE 
            WHEN mg.leetcode_problems > 0 THEN LEAST(100, (mps.total_leetcode_solved::DECIMAL / mg.leetcode_problems) * 100)
            ELSE 0 
        END,
        codechef_progress_percent = CASE 
            WHEN mg.codechef_problems > 0 THEN LEAST(100, (mps.total_codechef_solved::DECIMAL / mg.codechef_problems) * 100)
            ELSE 0 
        END,
        codeforces_progress_percent = CASE 
            WHEN mg.codeforces_problems > 0 THEN LEAST(100, (mps.total_codeforces_solved::DECIMAL / mg.codeforces_problems) * 100)
            ELSE 0 
        END,
        contest_progress_percent = CASE 
            WHEN mg.contest_participation > 0 THEN LEAST(100, (mps.total_contests_participated::DECIMAL / mg.contest_participation) * 100)
            ELSE 0 
        END,
        career_progress_percent = CASE 
            WHEN mg.career_milestones > 0 THEN LEAST(100, (mps.total_career_milestones::DECIMAL / mg.career_milestones) * 100)
            ELSE 0 
        END,
        updated_at = CURRENT_TIMESTAMP
    FROM monthly_goals mg
    WHERE mps.user_id = mg.user_id 
      AND mps.month = mg.month 
      AND mps.year = mg.year
      AND mps.user_id = COALESCE(NEW.user_id, OLD.user_id)
      AND mps.month = EXTRACT(MONTH FROM COALESCE(NEW.activity_date, OLD.activity_date))
      AND mps.year = EXTRACT(YEAR FROM COALESCE(NEW.activity_date, OLD.activity_date));
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update monthly summary
DROP TRIGGER IF EXISTS trigger_update_monthly_summary_insert ON daily_activity_tracking;
DROP TRIGGER IF EXISTS trigger_update_monthly_summary_update ON daily_activity_tracking;
DROP TRIGGER IF EXISTS trigger_update_monthly_summary_delete ON daily_activity_tracking;

CREATE TRIGGER trigger_update_monthly_summary_insert
    AFTER INSERT ON daily_activity_tracking
    FOR EACH ROW EXECUTE FUNCTION update_monthly_summary();

CREATE TRIGGER trigger_update_monthly_summary_update
    AFTER UPDATE ON daily_activity_tracking
    FOR EACH ROW EXECUTE FUNCTION update_monthly_summary();

CREATE TRIGGER trigger_update_monthly_summary_delete
    AFTER DELETE ON daily_activity_tracking
    FOR EACH ROW EXECUTE FUNCTION update_monthly_summary();
