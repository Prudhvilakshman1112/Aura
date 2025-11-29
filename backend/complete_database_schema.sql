-- Complete PostgreSQL Database Schema for Aura Synergy Hub
-- This schema includes all tables and columns required by the application code

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================================
-- CORE USER TABLES
-- ============================================================================

-- Users table - Main user authentication and basic info
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    profile_image_url VARCHAR(512),
    learning_streak INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles table - Extended user information
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    linkedin_handle VARCHAR(100),
    leetcode_handle VARCHAR(100),
    codechef_handle VARCHAR(100),
    codeforces_handle VARCHAR(100),
    height_cm DECIMAL(5,2),
    weight_kg DECIMAL(5,2),
    age INTEGER,
    gender VARCHAR(10),
    study_domain VARCHAR(100),
    study_year INTEGER,
    skills TEXT[]
);

-- Coding statistics table - Platform-specific problem solving stats
CREATE TABLE IF NOT EXISTS coding_stats (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    leetcode_solved INTEGER DEFAULT 0,
    codechef_solved INTEGER DEFAULT 0,
    codeforces_solved INTEGER DEFAULT 0,
    codeforces_contest_solved INTEGER DEFAULT 0,
    codechef_contests_participated INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Daily activity table - Legacy daily problem solving tracking
CREATE TABLE IF NOT EXISTS daily_activity (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL,
    problems_solved INTEGER NOT NULL DEFAULT 1,
    UNIQUE(user_id, activity_date)
);

-- User goals table - Monthly and daily targets
CREATE TABLE IF NOT EXISTS user_goals (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    monthly_coding_goal INTEGER DEFAULT 50,
    daily_study_goal_minutes INTEGER DEFAULT 60
);

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

-- ============================================================================
-- ROADMAP SYSTEM TABLES
-- ============================================================================

-- Career paths table - Both templates and user-specific paths
CREATE TABLE IF NOT EXISTS career_paths (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(10) DEFAULT '🛣️',
    difficulty VARCHAR(50) DEFAULT 'Intermediate',
    estimated_duration VARCHAR(100),
    progress INTEGER DEFAULT 0,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    is_template BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Milestones table - Learning modules within career paths
CREATE TABLE IF NOT EXISTS milestones (
    id SERIAL PRIMARY KEY,
    career_path_id INTEGER REFERENCES career_paths(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT FALSE,
    due_date DATE,
    estimated_time VARCHAR(100),
    order_index INTEGER DEFAULT 0,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User career paths table - User's selected roadmaps
CREATE TABLE IF NOT EXISTS user_career_paths (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    roadmap_id INTEGER NOT NULL,
    roadmap_name VARCHAR(255) NOT NULL,
    selected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    progress INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User module progress table - Individual module completion tracking
CREATE TABLE IF NOT EXISTS user_module_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    roadmap_id INTEGER NOT NULL,
    module_name VARCHAR(500) NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, roadmap_id, module_name)
);

-- User daily streaks table - Simple streak tracking for roadmaps
CREATE TABLE IF NOT EXISTS user_daily_streaks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    streak_date DATE NOT NULL,
    modules_completed INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, streak_date)
);

-- Milestone skills table - Skills associated with milestones
CREATE TABLE IF NOT EXISTS milestone_skills (
    id SERIAL PRIMARY KEY,
    milestone_id INTEGER REFERENCES milestones(id) ON DELETE CASCADE,
    skill_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Milestone resources table - Learning resources for milestones
CREATE TABLE IF NOT EXISTS milestone_resources (
    id SERIAL PRIMARY KEY,
    milestone_id INTEGER REFERENCES milestones(id) ON DELETE CASCADE,
    resource_name VARCHAR(255) NOT NULL,
    resource_url VARCHAR(500),
    resource_type VARCHAR(50) DEFAULT 'link',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- COMPREHENSIVE DAILY PROGRESS TRACKING TABLES
-- ============================================================================

-- Daily user progress table - Comprehensive daily activity tracking
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

-- User milestone completions table - Detailed milestone completion tracking
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

-- User daily streaks table - Comprehensive streak tracking
CREATE TABLE IF NOT EXISTS user_daily_streaks_detailed (
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

-- User career progress history table - Career progress over time
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

-- Coding platform history table - Detailed coding statistics history
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

-- ============================================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ============================================================================

-- Core table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_daily_activity_user_date ON daily_activity(user_id, activity_date);
CREATE INDEX IF NOT EXISTS idx_daily_activity_date ON daily_activity(activity_date);

-- Roadmap system indexes
CREATE INDEX IF NOT EXISTS idx_career_paths_user_id ON career_paths(user_id);
CREATE INDEX IF NOT EXISTS idx_career_paths_is_template ON career_paths(is_template);
CREATE INDEX IF NOT EXISTS idx_milestones_career_path_id ON milestones(career_path_id);
CREATE INDEX IF NOT EXISTS idx_milestones_completed ON milestones(completed);
CREATE INDEX IF NOT EXISTS idx_milestone_skills_milestone_id ON milestone_skills(milestone_id);
CREATE INDEX IF NOT EXISTS idx_milestone_resources_milestone_id ON milestone_resources(milestone_id);

-- User career paths indexes
CREATE INDEX IF NOT EXISTS idx_user_career_paths_user_id ON user_career_paths(user_id);
CREATE INDEX IF NOT EXISTS idx_user_career_paths_active ON user_career_paths(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_module_progress_user_roadmap ON user_module_progress(user_id, roadmap_id);
CREATE INDEX IF NOT EXISTS idx_user_module_progress_completed ON user_module_progress(user_id, completed);
CREATE INDEX IF NOT EXISTS idx_user_daily_streaks_user_date ON user_daily_streaks(user_id, streak_date);

-- Daily progress tracking indexes
CREATE INDEX IF NOT EXISTS idx_daily_progress_user_date ON daily_user_progress(user_id, activity_date);
CREATE INDEX IF NOT EXISTS idx_daily_progress_date ON daily_user_progress(activity_date);
CREATE INDEX IF NOT EXISTS idx_daily_progress_career_path ON daily_user_progress(career_path_id);

CREATE INDEX IF NOT EXISTS idx_milestone_completions_user ON user_milestone_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_milestone_completions_date ON user_milestone_completions(completion_date);
CREATE INDEX IF NOT EXISTS idx_milestone_completions_career ON user_milestone_completions(career_path_id);

CREATE INDEX IF NOT EXISTS idx_streaks_detailed_user_date ON user_daily_streaks_detailed(user_id, streak_date);
CREATE INDEX IF NOT EXISTS idx_streaks_detailed_date ON user_daily_streaks_detailed(streak_date);

CREATE INDEX IF NOT EXISTS idx_career_history_user_path ON user_career_progress_history(user_id, career_path_id);
CREATE INDEX IF NOT EXISTS idx_career_history_date ON user_career_progress_history(progress_date);

CREATE INDEX IF NOT EXISTS idx_coding_history_user_date ON coding_platform_history(user_id, record_date);
CREATE INDEX IF NOT EXISTS idx_coding_history_date ON coding_platform_history(record_date);

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- ============================================================================

-- Career paths triggers
CREATE TRIGGER update_career_paths_updated_at 
    BEFORE UPDATE ON career_paths 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_milestones_updated_at 
    BEFORE UPDATE ON milestones 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- User career paths triggers
CREATE TRIGGER update_user_career_paths_updated_at 
    BEFORE UPDATE ON user_career_paths 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_module_progress_updated_at 
    BEFORE UPDATE ON user_module_progress 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Daily progress triggers
CREATE TRIGGER update_daily_progress_updated_at 
    BEFORE UPDATE ON daily_user_progress 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- USEFUL VIEWS FOR APPLICATION QUERIES
-- ============================================================================

-- Daily progress summary view
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
LEFT JOIN user_daily_streaks_detailed ds ON dp.user_id = ds.user_id AND dp.activity_date = ds.streak_date
ORDER BY dp.activity_date DESC, dp.user_id;

-- User progress overview view
CREATE OR REPLACE VIEW user_progress_overview AS
SELECT 
    u.id as user_id,
    u.name,
    u.email,
    cs.leetcode_solved,
    cs.codechef_solved,
    cs.codeforces_solved,
    cs.current_streak,
    ug.monthly_coding_goal,
    ug.daily_study_goal_minutes,
    COUNT(ucp.id) as active_career_paths,
    AVG(ucp.progress) as avg_career_progress
FROM users u
LEFT JOIN coding_stats cs ON u.id = cs.user_id
LEFT JOIN user_goals ug ON u.id = ug.user_id
LEFT JOIN user_career_paths ucp ON u.id = ucp.user_id AND ucp.is_active = true
GROUP BY u.id, u.name, u.email, cs.leetcode_solved, cs.codechef_solved, cs.codeforces_solved, 
         cs.current_streak, ug.monthly_coding_goal, ug.daily_study_goal_minutes;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- Insert a completion log (optional)
DO $$
BEGIN
    RAISE NOTICE 'Aura Synergy Hub database schema created successfully!';
    RAISE NOTICE 'All tables, indexes, triggers, and views have been set up.';
END $$;
