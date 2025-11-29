-- Add contest participation and streak fields to coding_stats table
ALTER TABLE coding_stats 
ADD COLUMN IF NOT EXISTS codeforces_contest_solved INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS codechef_contests_participated INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;

-- Update existing records to have default values
UPDATE coding_stats 
SET codeforces_contest_solved = 0, 
    codechef_contests_participated = 0, 
    current_streak = 0 
WHERE codeforces_contest_solved IS NULL 
   OR codechef_contests_participated IS NULL 
   OR current_streak IS NULL;
