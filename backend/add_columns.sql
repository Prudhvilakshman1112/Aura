-- Add missing columns to coding_stats table
ALTER TABLE coding_stats 
ADD COLUMN IF NOT EXISTS codeforces_contest_solved INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS codechef_contests_participated INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;

-- Update existing records to have default values
UPDATE coding_stats 
SET codeforces_contest_solved = COALESCE(codeforces_contest_solved, 0), 
    codechef_contests_participated = COALESCE(codechef_contests_participated, 0), 
    current_streak = COALESCE(current_streak, 0);

-- Verify the columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'coding_stats' 
AND column_name IN ('codeforces_contest_solved', 'codechef_contests_participated', 'current_streak');
