-- Migration to create simple daily solved questions table
-- This table stores the exact number of questions solved each day
-- Updated whenever coding stats are updated

-- Create the daily solved questions table
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

-- Create trigger for updating timestamps
CREATE OR REPLACE FUNCTION update_daily_solved_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_daily_solved_updated_at_trigger
    BEFORE UPDATE ON daily_solved_questions
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_solved_updated_at();

-- Create function to update daily solved questions
CREATE OR REPLACE FUNCTION update_daily_solved_questions(
    p_user_id INTEGER,
    p_leetcode_total INTEGER,
    p_codechef_total INTEGER,
    p_codeforces_total INTEGER
) RETURNS VOID AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_existing_record RECORD;
BEGIN
    -- Get existing record for today
    SELECT * INTO v_existing_record 
    FROM daily_solved_questions 
    WHERE user_id = p_user_id AND date = v_today;
    
    IF v_existing_record IS NULL THEN
        -- First update of the day - store current totals as both start and current
        INSERT INTO daily_solved_questions (
            user_id, date,
            leetcode_solved_today, codechef_solved_today, codeforces_solved_today, total_solved_today,
            leetcode_start_total, codechef_start_total, codeforces_start_total,
            leetcode_current_total, codechef_current_total, codeforces_current_total
        ) VALUES (
            p_user_id, v_today,
            0, 0, 0, 0,  -- Daily solved starts at 0
            p_leetcode_total, p_codechef_total, p_codeforces_total,  -- Start totals
            p_leetcode_total, p_codechef_total, p_codeforces_total   -- Current totals
        );
    ELSE
        -- Subsequent update - calculate daily solved from start totals
        UPDATE daily_solved_questions SET
            leetcode_current_total = p_leetcode_total,
            codechef_current_total = p_codechef_total,
            codeforces_current_total = p_codeforces_total,
            leetcode_solved_today = GREATEST(0, p_leetcode_total - leetcode_start_total),
            codechef_solved_today = GREATEST(0, p_codechef_total - codechef_start_total),
            codeforces_solved_today = GREATEST(0, p_codeforces_total - codeforces_start_total),
            total_solved_today = GREATEST(0, p_leetcode_total - leetcode_start_total) + 
                               GREATEST(0, p_codechef_total - codechef_start_total) + 
                               GREATEST(0, p_codeforces_total - codeforces_start_total),
            updated_at = NOW()
        WHERE user_id = p_user_id AND date = v_today;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Insert completion message
DO $$
BEGIN
    RAISE NOTICE 'Daily solved questions table created successfully!';
    RAISE NOTICE 'Table: daily_solved_questions';
    RAISE NOTICE 'Function: update_daily_solved_questions()';
    RAISE NOTICE 'Use this function whenever coding stats are updated.';
END $$;
