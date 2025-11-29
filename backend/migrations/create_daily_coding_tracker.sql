-- Migration to create daily coding tracker table
-- This table tracks the exact number of questions solved on each specific day
-- by calculating differences between consecutive total counts

-- Create the daily coding tracker table
CREATE TABLE IF NOT EXISTS daily_coding_tracker (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tracking_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Previous day's totals (for calculation reference)
    prev_leetcode_total INTEGER DEFAULT 0,
    prev_codechef_total INTEGER DEFAULT 0,
    prev_codeforces_total INTEGER DEFAULT 0,
    
    -- Current day's totals (fetched from web scraping)
    current_leetcode_total INTEGER DEFAULT 0,
    current_codechef_total INTEGER DEFAULT 0,
    current_codeforces_total INTEGER DEFAULT 0,
    
    -- Daily solved counts (calculated as difference)
    daily_leetcode_solved INTEGER DEFAULT 0,
    daily_codechef_solved INTEGER DEFAULT 0,
    daily_codeforces_solved INTEGER DEFAULT 0,
    
    -- Total daily solved across all platforms
    total_daily_solved INTEGER DEFAULT 0,
    
    -- Timestamps for tracking when data was fetched/calculated
    data_fetched_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one record per user per day
    UNIQUE(user_id, tracking_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_coding_tracker_user_date ON daily_coding_tracker(user_id, tracking_date);
CREATE INDEX IF NOT EXISTS idx_daily_coding_tracker_date ON daily_coding_tracker(tracking_date);
CREATE INDEX IF NOT EXISTS idx_daily_coding_tracker_user_id ON daily_coding_tracker(user_id);

-- Create trigger for updating timestamps
CREATE TRIGGER update_daily_coding_tracker_updated_at 
    BEFORE UPDATE ON daily_coding_tracker 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a view for easy daily progress queries
CREATE OR REPLACE VIEW daily_coding_progress_view AS
SELECT 
    dct.user_id,
    u.name as user_name,
    dct.tracking_date,
    dct.daily_leetcode_solved,
    dct.daily_codechef_solved,
    dct.daily_codeforces_solved,
    dct.total_daily_solved,
    dct.current_leetcode_total,
    dct.current_codechef_total,
    dct.current_codeforces_total,
    dct.data_fetched_at,
    -- Calculate streak information
    CASE 
        WHEN dct.total_daily_solved > 0 THEN 1 
        ELSE 0 
    END as had_activity_today
FROM daily_coding_tracker dct
LEFT JOIN users u ON dct.user_id = u.id
ORDER BY dct.tracking_date DESC, dct.user_id;

-- Insert completion message
DO $$
BEGIN
    RAISE NOTICE 'Daily coding tracker table created successfully!';
    RAISE NOTICE 'Table: daily_coding_tracker';
    RAISE NOTICE 'View: daily_coding_progress_view';
    RAISE NOTICE 'Indexes and triggers have been set up.';
END $$;
